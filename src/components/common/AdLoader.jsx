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


    // adst popunder
    if (isAdFreePage) {
      const popunderScript = document.getElementById("popunder-global");
      if (popunderScript) popunderScript.remove();
    } else if (!document.getElementById("popunder-global")) {
      const popunder = document.createElement("script");
      popunder.id = "popunder-global";

      popunder.src = "https://dependedunmoved.com/4f/1b/2f/4f1b2fdd5cf3e2306bcfee1c78e77468.js";

      document.body.appendChild(popunder);
    }

    // Monetag Multitag
    if (isAdFreePage) {
      const monetagScript = document.getElementById("monetag-global");
      if (monetagScript) monetagScript.remove();
    } else if (!document.getElementById("monetag-global")) {
      const monetag = document.createElement("script");
      monetag.id = "monetag-global";
      monetag.src = "https://quge5.com/88/tag.min.js";
      monetag.setAttribute("data-zone", "266669");
      monetag.async = true;
      monetag.setAttribute("data-cfasync", "false");
      document.head.appendChild(monetag);
    }

    // Social Bar
    if (isAdFreePage) {
      const socialBarScript = document.getElementById("socialbar-global");
      if (socialBarScript) socialBarScript.remove();
    } else if (!document.getElementById("socialbar-global")) {
      const socialBar = document.createElement("script");
      socialBar.id = "socialbar-global";
      socialBar.type = "text/javascript";
      socialBar.src = "https://dependedunmoved.com/c0/3d/cf/c03dcff912dd20c262d81652c44afe27.js";
      document.body.appendChild(socialBar);
    }
  }, [location.pathname]);

  return null;
}
