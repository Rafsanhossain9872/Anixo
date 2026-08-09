import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamically loads/unloads global ad scripts (Popunder)
 * based on the current route.
 * Ads are NOT loaded on the Portal ("/"), Community ("/community"), or Chat ("/chat") pages.
 */
export default function AdLoader() {
  const location = useLocation();

  useEffect(() => {
    const isCommunityPage =
      location.pathname === "/community" ||
      location.pathname.startsWith("/community/");

    const isPortalPage = location.pathname === "/";
    const isChatPage = location.pathname === "/chat";
    const isAdFreePage = isPortalPage || isCommunityPage || isChatPage;


    // Adsterra Popunder (Temporarily Disabled)
    const adsterraScript = document.getElementById("popunder-global");
    if (adsterraScript) adsterraScript.remove();
    /*
    if (isAdFreePage) {
      const popunderScript = document.getElementById("popunder-global");
      if (popunderScript) popunderScript.remove();
    } else if (!document.getElementById("popunder-global")) {
      const popunder = document.createElement("script");
      popunder.id = "popunder-global";

      popunder.src = "https://dependedunmoved.com/4f/1b/2f/4f1b2fdd5cf3e2306bcfee1c78e77468.js";

      document.body.appendChild(popunder);
    }
    */

    // LootLab Popunder
    if (isAdFreePage) {
      const lootlabScript = document.getElementById("lootlab-global");
      if (lootlabScript) lootlabScript.remove();
    } else if (!document.getElementById("lootlab-global")) {
      const lootlab = document.createElement("script");
      lootlab.id = "lootlab-global";
      lootlab.setAttribute("data-cfasync", "false");
      lootlab.src = "//d23uh58cc2jksn.cloudfront.net/?cchud=1524428";
      document.head.appendChild(lootlab);
    }

  }, [location.pathname]);

  return null;
}
