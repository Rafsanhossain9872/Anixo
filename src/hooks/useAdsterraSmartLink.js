export const ADSTERRA_SMART_LINK = "https://www.effectivecpmnetwork.com/xha7i7sypg?key=367010d83bbe4ffa2ebf0677eea2ba01";

// Global state to prevent multiple listeners stacking up
let isFallbackListenerAttached = false;

// Hook to open smart link programmatically (e.g., on episode change)
export function useAdsterraSmartLink() {
  const openSmartLink = () => {
    // 1. Cooldown Check: Only allow one popup every 15 minutes to avoid annoying users
    const COOLDOWN_MINUTES = 15;
    const lastOpened = localStorage.getItem('adsterra_last_opened');
    if (lastOpened) {
      const timeSinceLastOpen = Date.now() - parseInt(lastOpened, 10);
      if (timeSinceLastOpen < COOLDOWN_MINUTES * 60 * 1000) {
        return; // Still in cooldown, don't show ad
      }
    }

    const triggerAd = () => {
      localStorage.setItem('adsterra_last_opened', Date.now().toString());
      window.open(ADSTERRA_SMART_LINK, "_blank", "noopener,noreferrer");
    };

    // Try opening directly (works if called within a synchronous click handler)
    const newWin = window.open(ADSTERRA_SMART_LINK, "_blank", "noopener,noreferrer");
    
    // If blocked by browser's popup blocker (e.g. called from useEffect without user gesture)
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      if (isFallbackListenerAttached) return; // Prevent stacking multiple listeners
      
      isFallbackListenerAttached = true;

      // Smart Fallback: wait for the user's very next click on the page to open it
      const fallbackOpener = () => {
        triggerAd();
        isFallbackListenerAttached = false;
        document.removeEventListener('click', fallbackOpener, { capture: true });
      };
      
      // Use capture: true and once: true so it triggers exactly once on their next interaction
      document.addEventListener('click', fallbackOpener, { capture: true, once: true });
    } else {
      // Successfully opened directly
      localStorage.setItem('adsterra_last_opened', Date.now().toString());
    }
  };

  return { openSmartLink };
}
