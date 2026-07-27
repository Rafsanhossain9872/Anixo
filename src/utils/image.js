export function optimizeImage(url, width = 300, quality = 80) {
  if (!url) return '';
  
  // AniList CDN already uses Cloudflare and blocks weserv.nl proxy.
  // Returning the original URL to prevent "Missing Cover" errors.
  return url;
}
