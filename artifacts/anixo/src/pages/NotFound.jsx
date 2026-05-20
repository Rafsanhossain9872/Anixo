import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center space-y-6">
          
          {/* Anime GIF */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-56 h-56 md:w-72 md:h-72 relative group select-none pointer-events-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* The GIF */}
              <div className="w-full h-full overflow-hidden rounded-2xl border border-white/5">
                <img 
                  src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzQ5aWRscm5iZWF0NDZrOHo1aDJrbGt3dHBobzlnOWpnN3p3azYwMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/K6yQhY3Y0VpnrYrada/giphy.gif" 
                  alt="404 Anime"
                  className="w-full h-full object-cover opacity-80"
                  draggable="false"
                />
              </div>
              {/* Water Fade / Glow Overlay */}
              <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_20px_rgba(5,5,5,1)]" />
              <div className="absolute -inset-4 bg-red-600/5 blur-3xl rounded-full opacity-50 -z-10 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Compact 404 */}
          <div className="space-y-1">
            <h1 className="text-7xl md:text-9xl font-black leading-none tracking-tighter text-white/90 select-none">
              404
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-red-600/30" />
              <h2 className="text-red-600 font-mono text-[10px] tracking-[0.4em] uppercase font-bold">Page Not Found</h2>
              <div className="h-[1px] w-8 bg-red-600/30" />
            </div>
          </div>

          <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
            The page you are looking for does not exist. 
          </p>
          
          {/* Simple Clean Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              to="/home" 
              className="w-full sm:w-auto px-10 py-3.5 bg-red-600 text-white text-[12px] font-bold uppercase tracking-[0.2em] rounded hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-600/10"
            >
              Back to Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-10 py-3.5 bg-white/5 border border-white/10 text-white/60 text-[12px] font-bold uppercase tracking-[0.2em] rounded hover:bg-white/10 hover:text-white transition-all active:scale-95"
            >
              Previous Page
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}