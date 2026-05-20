import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { updateMe } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings, Key, CheckCircle, Pencil, Eye, EyeOff, BarChart2 } from "lucide-react";
import AvatarModal from "../components/user/AvatarModal";
import { updateMetaTags } from "../utils/seo";

export default function Profile() {
  const { user, triggerAuthToast, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    displayName: user?.displayName || user?.username || "",
    currentPassword: "",
    password: "",
    confirmPassword: ""
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    updateMetaTags({
      title: "Profile Settings",
      description: "Manage your AniXo profile settings and account preferences.",
      url: "/profile",
      noindex: true
    });

    return () => {
      updateMetaTags({ title: "", description: "", url: "", noindex: false });
    };
  }, []);

  // Error is cleared inline via onChange handlers below (avoids cascading render warning)

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (showPasswordFields) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match!");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    try {
      setIsSaving(true);
      const updatePayload = {
        username: formData.username,
        email: formData.email,
        displayName: formData.displayName,
      };

      if (showPasswordFields && formData.password) {
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.password = formData.password;
      }

      const res = await updateMe(updatePayload);
      if (res.success) {
        updateUser(res.user);
        setFormData(prev => ({ ...prev, currentPassword: "", password: "", confirmPassword: "" }));
        setShowPasswordFields(false);
        triggerAuthToast("Profile updated successfully");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSave = async (newAvatarUrl) => {
    try {
      setIsSaving(true);
      const res = await updateMe({ avatar: newAvatarUrl });
      if (res.success) {
        triggerAuthToast("Avatar updated successfully");
        window.location.reload(); 
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update avatar");
    } finally {
      setIsSaving(false);
      setShowAvatarModal(false);
    }
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  if (!user) return null;

  return (
    <>
      <div key={user?.id || 'profile'} className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
        <Navbar />

        <div className="w-full pt-[80px] px-4 md:px-8 pb-12 max-w-[1200px] mx-auto flex flex-col items-center">

          {/* Compact Navigation Tabs - No Glow */}
          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-8 w-full max-w-4xl px-1 sm:px-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.id === "profile" && location.pathname === "/profile");
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${isActive
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:bg-white/[0.05]"
                    }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 w-[18px] h-[18px] md:w-4 md:h-4" />
                  <span className="hidden md:block text-[12px] font-medium tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Profile Content - Compact Card */}
          <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">

              {/* Avatar Section - No Glow */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-[#181818] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-300">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-medium text-white/80">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Pencil Edit Icon */}
                  <button 
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute -bottom-1 -right-1 bg-red-600 p-2 rounded-full border-2 border-[#111] text-white hover:bg-red-700 hover:scale-110 transition-all shadow-xl shadow-red-600/20"
                    title="Change Avatar"
                  >
                    <Pencil size={12} strokeWidth={3} />
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <h2 className="text-lg font-medium tracking-tight">{user.username}</h2>
                  <span className="text-[9px] text-white/40 uppercase tracking-[0.2em]">Verified User</span>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleSave} className="flex-1 flex flex-col gap-5 w-full">

                <div className="grid grid-cols-1 gap-5">
                  {/* Username */}
                  <div className="flex flex-col gap-1.5 group">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-widest ml-1 group-focus-within:text-red-500/50">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => { setFormData({ ...formData, username: e.target.value }); if (error) setError(null); }}
                      className={`bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border outline-none text-[13px] w-full transition-all ${error && error.toLowerCase().includes("username") ? "border-red-500 animate-shake" : "border-white/5 focus:border-red-600/30 focus:bg-white/[0.04]"}`}
                    />
                    {error && error.toLowerCase().includes("username") && (
                      <p className="text-red-500 text-[10px] font-medium mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                        {error}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5 group">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-widest ml-1 group-focus-within:text-red-500/50">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (error) setError(null); }}
                      className="bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border border-white/5 focus:border-red-600/30 focus:bg-white/[0.04] outline-none text-[13px] w-full transition-all"
                    />
                  </div>

                  {/* Display Name */}
                  <div className="flex flex-col gap-1.5 group">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-widest ml-1 group-focus-within:text-red-500/50">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => { setFormData({ ...formData, displayName: e.target.value }); if (error) setError(null); }}
                      className="bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border border-white/5 focus:border-red-600/30 focus:bg-white/[0.04] outline-none text-[13px] w-full transition-all"
                    />
                  </div>
                </div>

                {/* Password Section */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="flex items-center gap-2 text-[11px] font-medium text-white/50 hover:text-white/60 transition-colors ml-1"
                  >
                    <Key size={12} className={showPasswordFields ? "text-red-500" : ""} />
                    <span>{showPasswordFields ? "Discard Password" : "Change Password"}</span>
                  </button>

                  {showPasswordFields && (
                    <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                      {/* Current Password */}
                      <div className="relative group">
                        <input
                          type={showPasswords ? "text" : "password"}
                          placeholder="Current password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className={`bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border outline-none text-[13px] w-full transition-all ${error && error.toLowerCase().includes("current password") ? "border-red-500 animate-shake" : "border-white/5 focus:border-red-600/30"}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                        >
                          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="flex justify-start px-1 -mt-2">
                        <Link 
                          to="/forgot-password"
                          className="text-red-500 hover:text-red-400 text-[10px] font-medium transition-colors"
                        >
                          Forgot Password?
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* New Password */}
                        <div className="relative group">
                          <input
                            type={showPasswords ? "text" : "password"}
                            placeholder="New password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border border-white/5 focus:border-red-600/30 outline-none text-[13px] w-full"
                          />
                        </div>

                        {/* Confirm Password */}
                        <div className="relative group">
                          <input
                            type={showPasswords ? "text" : "password"}
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`bg-white/[0.02] text-white px-4 py-2.5 rounded-xl border outline-none text-[13px] w-full transition-all ${error && error.toLowerCase().includes("match") ? "border-red-500 animate-shake" : "border-white/5 focus:border-red-600/30"}`}
                          />
                        </div>
                      </div>

                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <div className="px-1 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-medium">
                            <span className="text-white/40">Strength</span>
                            <span className={
                              formData.password.length < 6 ? "text-red-500" :
                              formData.password.length < 10 ? "text-yellow-500" : "text-emerald-500"
                            }>
                              {formData.password.length < 6 ? "Weak" :
                               formData.password.length < 10 ? "Medium" : "Strong"}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                formData.password.length < 6 ? "bg-red-500 w-1/3" :
                                formData.password.length < 10 ? "bg-yellow-500 w-2/3" : "bg-emerald-500 w-full"
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save Button - No Shadow */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-[11px] uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all active:scale-[0.98]"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>


      <AvatarModal 
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentAvatar={user?.avatar}
      />
    </>
  );
}
