import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateRoutes() {
  console.log("Fetching top anime for SEO prerendering...");
  
  const query = `
    query {
      trending: Page(page: 1, perPage: 15) {
        media(type: ANIME, sort: TRENDING_DESC) { id }
      }
      popular: Page(page: 1, perPage: 15) {
        media(type: ANIME, sort: POPULARITY_DESC) { id }
      }
    }
  `;

  try {
    // Fetch data from AniList
    const response = await fetch("https://graphql.anilist.co", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    // Deduplicate IDs
    const seen = new Set();
    const routes = ['/']; // Always prerender the home page

    if (data?.data) {
      const animeList = [...(data.data.trending?.media || []), ...(data.data.popular?.media || [])];
      
      animeList.forEach(anime => {
        if (!seen.has(anime.id)) {
          seen.add(anime.id);
          // Note: we don't need ?ep=1 because the SPA will automatically default to episode 1 
          // when navigating to /watch/:id without a query param, triggering the SEO data load.
          routes.push(`/watch/${anime.id}`);
        }
      });
    }

    console.log(`Generated ${routes.length} routes for prerendering.`);
    
    // Save to a JSON file that vite.config.js will read
    const outputPath = path.join(__dirname, '../prerender-routes.json');
    fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
    console.log("Routes saved to prerender-routes.json");
    
  } catch (error) {
    console.error("Failed to generate routes:", error);
    // Fallback to minimal routes
    const fallbackRoutes = ['/'];
    fs.writeFileSync(path.join(__dirname, '../prerender-routes.json'), JSON.stringify(fallbackRoutes, null, 2));
  }
}

generateRoutes();
