export function optimizeImage(url, width = 300, quality = 80) {
  if (!url) return '';
  
  // Return early if already optimized or using wsrv
  if (url.includes('wsrv.nl')) return url;

  // We are removing https:// or http:// 
  const cleanUrl = url.replace(/^https?:\/\//, '');
  
  // Format the wsrv.nl proxy URL
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=webp`;
}
