import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Smart Smooth Scroll: 
    // Temporarily disable CSS smooth scrolling so route changes snap instantly to the top
    const originalStyle = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    
    // Restore smooth scrolling for normal page usage
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = originalStyle;
    });
  }, [pathname, search]);

  return null;
}
