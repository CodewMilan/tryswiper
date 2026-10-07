const SUPPORTED_HOSTS = ["linkedin.com", "x.com", "twitter.com", "threads.net", "instagram.com"];

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) return decodeEntities(match.trim());
  }
  return null;
}

export async function referenceContext(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("Reference post must be a valid public URL."), { status: 400, code: "INVALID_REFERENCE_URL" });
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.protocol !== "https:" || !SUPPORTED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw Object.assign(new Error("Reference URLs currently support public LinkedIn, X, Threads, and Instagram posts."), { status: 400, code: "UNSUPPORTED_REFERENCE_URL" });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SwiperReferenceBot/1.0" },
      signal: AbortSignal.timeout(6000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const html = (await response.text()).slice(0, 300_000);
    const title = meta(html, "og:title") ?? meta(html, "twitter:title");
    const description = meta(html, "og:description") ?? meta(html, "twitter:description") ?? meta(html, "description");
    if (!title && !description) throw new Error("no public metadata");
    return [
      `Reference post URL: ${url.toString()}`,
      title ? `Reference title: ${title.slice(0, 500)}` : null,
      description ? `Reference summary: ${description.slice(0, 2000)}` : null,
      "Adapt only the structural pattern, pacing, hook style, hierarchy, and CTA placement. Write original copy and do not copy protected text or imagery.",
    ].filter(Boolean).join("\n");
  } catch {
    throw Object.assign(new Error("Swiper could not read that public post. Describe its structure in the brief and try again."), {
      status: 422,
      code: "REFERENCE_UNAVAILABLE",
    });
  }
}
