export function optimizeImage(url) {
  if (!url) return '';
  
  // AniList CDN already uses Cloudflare and blocks weserv.nl proxy.
  // Returning the original URL directly.
  return url;
}
