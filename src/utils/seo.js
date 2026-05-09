export const updateMetaTags = ({
  title,
  description,
  image,
  url,
  keywords,
  type = "website",
  noindex = false,
}) => {
  // Update Title
  if (title) {
    const fullTitle = `${title} - AniXo`;
    document.title = fullTitle;
    document.querySelector('meta[name="title"]')?.setAttribute("content", fullTitle);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", fullTitle);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute("content", fullTitle);
  }

  // Update Description
  if (description) {
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="twitter:description"]')?.setAttribute("content", description);
  }

  // Update Keywords
  if (keywords) {
    let keywordsTag = document.querySelector('meta[name="keywords"]');
    if (!keywordsTag) {
      keywordsTag = document.createElement('meta');
      keywordsTag.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsTag);
    }
    keywordsTag.setAttribute("content", keywords);
  }

  // Update OG Type
  document.querySelector('meta[property="og:type"]')?.setAttribute("content", type);

  // Update Image
  if (image) {
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", image);
    document.querySelector('meta[property="twitter:image"]')?.setAttribute("content", image);
  }

  // Update URL
  if (url) {
    const siteUrl = import.meta.env.VITE_SITE_URL || "https://anixo.online";
    const fullUrl = url.startsWith('http') ? url : `${siteUrl}${url}`;
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", fullUrl);
    document.querySelector('meta[property="twitter:url"]')?.setAttribute("content", fullUrl);
    
    // Update Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullUrl);
  }

  // Handle NoIndex for Private Pages
  let robotsTag = document.querySelector('meta[name="robots"]');
  if (!robotsTag) {
    robotsTag = document.createElement('meta');
    robotsTag.setAttribute('name', 'robots');
    document.head.appendChild(robotsTag);
  }
  
  if (noindex) {
    robotsTag.setAttribute("content", "noindex, nofollow");
  } else {
    robotsTag.setAttribute("content", "index, follow");
  }
};

export const updateStructuredData = (schemaData) => {
  // Find existing schema tag
  let script = document.querySelector('script[data-dynamic-schema]');
  
  if (!script) {
    // If not found, create a new one (don't touch the base schema from index.html)
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-dynamic-schema', 'true');
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(schemaData);
};

export const clearStructuredData = () => {
  const script = document.querySelector('script[data-dynamic-schema]');
  if (script) {
    script.remove();
  }
};
