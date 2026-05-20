import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { backendApi, ANILIST_URL } from "../services/api";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, FileText, Upload, CheckCircle2, AlertTriangle, Loader2, BarChart2 } from "lucide-react";

// Radio button component (declared outside to avoid re-creation on render)
const Radio = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onChange}>
    <div className="relative flex items-center justify-center">
      <div className={`w-[16px] h-[16px] rounded-full border ${checked ? 'border-red-600' : 'border-white/20'} transition-all`} />
      {checked && <div className="absolute w-[8px] h-[8px] rounded-full bg-red-600" />}
    </div>
    <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-white/50'}`}>{label}</span>
  </label>
);

// ─── AniList GraphQL Query ───
const ANILIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      status
      entries {
        mediaId
        status
        progress
        score(format: POINT_10)
        media {
          title {
            romaji
            english
          }
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

const ANILIST_STATUS_MAP = {
  CURRENT: "Watching",
  PLANNING: "Planning",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "On-Hold",
  REPEATING: "Watching"
};

// ─── MAL XML Parser ───
function parseMALXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const animeNodes = doc.querySelectorAll("anime");
  const items = [];

  animeNodes.forEach((node) => {
    const getField = (name) => node.querySelector(name)?.textContent || "";
    const malStatus = getField("my_status");

    const statusMap = {
      "Watching": "Watching",
      "Completed": "Completed",
      "On-Hold": "On-Hold",
      "Dropped": "Dropped",
      "Plan to Watch": "Planning",
      "1": "Watching",
      "2": "Completed",
      "3": "On-Hold",
      "4": "Dropped",
      "6": "Planning"
    };

    items.push({
      animeId: getField("series_animedb_id"),
      title: getField("series_title"),
      status: statusMap[malStatus] || "Planning",
      progress: parseInt(getField("my_watched_episodes")) || 0,
      score: parseInt(getField("my_score")) || 0,
      coverImage: ""
    });
  });

  return items;
}

// ─── JSON File Parser ───
function parseJsonFile(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (Array.isArray(data)) {
      return data.map(item => ({
        animeId: String(item.animeId || item.id || ""),
        title: item.title || "",
        coverImage: item.coverImage || "",
        status: item.status || "Planning",
        progress: item.progress || 0,
        score: item.score || 0
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export default function ImportExport() {
  const { user, globalWatchlist, setGlobalWatchlist } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("import");

  // Import state
  const [importFrom, setImportFrom] = useState("MAL");
  const [username, setUsername] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState("Merge");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importProgress, setImportProgress] = useState("");

  // Export state
  const [exportFormat, setExportFormat] = useState("TEXT");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // ─── Fetch from AniList API ───
  const fetchAniListData = async (anilistUsername) => {
    setImportProgress("Fetching anime list from AniList...");
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { username: anilistUsername }
      })
    });

    const json = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "AniList API error. Make sure your list is public.");
    }

    const lists = json.data?.MediaListCollection?.lists || [];
    const items = [];

    for (const list of lists) {
      for (const entry of list.entries) {
        items.push({
          animeId: String(entry.mediaId),
          title: entry.media?.title?.english || entry.media?.title?.romaji || `Anime ${entry.mediaId}`,
          coverImage: entry.media?.coverImage?.large || "",
          status: ANILIST_STATUS_MAP[entry.status] || "Planning",
          progress: entry.progress || 0,
          score: entry.score || 0
        });
      }
    }

    return items;
  };

  // ─── Read file content ───
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // ─── Main Import Handler ───
  const handleImport = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    setImportResult(null);
    setImportProgress("");

    try {
      let items = [];

      if (importFrom === "AL") {
        // AniList - fetch via username
        if (!username.trim()) throw new Error("Please enter your AniList username.");
        items = await fetchAniListData(username.trim());
      } else if (importFrom === "MAL") {
        // MAL - parse XML file
        if (!importFile) throw new Error("Please select your MAL XML export file.");
        setImportProgress("Parsing MAL XML file...");
        const content = await readFileContent(importFile);
        items = parseMALXml(content);
      } else if (importFrom === "File") {
        // File - parse JSON
        if (!importFile) throw new Error("Please select a JSON file to import.");
        setImportProgress("Parsing import file...");
        const content = await readFileContent(importFile);
        items = parseJsonFile(content);
      }

      if (items.length === 0) {
        throw new Error("No anime entries found. Check your username or file format.");
      }

      setImportProgress(`Found ${items.length} entries. Saving to watchlist (${importMode} mode)...`);

      // Send to backend
      const response = await backendApi.post("/watchlist/import", {
        items,
        mode: importMode
      });

      if (response.data.success) {
        setGlobalWatchlist(response.data.watchlist);
        const { added, updated, total } = response.data.stats;
        setImportResult({
          success: true,
          message: `✅ Import successful! ${added} added, ${updated} updated. Total: ${total} entries.`
        });
      } else {
        throw new Error(response.data.message || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        message: `❌ ${error.message || "Import failed. Please try again."}`
      });
    } finally {
      setIsImporting(false);
      setImportProgress("");
    }
  };

  // ─── Export Helpers ───
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMALXml = (list) => {
    let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<myanimelist>\n';
    xml += '  <myinfo>\n';
    xml += `    <user_export_type>1</user_export_type>\n`;
    xml += '  </myinfo>\n';
    list.forEach((item) => {
      const statusMap = { "Watching": "Watching", "Completed": "Completed", "On-Hold": "On-Hold", "Dropped": "Dropped", "Planning": "Plan to Watch" };
      xml += '  <anime>\n';
      xml += `    <series_animedb_id>${item.animeId || 0}</series_animedb_id>\n`;
      xml += `    <series_title><![CDATA[${item.title || item.animeId}]]></series_title>\n`;
      xml += `    <my_watched_episodes>${item.progress || 0}</my_watched_episodes>\n`;
      xml += `    <my_score>${item.score || 0}</my_score>\n`;
      xml += `    <my_status>${statusMap[item.status] || "Plan to Watch"}</my_status>\n`;
      xml += '  </anime>\n';
    });
    xml += '</myanimelist>';
    return xml;
  };

  const handleExport = () => {
    setIsExporting(true);
    const list = globalWatchlist || [];

    if (exportFormat === "JSON") {
      downloadFile(JSON.stringify(list, null, 2), "anixo-watchlist.json", "application/json");
    } else if (exportFormat === "TEXT") {
      const statusGroups = {};
      list.forEach(item => {
        const s = item.status || "Other";
        if (!statusGroups[s]) statusGroups[s] = [];
        statusGroups[s].push(item);
      });
      let text = `AniXo Watchlist Export (${new Date().toLocaleDateString()})\n${"=".repeat(50)}\n\n`;
      Object.entries(statusGroups).forEach(([status, items]) => {
        text += `── ${status} (${items.length}) ──\n`;
        items.forEach((item, i) => {
          text += `  ${i + 1}. ${item.title || item.animeId}${item.score ? ` ★${item.score}` : ""}${item.progress ? ` [${item.progress} eps]` : ""}\n`;
        });
        text += "\n";
      });
      downloadFile(text, "anixo-watchlist.txt", "text/plain");
    } else if (exportFormat === "MAL XML") {
      downloadFile(generateMALXml(list), "anixo-watchlist.xml", "application/xml");
    }
    setIsExporting(false);
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex-1">
        
        {/* Compact Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "import" && location.pathname === "/import");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${
                  isActive 
                  ? "bg-red-600 text-white border-red-600" 
                  : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" />
                <span className="hidden md:block text-[12px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Import/Export Card */}
        <div className="max-w-[700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">

            {/* Import / Export Tabs - Mobile Optimized */}
            <div className="flex p-1.5 bg-white/5 m-4 md:m-6 mb-0 rounded-2xl border border-white/5">
              <button
                onClick={() => { setActiveTab("import"); setImportResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all rounded-xl ${
                  activeTab === "import" ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
                }`}
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={() => { setActiveTab("export"); setImportResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all rounded-xl ${
                  activeTab === "export" ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
                }`}
              >
                <Download size={14} />
                Export
              </button>
            </div>

            {/* ═══ IMPORT TAB ═══ */}
            {activeTab === "import" && (
              <form onSubmit={handleImport} className="p-5 md:p-10 space-y-8 md:space-y-10">
                {/* Notice - Compact */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="space-y-0.5 text-[10px] font-medium text-white/20 uppercase tracking-widest text-center md:text-left">
                    <p>• Your lists must be public</p>
                    <p>• Only matching titles will sync</p>
                    <p>• May take up to a minute</p>
                  </div>
                </div>

                {/* Source Platform */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-left">
                    <h3 className="text-[14px] font-bold text-white">Source Platform</h3>
                    <p className="text-[11px] text-white/30">Import source preference.</p>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                    {['MAL', 'File'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setImportFrom(p)}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-bold transition-all ${importFrom === p ? 'bg-red-600 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                      >
                        {p === 'MAL' ? 'MyAnimeList' : 'JSON/File'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Username Input */}
                {importFrom === "AL" && (
                  <div className="space-y-3">
                    <h3 className="text-[14px] font-bold text-white">Username</h3>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="AniList Username"
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-3.5 text-[13px] text-white placeholder-white/10 outline-none focus:border-red-600/30 transition-all"
                    />
                  </div>
                )}

                {/* File Upload */}
                {importFrom !== "AL" && (
                  <div className="space-y-3">
                    <h3 className="text-[14px] font-bold text-white">Select File</h3>
                    <label className="flex items-center cursor-pointer group">
                      <div className="flex-1 bg-white/5 border border-white/5 rounded-xl px-5 py-3.5 flex items-center justify-between group-hover:bg-white/[0.08] transition-all">
                        <span className={`text-[13px] ${importFile ? 'text-white' : 'text-white/20'}`}>
                          {importFile ? importFile.name : "Choose file..."}
                        </span>
                        <Upload size={14} className="text-white/20" />
                      </div>
                      <input
                        type="file"
                        accept={importFrom === "MAL" ? ".xml" : ".json,.txt"}
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Mode Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-white">Import Mode</h3>
                    <p className="text-[11px] text-white/30">How to handle existing items.</p>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    {['Merge', 'Replace'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setImportMode(m)}
                        className={`px-5 py-2 rounded-lg text-[10px] font-bold transition-all ${importMode === m ? 'bg-red-600 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                      >
                        {m === 'Merge' ? 'Merge' : 'Replace All'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress & Result */}
                {importProgress && (
                  <div className="p-4 bg-red-600/5 border border-red-600/10 rounded-xl text-[11px] font-bold text-red-500 animate-pulse text-center">
                    {importProgress}
                  </div>
                )}

                {importResult && (
                  <div className={`p-4 rounded-xl text-[12px] font-bold text-center ${
                    importResult.success ? 'bg-green-500/5 text-green-500 border border-green-500/10' : 'bg-red-500/5 text-red-500 border border-red-500/10'
                  }`}>
                    {importResult.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 text-[12px] uppercase tracking-widest transition-all rounded-xl active:scale-[0.98]"
                >
                  {isImporting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Start Import"}
                </button>
              </form>
            )}

            {/* ═══ EXPORT TAB ═══ */}
            {activeTab === "export" && (
              <div className="p-6 md:p-10 space-y-10">
                <div className="text-center space-y-2">
                  <h3 className="text-[16px] font-bold text-white">Backup Collection</h3>
                  <p className="text-[11px] text-white/30 leading-relaxed max-w-[300px] mx-auto">
                    Download your entire watchlist as a file to keep it safe or move to other services.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-[14px] font-bold text-white">Format</h3>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    {['TEXT', 'JSON', 'MAL XML'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setExportFormat(f)}
                        className={`px-5 py-2 rounded-lg text-[10px] font-bold transition-all ${exportFormat === f ? 'bg-red-600 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 text-[12px] uppercase tracking-widest transition-all rounded-xl active:scale-[0.98]"
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Download Backup"}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
