import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { persistEventWithImage } from "../src/lib/event-save.server.ts";
import type { Database } from "../src/integrations/supabase/types.ts";

test("server save uses caller permissions, checks persisted references and deletes via Storage API", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env["SUPABASE_URL"];
  const originalKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const project = "https://event-image-tests.invalid";
  const oldUrl = `${project}/storage/v1/object/public/event-images/old.png`;
  const id = "00000000-0000-4000-8000-000000000001";
  const updated = "2026-09-22T00:00:00Z";
  let savedUrl: string | null = oldUrl;
  let shared = false;
  let denied = false;
  let hideRow = false;
  const calls: { method: string; path: string; token: string | null }[] = [];
  const deleted: string[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  process.env["SUPABASE_URL"] = project;
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key";
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, project, "No real network request is allowed");
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    calls.push({ method, path: url.pathname, token: headers.get("authorization") });
    if (url.pathname.startsWith("/storage/v1/object/event-images/") && method === "POST") {
      assert.equal(headers.get("authorization"), "Bearer user-token");
      return json({ Key: url.pathname.slice("/storage/v1/object/".length) });
    }
    if (url.pathname === "/storage/v1/object/event-images" && method === "DELETE") {
      assert.equal(headers.get("authorization"), "Bearer test-service-key");
      const body = JSON.parse(String(init?.body));
      deleted.push(...body.prefixes);
      return json(body.prefixes.map((name: string) => ({ name })));
    }
    assert.equal(url.pathname, "/rest/v1/events");
    if (method === "GET" && url.searchParams.has("id")) {
      assert.equal(headers.get("authorization"), "Bearer user-token");
      if (hideRow) return json({ message: "Not accessible", code: "PGRST116" }, 406);
      return json({ image_url: oldUrl, updated_at: updated });
    }
    if (method === "GET") {
      assert.equal(headers.get("authorization"), "Bearer test-service-key");
      return json([
        { id, image_url: savedUrl },
        ...(shared ? [{ id: "shared", image_url: `${oldUrl}?v=2` }] : []),
      ]);
    }
    assert.equal(headers.get("authorization"), "Bearer user-token");
    if (method === "PATCH") assert.equal(url.searchParams.get("updated_at"), `eq.${updated}`);
    if (denied) return json({ message: "RLS denied", code: "42501" }, 403);
    savedUrl = JSON.parse(String(init?.body)).image_url;
    return json({ id });
  };
  try {
    const client = createClient<Database>(project, "test-public-key", {
      global: { headers: { Authorization: "Bearer user-token" } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const values = {
      titre: "Test",
      slug: "test",
      description: "Test",
      date_debut: "2026-09-22",
      ville: "Douala",
      pays: "Cameroun",
      image_url: oldUrl,
    };
    const file = new File([new Uint8Array([1, 2, 3])], "new.png", { type: "image/png" });
    const result = await persistEventWithImage(client, id, values, file);
    assert.deepEqual(result, { id, warning: null });
    assert.deepEqual(deleted, ["old.png"]);
    assert.notEqual(savedUrl, oldUrl);
    assert.deepEqual(
      calls.map((call) => call.method),
      ["GET", "POST", "PATCH", "GET", "DELETE"],
    );

    calls.length = 0;
    deleted.length = 0;
    savedUrl = oldUrl;
    shared = true;
    await persistEventWithImage(client, id, values, file);
    assert.deepEqual(deleted, [], "An image referenced by another event must stay");

    calls.length = 0;
    deleted.length = 0;
    savedUrl = oldUrl;
    shared = false;
    denied = true;
    await assert.rejects(
      persistEventWithImage(client, id, values, file),
      /Enregistrement impossible/,
    );
    assert.equal(savedUrl, oldUrl);
    assert.equal(deleted.length, 1);
    assert.notEqual(deleted[0], "old.png", "Only the new upload can be rolled back");

    calls.length = 0;
    deleted.length = 0;
    denied = false;
    hideRow = true;
    await assert.rejects(persistEventWithImage(client, id, values, file));
    assert.deepEqual(
      calls.map((call) => call.method),
      ["GET"],
      "An inaccessible event must not upload or delete files",
    );

    calls.length = 0;
    deleted.length = 0;
    hideRow = false;
    assert.equal((await persistEventWithImage(client, null, values, file)).id, id);
    assert.deepEqual(
      calls.map((call) => call.method),
      ["POST", "POST"],
    );
    assert.deepEqual(deleted, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env["SUPABASE_URL"];
    else process.env["SUPABASE_URL"] = originalUrl;
    if (originalKey === undefined) delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    else process.env["SUPABASE_SERVICE_ROLE_KEY"] = originalKey;
  }
});
