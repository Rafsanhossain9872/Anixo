import { createContext, useContext, useState, useEffect } from "react";

const UserListContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useUserList() {
  return useContext(UserListContext);
}

export function UserListProvider({ children }) {
  const [list, setList] = useState(() => {
    const saved = localStorage.getItem("anime_user_list");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("anime_user_list", JSON.stringify(list));
  }, [list]);

  // ADD OR UPDATE
  const addToList = (item) => {
    setList((prev) => {
      const existsIndex = prev.findIndex((i) => i.animeId === item.animeId);
      if (existsIndex >= 0) {
        // Update existing
        const newList = [...prev];
        newList[existsIndex] = { ...newList[existsIndex], ...item };
        return newList;
      }
      // Add new
      return [
        ...prev,
        {
          ...item,
          progress: item.progress || 0,
          status: item.status || "Watching",
          score: item.score || 0,
        },
      ];
    });
  };

  // UPDATE STATUS
  const updateStatus = (animeId, status) => {
    setList((prev) =>
      prev.map((item) => (item.animeId === animeId ? { ...item, status } : item))
    );
  };

  // INCREMENT PROGRESS
  const incrementProgress = (animeId) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.animeId !== animeId) return item;
        
        let newProgress = item.progress + 1;
        let newStatus = item.status;
        
        // Prevent exceeding total (if total is known, sometimes it is null for airing anime)
        if (item.totalEpisodes && newProgress >= item.totalEpisodes) {
          newProgress = item.totalEpisodes;
          newStatus = "Completed";
        }
        
        return { ...item, progress: newProgress, status: newStatus };
      })
    );
  };
  
  // REMOVE FROM LIST
  const removeFromList = (animeId) => {
    setList((prev) => prev.filter((item) => item.animeId !== animeId));
  };

  return (
    <UserListContext.Provider
      value={{
        list,
        addToList,
        updateStatus,
        incrementProgress,
        removeFromList,
      }}
    >
      {children}
    </UserListContext.Provider>
  );
}
