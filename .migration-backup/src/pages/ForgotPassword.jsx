import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { updateMetaTags } from "../utils/seo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    updateMetaTags({
      title: "Forgot Password",
      description: "Recover your AniXo account password.",
      url: "/forgot-password",
      noindex: true
    });

    return () => updateMetaTags({ title: "", description: "", url: "", noindex: false });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setMessage("Reset link sent. Please check your inbox or spam folder.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
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
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 text-white/60 hover:text-red-500 transition-all text-[11px] font-bold uppercase tracking-[0.2em] mb-10 group/back"
              >
                <ArrowLeft size={12} className="group-hover/back:-translate-x-1 transition-transform" />
                Back to Profile
              </Link>

              <div className="mb-10">
                <h1 className="text-3xl font-medium tracking-tight mb-3 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                  Forgot Password?
                </h1>
                <p className="text-white/60 text-[13px] leading-relaxed font-medium">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 group">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] group-focus-within:text-red-500/50 transition-colors">
                      Email Address
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-red-600/40 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-black/40 border border-white/[0.03] focus:border-red-600/30 focus:bg-black/60 rounded-2xl py-4 pl-12 pr-4 outline-none text-[14px] transition-all placeholder:text-white/20 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                  input:-webkit-autofill,
                  input:-webkit-autofill:hover, 
                  input:-webkit-autofill:focus {
                    -webkit-text-fill-color: white;
                    -webkit-box-shadow: 0 0 0px 1000px #0d0d0d inset;
                    transition: background-color 5000s ease-in-out 0s;
                  }
                `}} />

                {error && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-500 text-[11px] font-medium py-3.5 px-4 rounded-xl animate-shake">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-500/80 text-[11px] font-bold uppercase tracking-wider py-4 px-4 rounded-2xl animate-in zoom-in-95 text-center">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || message}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold text-[11px] uppercase tracking-[0.2em] py-4.5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-red-600/10"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={14} className="opacity-80" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center mt-8 text-white/50 text-xs">
            Remember your password? <Link to="/profile" className="text-red-500/60 hover:text-red-500 transition-colors">Go back</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
