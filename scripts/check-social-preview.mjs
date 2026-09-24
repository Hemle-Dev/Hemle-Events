// Read-only check: use against your public domain after deployment.
const input = process.argv[2];
if (!input || !/^https?:\/\//.test(input))
  throw new Error(
    "Usage: node scripts/check-social-preview.mjs https://hemlemag.com[/evenements/slug]",
  );
const decode = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
for (const agent of [
  "WhatsApp/2.24.0",
  "facebookexternalhit/1.1",
  "Twitterbot/1.0",
  "LinkedInBot/1.0",
]) {
  const response = await fetch(input, {
    headers: { "User-Agent": agent },
    signal: AbortSignal.timeout(20000),
  });
  const html = await response.text();
  const head = html.split("</head>")[0];
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)];
  const value = (key) => {
    const matches = metas.filter(([tag]) => tag.includes(`="${key}"`));
    if (matches.length !== 1)
      throw new Error(`${agent}: ${key} absent ou dupliqué (${matches.length})`);
    return decode(matches[0][0].match(/content="([^"]*)"/)?.[1] || "");
  };
  if (!response.ok) throw new Error(`${agent}: page HTTP ${response.status}`);
  const imageUrl = value("og:image");
  value("og:title");
  value("og:description");
  value("og:url");
  value("twitter:card");
  if (imageUrl !== value("twitter:image")) throw new Error("Images OG et Twitter différentes");
  const image = await fetch(imageUrl, {
    headers: { "User-Agent": agent },
    signal: AbortSignal.timeout(20000),
  });
  const bytes = Buffer.from(await image.arrayBuffer());
  const signature =
    bytes.subarray(0, 3).toString("hex") === "ffd8ff"
      ? "image/jpeg"
      : bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
        ? "image/png"
        : null;
  const mime = image.headers.get("content-type")?.split(";")[0];
  if (!image.ok || bytes.length < 100)
    throw new Error(`${agent}: image inaccessible (${image.status})`);
  if (signature && signature !== mime)
    throw new Error(`${agent}: signature ${signature} mais Content-Type ${mime}`);
  console.log(
    `${agent}: page ${response.status}, image ${image.status}, ${mime}, ${bytes.length} octets; ${imageUrl}`,
  );
}
console.log(
  "Contrôles HTTP réussis. Cela ne vérifie ni le cache des plateformes ni un filtrage selon leurs adresses IP.",
);
