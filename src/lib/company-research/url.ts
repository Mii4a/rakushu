export function normalizeCompanyWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  url.hash = "";
  url.search = "";
  if (!url.pathname || url.pathname === "") url.pathname = "/";
  return url.toString();
}
