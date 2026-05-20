import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

const AVATAR_DATA = {
  "Bleach": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aiden",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ichi1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ichi2"
  ],
  "BleachChibi": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Chibi1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Chibi2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Chibi3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Chibi4"
  ],
  "Boruto": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Boruto1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Boruto2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Boruto3"
  ],
  "ChainsawMan": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Caleb",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Callie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Makima",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Denji"
  ],
  "DemonSlayer": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanjiro",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Nezuko",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zenitsu",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Inosuke"
  ],
  "Doraemon": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Dora1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Nobita",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sizuka"
  ],
  "DragonBall": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Goku",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Vegeta",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Gohan"
  ],
  "Eyes": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Eye1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Eye2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Eye3"
  ],
  "FairyTail": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Natsu",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Erza"
  ],
  "Inuyasha": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Inu1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Kagome"
  ],
  "JujutsuKaisen": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Gojo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Itadori",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Megumi"
  ],
  "Naruto": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Naruto1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasuke",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Kakashi"
  ],
  "OnePiece": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luffy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoro",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Nami"
  ],
  "OnePunchMan": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Saitama",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Genos"
  ],
  "Pokemon": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Pika",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ash"
  ],
  "SailorMoon": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Moon1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mars"
  ],
  "TokyoGhoul": [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Kaneki",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Touka"
  ]
};

export default function AvatarModal({ isOpen, onClose, onSave, currentAvatar }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(AVATAR_DATA)[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = Object.keys(AVATAR_DATA);
  const filteredAvatars = AVATAR_DATA[activeCategory];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6">
      {/* Balanced Backdrop */}
      <div
        className="absolute inset-0 bg-black/1 backdrop-blur-sm transition-opacity duration-500 ease-out"
        onClick={onClose}
      />

      {/* Premium Modal Content */}
      <div className="relative w-[92%] md:w-full max-w-[500px] h-[80vh] md:h-[90vh] max-h-[850px] bg-[#1d1f24] border border-white/5 rounded-[24px] flex flex-col overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-7 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Avatar Collection
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-8">

          {/* Categories Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 border ${activeCategory === cat
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-white/1 border-white/10 text-white hover:bg-white/30'
                    }`}
                >
                  #{cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
              {filteredAvatars.map((url, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedAvatar(url)}
                  className="relative cursor-pointer group"
                >
                  <div className={`aspect-square rounded-full overflow-hidden border-2 transition-all duration-500 ${selectedAvatar === url
                    ? 'border-red-600 ring-4 ring-red-600/20 scale-105'
                    : 'border-white/5 group-hover:border-white/20 group-hover:scale-105'
                    }`}>
                    <img
                      src={url}
                      alt={`Avatar ${index}`}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${activeCategory}&background=random`;
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-red-600 rounded-full p-0.5 shadow-lg">
                          <Check className="text-white" size={12} strokeWidth={5} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-8 py-7 bg-white/[0.01] border-t border-white/5">
          <button
            onClick={() => onSave(selectedAvatar)}
            disabled={!selectedAvatar}
            className="mx-auto block px-10 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_8px_24px_rgba(220,38,38,0.2)] active:scale-[0.98]"
          >
            Save Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(220, 38, 38, 0.4);
        }
      `}</style>
    </div>,
    document.body
  );
}
