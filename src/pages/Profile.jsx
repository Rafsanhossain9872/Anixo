import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { updateMe } from "../services/authService";
import { User, Clock, Heart, Bell, Download, Settings, Key, CheckCircle, Pencil, Eye, EyeOff, BarChart2, Shield, Ban, Crown } from "lucide-react";
import AvatarModal from "../components/user/AvatarModal";
import { updateMetaTags } from "../utils/seo";

const getAccountAge = (dateString) => {
  if (!dateString) return null;
  const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
  if (days < 30) {
    const d = Math.max(1, days);
    return `${d} DAY${d === 1 ? '' : 'S'} OLD`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} MONTH${m === 1 ? '' : 'S'} OLD`;
  }
  const y = Math.floor(days / 365);
  return `${y} YEAR${y === 1 ? '' : 'S'} OLD`;
};

export default function Profile() {
  const { t } = useTranslation();
  const { user, triggerAuthToast, updateUser, globalSettings } = useAuth();
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
      title: t('profile.settingsTitle'),
      description: t('profile.settingsDesc'),
      url: "/profile",
      image: user?.avatar || "https://tenzora.top/default-meta.jpg"
    });
  }, [t, user]);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    
    try {
      if (showPasswordFields) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("New passwords do not match!");
        }
        if (formData.password.length > 0 && formData.password.length < 6) {
          throw new Error("New password must be at least 6 characters long.");
        }
      }

      const updateData = {
        email: formData.email,
        displayName: formData.displayName,
      };

      if (showPasswordFields && formData.password) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.password;
      }

      const response = await updateMe(updateData);
      
      if (response && response.user) {
        updateUser(response.user);
        triggerAuthToast(t('profile.updateSuccess'), "success");
        setShowPasswordFields(false);
        setFormData({ ...formData, currentPassword: "", password: "", confirmPassword: "" });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || t('profile.updateFailed'));
      triggerAuthToast(err.response?.data?.message || err.message || t('profile.updateFailed'), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSave = (newAvatarUrl) => {
    updateUser({ ...user, avatar: newAvatarUrl });
    setShowAvatarModal(false);
    triggerAuthToast(t('profile.avatarUpdated'), "success");
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Watch Later", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "stats", label: "Stats", icon: BarChart2, path: "/stats" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin", icon: Shield, path: "/admin" }] : []),
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  if (!user) return null;

  return (
    <>
      <Navbar />
      
      <div className="min-h-screen bg-background text-text pt-24 pb-20 font-senpai">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-[1200px] flex flex-col gap-8 md:gap-12">
          
          {/* Compact Navigation Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-10 w-full max-w-4xl mx-auto px-1 sm:px-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.id === "profile" && location.pathname === "/profile");
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-center gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2 rounded-xl transition-all duration-300 border shrink-0 ${
                    isActive 
                    ? "bg-discord-600 text-white border-discord-600" 
                    : "bg-white/[0.02] border-white/15 text-white/30 hover:text-white hover:bg-white/[0.05]"
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

          {/* BAN BANNER */}
          {user?.banUntil && new Date(user.banUntil) > new Date() && (
            <div className="w-full max-w-[700px] mx-auto mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
              <div className="mt-0.5"><Ban size={18} /></div>
              <div>
                <h4 className="font-bold text-sm">Account Restricted</h4>
                <p className="text-xs text-red-400/80 mt-1">
                  You are currently banned from commenting until {new Date(user.banUntil).toLocaleString()} 
                  {user.bannedByRole ? ` by ${user.bannedByRole}.` : '.'}
                </p>
              </div>
            </div>
          )}

          {/* Profile Content - Matches Settings Layout */}
          <div className="max-w-[700px] w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[#111] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 md:p-10 space-y-8 md:space-y-12">
                
                {/* Avatar Section - Centered */}
                <div className="flex flex-col items-center gap-4 pb-8 md:pb-10 border-b border-white/15">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-white/10 bg-[#181818] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-300">
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
                      style={{ backgroundColor: globalSettings?.themeColor || '#5865F2' }}
                      className="absolute -bottom-1 -right-1 p-2 rounded-full border-2 border-[#111] text-white hover:scale-110 transition-all shadow-xl"
                      title={t('profile.changeAvatar')}
                    >
                      <Pencil size={12} strokeWidth={3} />
                    </button>
                    {/* Crown for Admin/Mod */}
                    {(user.role === 'admin' || user.role === 'moderator') && (
                      <div className={`absolute -top-1 -left-1 p-1 rounded-full shadow-lg ${
                        user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-500'
                      } border-2 border-[#111] text-white`}>
                        {user.role === 'admin' ? (
                          <Crown size={14} fill="currentColor" />
                        ) : (
                          <Shield size={14} fill="currentColor" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <h2 className="text-lg md:text-xl font-medium tracking-tight text-white">
                      {user.profileId || user.username}
                    </h2>
                    <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{t('profile.verifiedUser')}</span>
                    {user.createdAt && (
                      <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1">
                        {getAccountAge(user.createdAt)} &bull; SINCE {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSave} className="flex-1 flex flex-col gap-6 w-full">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Profile ID (Disabled) */}
                    <div className="flex flex-col gap-2 group">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest ml-1">PROFILE ID</label>
                      <input
                        type="text"
                        value={user?.profileId || user?.username || ""}
                        disabled
                        className="bg-white/[0.02] text-white/50 px-4 py-3 rounded-xl border border-white/10 outline-none text-[13px] w-full cursor-not-allowed"
                      />
                      <p className="text-white/30 text-[10px] ml-1 mt-0.5">This is your unique Profile ID used in your public URL.</p>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-2 group">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('profile.emailAddress')}</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (error) setError(null); }}
                        className="bg-white/5 text-white px-4 py-3 rounded-xl border border-white/15 focus:border-white/40 focus:bg-white/10 outline-none text-[13px] w-full transition-all"
                      />
                    </div>

                    {/* Display Name */}
                    <div className="flex flex-col gap-2 group">
                      <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('profile.displayName')}</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => { setFormData({ ...formData, displayName: e.target.value }); if (error) setError(null); }}
                        className="bg-white/5 text-white px-4 py-3 rounded-xl border border-white/15 focus:border-white/40 focus:bg-white/10 outline-none text-[13px] w-full transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="pt-2 border-t border-white/15 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      style={{ color: showPasswordFields ? (globalSettings?.themeColor || '#5865F2') : '' }}
                      className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest mt-4 ml-1 transition-colors ${showPasswordFields ? '' : 'text-white/40 hover:text-white'}`}
                    >
                      <Key size={14} />
                      <span>{showPasswordFields ? t('profile.discardPassword') : t('profile.changePassword')}</span>
                    </button>

                    {showPasswordFields && (
                      <div className="mt-6 flex flex-col gap-5 animate-in fade-in slide-in-from-top-1 duration-300">
                        {/* Current Password */}
                        <div className="relative group">
                          <input
                            type={showPasswords ? "text" : "password"}
                            placeholder={t('profile.currentPasswordPlaceholder')}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className={`bg-white/5 text-white px-4 py-3 rounded-xl border outline-none text-[13px] w-full transition-all ${error && error.toLowerCase().includes("current password") ? "border-red-500 animate-shake" : "border-white/15 focus:border-white/40"}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                          >
                            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div className="flex justify-start px-1 -mt-3">
                          <Link 
                            to="/forgot-password"
                            style={{ color: globalSettings?.themeColor || '#5865F2' }}
                            className="hover:opacity-80 text-[10px] font-bold uppercase transition-opacity"
                          >
                            {t('profile.forgotPassword')}
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* New Password */}
                          <div className="relative group">
                            <input
                              type={showPasswords ? "text" : "password"}
                              placeholder={t('profile.newPasswordPlaceholder')}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="bg-white/5 text-white px-4 py-3 rounded-xl border border-white/15 focus:border-white/40 outline-none text-[13px] w-full"
                            />
                          </div>

                          {/* Confirm Password */}
                          <div className="relative group">
                            <input
                              type={showPasswords ? "text" : "password"}
                              placeholder={t('profile.confirmPasswordPlaceholder')}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              className={`bg-white/5 text-white px-4 py-3 rounded-xl border outline-none text-[13px] w-full transition-all ${error && error.toLowerCase().includes("match") ? "border-red-500 animate-shake" : "border-white/15 focus:border-white/40"}`}
                            />
                          </div>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.password && (
                          <div className="px-1 flex flex-col gap-1.5 mt-2">
                            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
                              <span className="text-white/40">{t('profile.strength')}</span>
                              <span className={
                                formData.password.length < 6 ? "text-red-500" :
                                formData.password.length < 10 ? "text-yellow-500" : "text-emerald-500"
                              }>
                                {formData.password.length < 6 ? t('profile.weak') :
                                 formData.password.length < 10 ? t('profile.medium') : t('profile.strong')}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
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

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ backgroundColor: globalSettings?.themeColor || '#5865F2' }}
                    className="mt-6 w-full disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
                  >
                    {isSaving ? t('profile.saving') : t('profile.saveChanges')}
                  </button>
                </form>
              </div>
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
