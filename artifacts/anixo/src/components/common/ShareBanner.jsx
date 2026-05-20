import React from 'react';
import { Share2, Send, MessageCircle } from 'lucide-react';

const ShareBanner = () => {
  const siteUrl = window.location.origin || import.meta.env.VITE_SITE_URL || 'https://anixo.online';
  const rawMessage = 'Hey! I found this amazing site to watch anime for free in high quality. No ads, fast streaming, and it\'s totally free. Check out AniXo here:';
  const shareText = encodeURIComponent(rawMessage);

  const shareLinks = [
    { 
      name: 'Facebook', 
      icon: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>, 
      color: 'bg-[#3b5998]', 
      count: '63k',
      url: `https://www.facebook.com/sharer/sharer.php?u=${siteUrl}&quote=${shareText}`
    },
    { 
      name: 'Twitter', 
      icon: <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>, 
      color: 'bg-[#000000]', 
      count: '54.1k',
      url: `https://twitter.com/intent/tweet?text=${shareText}%20${siteUrl}`
    },
    { 
      name: 'Messenger', 
      icon: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.304 2.256.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.291 14.393l-3.072-3.275-5.99 3.275 6.587-6.996 3.133 3.275 5.929-3.275-6.587 6.996z" /></svg>, 
      color: 'bg-[#0084ff]', 
      count: '59.7k',
      url: `fb-messenger://share/?link=${siteUrl}`
    },
    { 
      name: 'Reddit', 
      icon: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.285-1.84.746-2.031-1.385-4.753-2.245-7.721-2.33l1.442-6.513 4.704.98c.025.67.578 1.206 1.258 1.206 1.32 0 2.4-1.077 2.4-2.4 0-1.324-1.08-2.4-2.4-2.4-1.085 0-1.99.724-2.28 1.717l-5.231-1.09c-.181-.035-.357.085-.41.261l-1.637 7.391c-3.037.045-5.835.914-7.937 2.336-.471-.44-.112-.71-.817-.71-1.465 0-2.657 1.186-2.657 2.645 0 .963.52 1.807 1.3 2.26-.035.223-.055.449-.055.677 0 3.438 4.286 6.233 9.56 6.233 5.275 0 9.561-2.795 9.561-6.233 0-.228-.021-.454-.055-.677.78-.452 1.3-1.297 1.3-2.26z" /></svg>, 
      color: 'bg-[#ff4500]', 
      count: '90.3k',
      url: `https://www.reddit.com/submit?url=${siteUrl}&title=${shareText}`
    },
    { 
      name: 'WhatsApp', 
      icon: <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>, 
      color: 'bg-[#25d366]', 
      count: '7.5k',
      url: `https://api.whatsapp.com/send?text=${shareText}%20${siteUrl}`
    },
    { 
      name: 'Telegram', 
      icon: <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.891 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.28.28-.43.28l.214-3.046 5.542-5.006c.24-.214-.053-.332-.372-.12l-6.85 4.312-2.952-.924c-.642-.204-.654-.642.134-.95l11.531-4.44c.534-.194 1.002.126.83.953z" /></svg>, 
      color: 'bg-[#0088cc]', 
      count: '',
      url: `https://t.me/share/url?url=${siteUrl}&text=${shareText}`
    },
  ];

  const handleShare = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 md:px-8 mb-10 mt-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a1217] via-[#21141e] to-[#271725] border border-white/5 rounded-2xl p-4 md:p-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-5 transition-all duration-300 shadow-2xl">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        {/* Brand Info */}
        <div className="flex items-center gap-4 md:-ml-4">
          <div className="w-15 h-15 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/5 overflow-hidden">
            <img
              src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2h0YjNqNW85cHRxY3R6MDAwdWU3anhpdmMxYTR4dHF3bWNxeG1mNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VVqUUvtKLrxe0/giphy.gif"
              alt="Mascot"
              className="w-full h-full object-cover scale-110 relative -left-1"
            />
          </div>
          <div>
            <h3 className="text-red-500 font-medium text-[22px] leading-tight tracking-tight">Love this site?</h3>
            <p className="text-white/40 text-[13px] mt-0.5 font-medium">Share it and let others know!</p>
          </div>
        </div>

        {/* Share Section */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="hidden lg:block text-right mr-4">
            <div className="text-white/20 font-medium text-[14px] leading-none tracking-tight">
              <span className="text-white/40 font-medium">330k</span> SHARES
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
            {shareLinks.map((social) => (
              <button
                key={social.name}
                onClick={() => handleShare(social.url)}
                className={`${social.color} h-6 px-2 md:h-9 md:px-4 rounded-sm flex items-center gap-1.5 md:gap-2.5 hover:brightness-110 active:scale-95 transition-all shadow-sm`}
              >
                <span className="text-white scale-75 md:scale-100">{social.icon}</span>
                {social.count && (
                  <span className="text-white font-medium text-[10px] md:text-[13px] border-l border-white/20 pl-1.5 md:pl-2.5">
                    {social.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShareBanner;
