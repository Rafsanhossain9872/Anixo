import { useState } from "react";
import { login, register, loginWithGoogle } from "../../services/authService";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Check, X, Eye, EyeOff } from "lucide-react";

export default function LoginModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { loginAuth } = useAuth();
  const navigate = useNavigate();



  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await login(email, password);
        if (res.token) {
          loginAuth(res.user, res.token);
          onClose();
        } else {
          setError(res.message || "Login failed");
        }
      } else {
        const res = await register(username, email, password);
        if (res.token) {
          loginAuth(res.user, res.token);
          onClose();
        } else {
          setError(res.message || "Registration failed");
        }
      }
    } catch (err) {

      
      if (err.code === 'ERR_NETWORK') {
        setError("Network Error: Cannot connect to the Cloudflare Edge API.");
      } else {
        setError(err.response?.data?.message || err.message || "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      if (res.token) {
        loginAuth(res.user, res.token);
        onClose();
      } else {
        setError(res.message || "Google Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "missing_client_id"}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-[#1a1a1a] w-[380px] shadow-2xl animate-in zoom-in-95 duration-200 relative font-sans">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-3 text-white/40 hover:text-white transition-colors bg-[#111111]"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-[17px] font-bold text-white mb-1">
              {isLogin ? "SIGN IN" : "SIGN UP"}
            </h2>
            <p className="text-white/40 text-[12px]">
              {isLogin ? "Welcome back!" : "Create an account to explore more features."}
            </p>
          </div>

          {error && (
            <div className="bg-discord-500/10 border border-discord-500/50 text-discord-500 p-2 mb-3 text-[12px] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" autoComplete="off">
            {/* Username Input (Only for Signup) */}
            {!isLogin && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="new-username"
                className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
                required
              />
            )}

            {/* Email Input */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="new-email"
              className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors"
              required
            />

            {/* Password Input */}
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Repeat Password (Only for Signup) */}
            {!isLogin && (
              <div className="relative group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full bg-[#111111] px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/30 outline-none focus:bg-[#151515] transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}



            {/* Forgot Password */}
            {isLogin && (
              <div className="text-center mt-0.5 mb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/forgot-password");
                  }}
                  className="text-[13px] text-white/80 hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E50914] hover:bg-[#f40612] text-white font-bold text-[13px] py-2.5 mt-1 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "PLEASE WAIT..." : isLogin ? "SIGN IN" : "SIGN UP"}
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-[11px] font-bold">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login was unsuccessful")}
                theme="filled_black"
                shape="rectangular"
                width="100%"
                text={isLogin ? "signin_with" : "signup_with"}
              />
            </div>
          </form>

          {/* Footer toggle */}
          <div className="mt-4 text-center text-white/40 text-[13px]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setEmail("");
                setPassword("");
                setUsername("");
                setConfirmPassword("");
              }}
              className="text-white hover:underline transition-colors font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </GoogleOAuthProvider>
  );
}
