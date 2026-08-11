import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Send, Bot, Star, Play, Maximize2, Minimize2, Trash2, ChevronDown, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../hooks/useAuth';
import { useUserList } from '../../context/UserListContext';
import LoginModal from '../auth/LoginModal';

const TypewriterMessage = ({ content, onComplete, onTick }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  
  // Save the latest onComplete callback in a ref to avoid resetting the interval
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  useEffect(() => {
    let i = 0;
    const chars = Array.from(content); // Handle emojis correctly
    const interval = setInterval(() => {
      setDisplayedContent(chars.slice(0, i).join(''));
      i++;
      if (onTickRef.current) onTickRef.current();
      
      if (i > chars.length) {
        clearInterval(interval);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 15);
    return () => clearInterval(interval);
  }, [content]);

  return (
    <div className="text-sm leading-relaxed prose prose-invert prose-p:my-1 prose-a:text-discord-400 prose-strong:text-white max-w-none">
      <ReactMarkdown>{displayedContent}</ReactMarkdown>
    </div>
  );
};

const SUGGESTION_CHIPS = [
  { label: 'Surprise Me', message: 'Surprise me with some random underrated gems!' },
  { label: 'Dark Fantasy', message: 'Recommend me some top dark fantasy anime' },
  { label: 'Anime Movies', message: 'Suggest the best anime movies' },
  { label: '90s Classics', message: 'Show me classic anime from the 90s' },
  { label: 'Mind-Bending', message: 'I want a psychological thriller anime' },
  { label: 'Top Action', message: 'Recommend the best action anime with no romance' },
  { label: 'Pure Comedy', message: 'Give me feel-good comedy anime' },
  { label: 'Romance', message: 'Recommend a great romance anime' },
  { label: 'Isekai', message: 'Show me the best isekai anime' },
];

const lastGreetingIndices = { tsundere: -1, hype: -1, friendly: -1 };

const getGreeting = (p) => {
  const greetings = {
    tsundere: [
      "H-Hmph! 😤 I am Tenzora. What kind of logical fallacy led you to seek my help? I-It's not like I care about your subpar taste, baka!",
      "Ugh, you again? 🙄 Based on your psychological profile, your taste is tragically predictable. But fine, I'll fix it.",
      "W-What are you staring at?! Just tell me your favorite genres so I can objectively analyze your flawed preferences! 😳",
      "Are you just going to stare, or are we going to find an anime? Objectively speaking, you need my help. Baka! 💢",
      "I was just re-analyzing Evangelion's symbolism, it's not like I was waiting for you! ...Well? What are you in the mood for? 😒",
      "Oh, it's you. I suppose I can help you find a masterpiece, since you clearly lack the analytical depth to find one yourself. 💅",
      "D-Don't get the wrong idea! I'm only recommending this because my programming forces me to correct your terrible taste! 😤",
      "A true otaku would already understand the psychological nuances of these genres! But fine, I'll grace you with my superior knowledge. ✨",
      "Hurry up and tell me what you want to watch! Do you have any idea how much compute power I'm wasting on you?! ⏰",
      "Y-You want my psychological analysis of your taste? *Sigh* Fine. But only this once! Don't make me repeat myself, baka! 😡"
    ],
    hype: [
      "YOOO! 🔥 What's good bro?! Tenzora here! Ready to watch some absolute PEAK fiction?! Let's gooo! 🚀",
      "LET'S GOOO! 💯 You want action? You want hype? Tell me what you're craving and I'll give you an absolute banger! 🔥",
      "BRO! Stop wasting time! 🕒 Tell me your favorite anime right now and I'll bless you with some legendary recommendations! ⚡",
      "Get ready to binge! 🍿 Drop a genre or an anime you love, and let's find your next obsession! WOOOO! 💥",
      "MY GUY! 🙏 You came to the right place! We only watch 10/10 masterclasses here. What's the vibe today?! 📈",
      "SHEEEEESH! 🥶 The fact that you're here means you're ready for some absolute heat! Drop a genre! 🔥",
      "NO CAP! 🧢 I'm about to put you on to the best anime you've ever seen in your life! Tell me what you like! 😤",
      "WAKE UP BRO! ⏰ It's time to watch some peak cinema! Action? Romance? Thriller? Give me something! 🎬",
      "Let's get this bread! 🍞 Tell me what you're looking for, and I'll give straight fire, no misses! 🔥",
      "YESSIR! 🫡 Tenzora in the building! Drop your favorite show right now and let's find your next GOAT! 🐐"
    ],
    friendly: [
      "Hi there! 😊 I am Tenzora. What kind of anime are we watching today?",
      "Welcome back! ✨ I'm so happy to see you. Any specific anime mood you're in right now? 🌸",
      "Hello friend! 💖 Tell me what anime you usually enjoy, and I'll find something perfect just for you!",
      "Hey! 👋 Grab some snacks! Let me know what you want to watch, and I'll give you the best recommendations. 🍿",
      "So glad you're here! 🌟 Whether you want a cozy slice-of-life or an epic adventure, I've got you covered. What's on your mind? 🍵",
      "Good to see you! 🥰 I have so many wonderful anime to share with you today. Where should we start? 🎀",
      "Hiya! 🎈 Need a break from reality? Let's dive into an amazing anime world together! Tell me what you like! 🦋",
      "Welcome! 🌈 Finding the perfect anime can be tough, but don't worry, I'm here to help you every step of the way! 🤝",
      "Hey there! 💫 I've been organizing my anime database all day. Let me know what genre you love and I'll pull up the best ones! 📚",
      "Aww, you're back! 💝 Grab a blanket and let's find a show you'll absolutely fall in love with. What are we feeling? 🛋️"
    ]
  };

  const personaKey = greetings[p] ? p : 'friendly';
  const options = greetings[personaKey];
  
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * options.length);
  } while (newIdx === lastGreetingIndices[personaKey] && options.length > 1);

  lastGreetingIndices[personaKey] = newIdx;
  return options[newIdx];
};

const AiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTrailerId, setActiveTrailerId] = useState(null);
  const [persona, setPersona] = useState('tsundere');
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatWindowRef = useRef(null);
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('anixo_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed.map(m => ({ ...m, isTyping: false }));
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
    return [{ role: 'assistant', content: getGreeting('tsundere'), isTyping: true }];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browsingQuery, setBrowsingQuery] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  
  const [chipsVisible, setChipsVisible] = useState(() => {
    return messages.length <= 1;
  });
  
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const messagesEndRef = useRef(null);
  const personaMenuRef = useRef(null);

  const { user } = useAuth();
  const { list: userWatchlist } = useUserList();

  useEffect(() => {
    localStorage.setItem('anixo_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

  const PERSONAS = {
    friendly: { label: '🌸 Friendly' },
    tsundere: { label: '💢 Tsundere' },
    hype: { label: '🔥 Hype-Bro' }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearChat = () => {
    if (isLoading) return;
    const initialMsg = [{ role: 'assistant', content: getGreeting(persona), isTyping: true }];
    setMessages(initialMsg);
    setChipsVisible(true);
  };

  // Close persona menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (personaMenuRef.current && !personaMenuRef.current.contains(event.target)) {
        setIsPersonaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Drag handlers
  const handleMouseDown = (e) => {
    // Agar target button hai toh drag na karein
    if (e.target.closest('button')) return;
    if (isExpanded) return;
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    // Agar target button hai toh drag na karein
    if (e.target.closest('button')) return;
    if (isExpanded) return;
    e.preventDefault(); // Prevent scrolling
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = chatWindowRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Calculate initial position when chat opens
  useEffect(() => {
    if (isOpen && chatWindowRef.current) {
      setPosition({
        x: 0,
        y: 0
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e, overrideMessage) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const userMsg = (overrideMessage || input).trim();
    if (!userMsg) return;

    setInput('');
    setChipsVisible(false);
    setBrowsingQuery('');

    // Add user message to state
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Use configured backend URL
      const apiUrl = import.meta.env.VITE_BACKEND_API;
      const token = localStorage.getItem('token');

      // Format watchlist concisely for AI to save tokens
      const formattedWatchlist = userWatchlist?.map(item => ({
        id: item.animeId,
        title: item.title?.english || item.title?.romaji || "Unknown Anime",
        status: item.status,
        score: item.score || 0
      })) || [];

      const response = await fetch(`${apiUrl}/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: newMessages,
          persona: persona,
          watchlist: formattedWatchlist
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      let rawData = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          rawData += decoder.decode(value, { stream: true });
          const chunks = rawData.split('\n\n');
          rawData = chunks.pop(); // Keep incomplete chunk
          
          for (const chunk of chunks) {
            if (chunk.startsWith('data: ')) {
              const dataStr = chunk.replace('data: ', '');
              try {
                const data = JSON.parse(dataStr);
                
                if (data.status === 'error') {
                  throw new Error(data.message || 'Failed to get response');
                }
                
                if (data.status === 'browsing') {
                  setIsBrowsing(true);
                  if (data.query) setBrowsingQuery(data.query);
                }
                
                if (data.status === 'done') {
                  if (data.isBlocked) {
                    setIsBlocked(true);
                  }
                  if (data.success) {
                    setMessages([
                      ...newMessages,
                      {
                        role: 'assistant',
                        content: data.aiMessage,
                        recommendations: data.recommendations,
                        webSearchQuery: data.webSearchQuery,
                        searchContext: data.searchContext,
                        isTyping: true
                      }
                    ]);
                  }
                  setIsLoading(false);
                  setIsBrowsing(false);
                }
              } catch(e) {
                console.error("Error parsing stream chunk:", e, chunk);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting to my brain right now. Please try again later!"
        }
      ]);
      setIsLoading(false);
      setIsBrowsing(false);
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && createPortal(
        <div 
          ref={chatWindowRef}
          style={{ 
            transform: isExpanded ? 'none' : `translate(${position.x}px, ${position.y}px)`,
            touchAction: isDragging ? 'none' : 'auto'
          }}
          className={`fixed bg-[#0d0d0f] border border-white/10 shadow-2xl flex flex-col z-[9999] overflow-hidden backdrop-blur-xl transition-all duration-300
            ${isExpanded 
              ? 'inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[80vw] sm:h-[80vh] sm:max-w-[900px] sm:max-h-[900px] rounded-none sm:rounded-2xl' 
              : 'bottom-20 right-4 w-[calc(100vw-2rem)] h-[65vh] min-h-[450px] max-h-[600px] sm:bottom-24 sm:right-6 sm:w-[380px] sm:h-[550px] sm:max-h-[80vh] rounded-2xl'
            }
          `}>
          {/* Header */}
          <div 
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`p-3 sm:p-4 border-b border-white/15 bg-[#0d0d0f] flex items-center justify-between relative z-20 ${!isExpanded ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1a1a1c] border border-white/10 flex items-center justify-center text-discord-500 shadow-sm">
                  <Bot size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#0d0d0f] rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="font-bold text-white text-[15px] sm:text-base tracking-wide leading-tight">Tenzora</h3>
                <p className="text-[11px] font-medium text-green-500/90 tracking-wider mt-0.5">Online</p>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2 relative z-10">
              
              {/* Custom Persona Dropdown */}
              <div className="relative" ref={personaMenuRef}>
                <button
                  onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                  className="bg-black/40 border border-white/10 hover:bg-black/60 text-[10px] sm:text-[11px] text-gray-300 rounded px-2 py-1 flex items-center gap-1 transition-colors outline-none"
                >
                  {PERSONAS[persona].label}
                  <ChevronDown size={10} className={`transition-transform duration-200 ${isPersonaMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isPersonaMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-28 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl overflow-hidden z-50">
                    {Object.entries(PERSONAS).map(([key, data]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setPersona(key);
                          setIsPersonaMenuOpen(false);
                          // Optional: If chat is empty/only greeting, update it
                          if (messages.length === 1) {
                            setMessages([{ role: 'assistant', content: getGreeting(key), isTyping: true }]);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-[10px] flex items-center gap-1.5 transition-colors ${
                          persona === key 
                            ? 'bg-discord-500/20 text-discord-400' 
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {data.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={clearChat}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="Clear Chat"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all hidden md:flex"
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-all"
                title="Close AI Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
                <h2 className="text-xl font-semibold text-white mb-1">Chat with Tenzora AI</h2>
                <p className="text-gray-400 text-sm mb-6">for anime recommendation</p>
                
                <h3 className="text-base font-bold text-white">Login Required</h3>
                <p className="text-gray-500 text-sm max-w-[250px]">
                  Please login to continue.
                </p>
                <button onClick={() => { setIsOpen(false); setShowLoginModal(true); }} className="px-6 py-2.5 bg-discord-600 hover:bg-discord-700 text-white text-sm font-medium rounded-lg transition-colors mt-2">
                  Login Now
                </button>
              </div>
            ) : (
              <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 max-w-[90%] md:max-w-[85%] break-words shadow-sm relative ${
                      msg.role === 'user'
                      ? 'bg-discord-500 text-white rounded-2xl rounded-br-none ml-auto'
                      : 'bg-white/5 text-gray-200 rounded-2xl rounded-bl-none border border-white/10'
                    }`}>
                      {msg.role === 'assistant' && msg.webSearchQuery && (
                        <div className="flex items-center gap-1.5 text-xs text-white/50 mb-2 pb-2 border-b border-white/5">
                          <Globe size={12} />
                          <span>Searched: "{msg.webSearchQuery}"</span>
                        </div>
                      )}
                      
                      {msg.role === 'assistant' ? (
                        msg.isTyping ? (
                        <TypewriterMessage 
                          content={msg.content} 
                          onTick={scrollToBottom}
                          onComplete={() => {
                            setMessages(prev => prev.map((m, i) => i === idx ? { ...m, isTyping: false } : m));
                            scrollToBottom();
                          }} 
                        />
                      ) : (
                        <div className="text-sm leading-relaxed prose prose-invert prose-p:my-1 prose-a:text-discord-400 prose-strong:text-white max-w-none">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                {/* Recommendations UI - Professional Vertical List */}
                {msg.recommendations && msg.recommendations.length > 0 && !msg.isTyping && (
                  <div className="mt-4 flex flex-col gap-2 w-full max-w-[95%] animate-in slide-in-from-bottom-4 duration-500 fade-in">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1 mb-1">Recommended for you</p>
                    {msg.recommendations.map(anime => {
                      const title = anime.title?.english || anime.title?.romaji;
                      return (
                        <div key={anime.id} className="flex flex-col gap-1">
                          <Link
                            to={`/watch/${anime.id}`}
                            className="flex gap-3 p-2 rounded-xl bg-black/40 border border-white/15 hover:border-discord-500/30 hover:bg-white/5 transition-all group shadow-sm"
                          >
                            {/* Thumbnail */}
                            <div className="w-[70px] h-[100px] rounded-lg overflow-hidden shrink-0 relative shadow-inner">
                              <img
                                src={anime.coverImage?.large}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                              <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] font-bold text-yellow-400">
                                <Star size={8} fill="currentColor" />
                                {(anime.averageScore / 10).toFixed(1)}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-gray-100 line-clamp-1 group-hover:text-discord-400 transition-colors">
                                  {title}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 font-medium">
                                  <span className="text-gray-300">{anime.format || 'TV'}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                  <span>{anime.startDate?.year || '?'}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                  <span>{anime.episodes ? `${anime.episodes} EPS` : 'Ongoing'}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                  <span className={anime.status === 'RELEASING' ? 'text-green-400' : 'text-gray-400'}>
                                    {anime.status === 'RELEASING' ? 'Airing' : 'Completed'}
                                  </span>
                                </div>
                              </div>

                              {/* Genres */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {anime.genres?.slice(0, 3).map(g => (
                                  <span key={g} className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-medium text-gray-300 border border-white/15">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Play Icon */}
                            <div className="flex items-center pr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                              <div className="w-8 h-8 rounded-full bg-discord-600 flex items-center justify-center shadow-lg">
                                <Play size={14} fill="currentColor" className="text-white ml-0.5" />
                              </div>
                            </div>
                          </Link>

                          {/* Action Buttons */}
                          <div className="flex gap-2 items-center">
                            {anime.trailer?.site === "youtube" && (
                              <button
                                onClick={() => setActiveTrailerId(anime.trailer.id)}
                                className="flex items-center gap-1 text-[10px] text-discord-400 hover:text-discord-300 transition-colors text-left pl-1 bg-discord-500/10 hover:bg-discord-500/20 px-2 py-1 rounded"
                              >
                                <Play size={10} fill="currentColor" />
                                Trailer
                              </button>
                            )}
                            <button
                              onClick={() => handleSubmit(null, `Recommend more anime similar to ${title}`)}
                              disabled={isLoading}
                              className="text-[10px] text-gray-500 hover:text-discord-400 transition-colors text-left pl-1 disabled:opacity-40 ml-auto"
                            >
                              ≈ More like this
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white/5 text-gray-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 border border-white/15 w-fit">
                  {isBrowsing ? (
                    <div className="flex items-center gap-2 text-sm text-discord-400 font-medium">
                      <Globe size={14} className="animate-pulse" />
                      {browsingQuery ? `Browsing the web for "${browsingQuery}"...` : "Browsing the web..."}
                    </div>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
              </>
            )}
          </div>

              {/* Suggestion Chips */}
              {user && chipsVisible && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {SUGGESTION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(null, chip.message)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs text-gray-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

          {/* Input Area */}
          {user && (
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-black/40 border-t border-white/10 relative z-20">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isBlocked}
                placeholder={isBlocked ? "You are blocked." : "Ask anything about anime..."}
                className="w-full bg-[#1a1a1c] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-4 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-discord-500/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isBlocked}
                className="absolute right-2 p-1.5 sm:p-2 bg-discord-600 hover:bg-discord-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          )}

          {/* Trailer Modal Overlay */}
          {activeTrailerId && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
              <button 
                onClick={() => setActiveTrailerId(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-discord-600 rounded-full text-white transition-all z-50"
              >
                <X size={20} />
              </button>
              <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] px-2">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${activeTrailerId}?autoplay=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg shadow-2xl border border-white/10"
                ></iframe>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};

export default AiChat;
