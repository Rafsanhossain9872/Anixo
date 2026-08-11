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
    // All global popunders have been removed for a clean user experience.
  }, [location.pathname]);

  return null;
}
