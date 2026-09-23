import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.TEST_SSR_PORT || "3109";
const origin = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  ["--import", "./tests/mock-public-api.mjs", ".output/server/index.mjs"],
  { env: { ...process.env, PORT: port, HOST: "127.0.0.1" }, stdio: "pipe" },
);
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));

function meta(html, key) {
  const matches = [...html.matchAll(/<meta\b[^>]*>/g)].filter((tag) =>
    tag[0].includes(`="${key}"`),
  );
  assert.equal(matches.length, 1, `Exactly one ${key} in SSR HTML`);
  return matches[0][0].match(/\bcontent="([^"]*)"/)?.[1];
}

try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`SSR server exited: ${output}`);
    if (output.includes("Listening")) break;
    await delay(100);
  }
  assert.match(output, /Listening/);
  for (const path of [
    "/",
    "/evenements",
    "/categories",
    "/a-propos",
    "/evenements/festival-test-ssr",
    "/evenements/festival-sans-image",
  ]) {
    const response = await fetch(`${origin}${path}`, {
      headers: { "User-Agent": "facebookexternalhit/1.1" },
    });
    assert.equal(response.status, 200, `${path}: ${output}`);
    const html = (await response.text()).split("</head>")[0];
    assert.equal(meta(html, "twitter:card"), "summary_large_image");
    assert.equal(meta(html, "og:image"), meta(html, "twitter:image"));
    assert.equal(meta(html, "og:title"), meta(html, "twitter:title"));
    assert.equal(meta(html, "og:description"), meta(html, "twitter:description"));
    assert.equal(new URL(meta(html, "og:url")).pathname, path);
    assert.match(meta(html, "og:image"), /^https?:\/\//);
    if (path === "/evenements/festival-test-ssr") {
      assert.equal(meta(html, "og:image"), "https://images.example.test/festival.png");
      assert.match(meta(html, "og:title"), /Festival test SSR/);
      assert.equal(meta(html, "og:description"), "Bienvenue au festival annuel.");
      assert.match(html, /2030-12-25T18:00:00/);
    } else assert.match(meta(html, "og:image"), /\/social-card.png$/);
    console.log(`PASS SSR social preview ${path}`);
  }
  const image = await fetch(`${origin}/social-card.png`);
  assert.equal(image.status, 200);
  const bytes = Buffer.from(await image.arrayBuffer());
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  console.log("PASS public social image 1200 × 630");
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}
