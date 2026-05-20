import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../services/authService";
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { updateMetaTags } from "../utils/seo";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    updateMetaTags({
      title: "Reset Password",
      description: "Reset your AniXo account password.",
      url: `/reset-password/${token}`,
      noindex: true
    });

    return () => updateMetaTags({ title: "", description: "", url: "", noindex: false });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate("/profile"), 3000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid or expired token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-red-500/30">
      <Navbar />

      <div className="flex-1 flex items-start lg:items-center justify-center p-6 pt-24 lg:pt-32">
        <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-700">
          <div className="relative bg-[#0d0d0d] border border-white/[0.03] rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group">
            
            {/* Premium Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/[0.08] blur-[80px] rounded-full pointer-events-none group-hover:bg-red-600/[0.12] transition-colors duration-700" />
            
            {/* Subtle Anime Watermark */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] grayscale mix-blend-overlay">
              <img 
                src="/anime_girl_forgot_password_1777710938169.png" 
                alt="" 
                className="w-full h-full object-cover scale-110"
              />
            </div>

            <div className="relative z-10">
              {success ? (
                <div className="text-center py-6 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                    <CheckCircle size={40} className="text-emerald-500" />
                  </div>
                  <h1 className="text-3xl font-medium tracking-tight mb-3">Success!</h1>
                  <p className="text-white/40 text-sm leading-relaxed mb-8">
                    Your password has been reset successfully. Redirecting you to your profile...
                  </p>
                  <Link 
                    to="/profile" 
                    className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors"
                  >
                    Go to Profile <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h1 className="text-3xl font-medium tracking-tight mb-2">New Password</h1>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Please enter your new credentials below.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 group">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500/50 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/[0.03] border border-white/5 focus:border-red-600/30 focus:bg-white/[0.05] rounded-2xl py-4 pl-12 pr-12 outline-none text-[15px] transition-all placeholder:text-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 group">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-500 transition-colors">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500/50 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/[0.03] border border-white/5 focus:border-red-600/30 focus:bg-white/[0.05] rounded-2xl py-4 pl-12 pr-4 outline-none text-[15px] transition-all placeholder:text-white/10"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-[13px] py-4 px-5 rounded-2xl animate-shake text-center">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-[13px] py-4.5 rounded-2xl transition-all active:scale-[0.98] mt-2 shadow-[0_10px_20px_rgba(229,9,20,0.2)] uppercase tracking-wider"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                      ) : (
                        "Update Password"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
