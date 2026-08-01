export function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export function getWatchUrl(id, titleObj) {
  if (!id) return "/";
  if (!titleObj) return `/watch/${id}`;
  
  const titleStr = typeof titleObj === 'string' 
    ? titleObj 
    : (titleObj.english || titleObj.romaji || titleObj.native || "anime");
    
  const slug = slugify(titleStr);
  if (!slug) return `/watch/${id}`;
  
  return `/watch/${id}/${slug}`;
}
