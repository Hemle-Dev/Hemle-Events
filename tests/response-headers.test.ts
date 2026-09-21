import assert from "node:assert/strict";
import test from "node:test";
import { withResponseHeaders } from "../src/lib/response-headers.ts";

test("fetch responses with immutable headers retain their body and receive security headers", async () => {
  const original = await fetch("data:text/html,%3Ch1%3EConnexion%3C%2Fh1%3E");
  assert.throws(() => original.headers.set("X-Test", "value"), /immutable/);
  const response = withResponseHeaders(original, "/auth");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(original.headers.get("X-Robots-Tag"), null);
  assert.equal(await response.text(), "<h1>Connexion</h1>");
});

test("immutable redirects keep their destination and status", () => {
  const response = withResponseHeaders(
    Response.redirect("https://example.test/auth", 303),
    "/admin",
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "https://example.test/auth");
  assert.equal(response.body, null);
});

test("streaming response is neither buffered nor truncated and cookies are preserved", async () => {
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });
  const headers = new Headers({ "Content-Type": "image/png", "Content-Length": "5" });
  headers.append("Set-Cookie", "first=one; Path=/; HttpOnly");
  headers.append("Set-Cookie", "second=two; Path=/; HttpOnly");
  const original = new Response(stream, { headers });
  const response = withResponseHeaders(original, "/image.png");
  assert.equal(response.body, stream);
  assert.equal(response.bodyUsed, false);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  streamController.enqueue(new Uint8Array([1, 2]));
  streamController.enqueue(new Uint8Array([3, 4, 5]));
  streamController.close();
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3, 4, 5]));
});

test("not-modified responses keep a null body; errors are not indexed", () => {
  const cached = withResponseHeaders(
    new Response(null, { status: 304, headers: { ETag: '"logo"' } }),
    "/logo.png",
  );
  assert.equal(cached.status, 304);
  assert.equal(cached.body, null);
  assert.equal(cached.headers.get("ETag"), '"logo"');
  const missing = withResponseHeaders(new Response("Not found", { status: 404 }), "/unknown");
  assert.equal(missing.headers.get("X-Robots-Tag"), "noindex, nofollow");
});
