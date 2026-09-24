export function socialMeta(options: {
  siteUrl: string;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: string;
  imageDetails?: boolean;
}) {
  const { siteUrl, title, description, path } = options;
  const fallback = new URL("/social-card.jpg", siteUrl).href;
  let image = fallback;
  try {
    const candidate = new URL(options.image || fallback, siteUrl);
    if (["https:", "http:"].includes(candidate.protocol)) image = candidate.href;
  } catch {
    /* Fall back to the public site card. */
  }
  const alt = options.imageAlt || "HEMLÉ Events — L’agenda de l’Afrique et de ses diasporas";
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: options.type || "website" },
    { property: "og:url", content: new URL(path, siteUrl).href },
    { property: "og:site_name", content: "HEMLÉ Events" },
    { property: "og:locale", content: "fr_FR" },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: alt },
    ...(options.imageDetails !== false
      ? [
          ...(image.startsWith("https:")
            ? [{ property: "og:image:secure_url", content: image }]
            : []),
          ...(image === fallback
            ? [
                { property: "og:image:type", content: "image/jpeg" },
                { property: "og:image:width", content: "1280" },
                { property: "og:image:height", content: "672" },
              ]
            : []),
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
  ];
}
