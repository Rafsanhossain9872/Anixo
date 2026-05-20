import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { globalSettings } = useAuth();

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("anime_language") || "EN";
  });

  // Track the last version of globalSettings we synced with
  const [prevSettings, setPrevSettings] = useState(null);

  // If settings changed (e.g. user logged in), adjust state DURING render.
  // React will immediately re-render with the new state before painting.
  if (globalSettings && globalSettings !== prevSettings) {
    setPrevSettings(globalSettings);
    if (globalSettings.titleLanguage) {
      setLanguage(globalSettings.titleLanguage);
    }
  }

  // Persist to localStorage whenever effective language changes
  useEffect(() => {
    localStorage.setItem("anime_language", language);
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === "EN" ? "JP" : "EN"));
  }, []);

  const setEN = useCallback(() => setLanguage("EN"), []);
  const setJP = useCallback(() => setLanguage("JP"), []);

  const getTitle = useCallback((titleObj) => {
    if (!titleObj) return "Unknown Title";
    if (language === "EN") {
      return titleObj.english || titleObj.romaji || titleObj.native || "Unknown Title";
    } else {
      // JP toggle now prioritizes Romaji (Japenglish) instead of Pure Japanese characters
      return titleObj.romaji || titleObj.english || titleObj.native || "Unknown Title";
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setEN, setJP, getTitle }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
