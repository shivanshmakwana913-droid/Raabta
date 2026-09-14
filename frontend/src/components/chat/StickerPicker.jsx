import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Sparkles, 
  Flame, 
  Heart, 
  Search, 
  Clock, 
  X, 
  ThumbsUp, 
  Zap, 
  Coffee, 
  Star 
} from 'lucide-react';

// Curated high quality sticker sets (using reliable, SVG / PNG CDN illustrations & stickers)
const STICKER_PACKS = [
  {
    id: 'raabta_core',
    name: 'Raabta Emotes',
    icon: Sparkles,
    stickers: [
      { id: 'r1', name: 'Party Sparkle', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' },
      { id: 'r2', name: 'Love Heart', url: 'https://cdn-icons-png.flaticon.com/512/742/742752.png' },
      { id: 'r3', name: 'Cool Shades', url: 'https://cdn-icons-png.flaticon.com/512/742/742760.png' },
      { id: 'r4', name: 'Wink Star', url: 'https://cdn-icons-png.flaticon.com/512/742/742755.png' },
      { id: 'r5', name: 'Mind Blown', url: 'https://cdn-icons-png.flaticon.com/512/742/742774.png' },
      { id: 'r6', name: 'Crying Laughing', url: 'https://cdn-icons-png.flaticon.com/512/742/742765.png' },
      { id: 'r7', name: 'Angel Glow', url: 'https://cdn-icons-png.flaticon.com/512/742/742784.png' },
      { id: 'r8', name: 'Fire Flame', url: 'https://cdn-icons-png.flaticon.com/512/742/742823.png' }
    ]
  },
  {
    id: 'cute_pets',
    name: 'Reaction Pets',
    icon: Flame,
    stickers: [
      { id: 'p1', name: 'Happy Cat', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
      { id: 'p2', name: 'Dog Waves', url: 'https://cdn-icons-png.flaticon.com/512/616/616412.png' },
      { id: 'p3', name: 'Bear Hug', url: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },
      { id: 'p4', name: 'Panda Chill', url: 'https://cdn-icons-png.flaticon.com/512/616/616447.png' },
      { id: 'p5', name: 'Fox Wink', url: 'https://cdn-icons-png.flaticon.com/512/616/616438.png' },
      { id: 'p6', name: 'Bunny Love', url: 'https://cdn-icons-png.flaticon.com/512/616/616460.png' },
      { id: 'p7', name: 'Koala Sleep', url: 'https://cdn-icons-png.flaticon.com/512/616/616450.png' },
      { id: 'p8', name: 'Penguin Dance', url: 'https://cdn-icons-png.flaticon.com/512/616/616456.png' }
    ]
  },
  {
    id: 'vibes_badges',
    name: 'Mood & Badges',
    icon: Zap,
    stickers: [
      { id: 'b1', name: 'Coffee Mode', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151034.png' },
      { id: 'b2', name: 'Target Hit', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151048.png' },
      { id: 'b3', name: 'Rocket Launch', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151011.png' },
      { id: 'b4', name: 'Lightning Bolt', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151004.png' },
      { id: 'b5', name: 'Gold Medal', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151025.png' },
      { id: 'b6', name: 'Crown King', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151061.png' },
      { id: 'b7', name: 'Magic Wand', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151040.png' },
      { id: 'b8', name: '100 Percent', url: 'https://cdn-icons-png.flaticon.com/512/4151/4151068.png' }
    ]
  }
];

export default function StickerPicker({ onSelectSticker, onClose }) {
  const [activePackId, setActivePackId] = useState(STICKER_PACKS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentStickers, setRecentStickers] = useState([]);
  const containerRef = useRef(null);

  // Load recent stickers from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('raabta_recent_stickers');
      if (saved) {
        setRecentStickers(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load recent stickers:', err);
    }
  }, []);

  // Handle outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleStickerClick = (sticker) => {
    // Save to recents
    const updatedRecents = [sticker, ...recentStickers.filter(s => s.id !== sticker.id)].slice(0, 12);
    setRecentStickers(updatedRecents);
    try {
      localStorage.setItem('raabta_recent_stickers', JSON.stringify(updatedRecents));
    } catch (err) {
      console.warn('Failed to save recent sticker:', err);
    }

    onSelectSticker(sticker.url, sticker.name);
  };

  // Get stickers to display based on tab or search
  let displayStickers = [];
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    STICKER_PACKS.forEach(pack => {
      pack.stickers.forEach(stk => {
        if (stk.name.toLowerCase().includes(term)) {
          displayStickers.push(stk);
        }
      });
    });
  } else if (activePackId === 'recents') {
    displayStickers = recentStickers;
  } else {
    const currentPack = STICKER_PACKS.find(p => p.id === activePackId);
    if (currentPack) {
      displayStickers = currentPack.stickers;
    }
  }

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-16 right-4 sm:right-12 z-50 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
      style={{ maxHeight: '420px', height: '400px' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/90">
        <div className="flex items-center space-x-2">
          <Smile className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">Stickers</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search stickers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-indigo-500/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Packs / Tabs Navigation (hidden when searching) */}
      {!searchTerm.trim() && (
        <div className="flex items-center px-2 py-2 gap-1 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/40 no-scrollbar">
          {recentStickers.length > 0 && (
            <button
              onClick={() => setActivePackId('recents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activePackId === 'recents'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recent</span>
            </button>
          )}

          {STICKER_PACKS.map((pack) => {
            const Icon = pack.icon;
            const isActive = activePackId === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => setActivePackId(pack.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pack.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticker Grid View */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        {displayStickers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-6">
            <Smile className="w-8 h-8 mb-2 opacity-50 stroke-[1.5]" />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {searchTerm ? 'No stickers match your search' : 'No recent stickers yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {displayStickers.map((sticker) => (
              <button
                key={sticker.id + sticker.name}
                onClick={() => handleStickerClick(sticker)}
                title={sticker.name}
                className="group relative aspect-square p-2 rounded-xl flex items-center justify-center hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/40 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-16 h-16 object-contain drop-shadow-sm group-hover:drop-shadow-md transition-all"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Info */}
      <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/60 text-[11px] text-zinc-400 dark:text-zinc-500 text-center font-medium">
        Click a sticker to send instantly
      </div>
    </div>
  );
}
