import React, { useState, useEffect, useRef } from 'react';
import { Smile, Search, Clock, X, Heart, Coffee, Star, Compass, UserCheck } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
      '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
      '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
      '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
      '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
      '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'
    ]
  },
  {
    id: 'gestures',
    name: 'Hands & People',
    icon: UserCheck,
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🖐️', '✋',
      '👌', '🤌', '🤏', '🤏', '✍️', '👋', '💪', '🦵', '🦶', '👂',
      '🫀', '🫁', '🧠', '👀', '👁️', '👅', '👄', '💋', '👶', '🧒'
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts & Vibes',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '🌟',
      '⭐', '⚡', '🔥', '💥', '🎉', '🎊', '🎁', '🎈', '🏆', '💯'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drinks',
    icon: Coffee,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍔',
      '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🍳',
      '🍿', '🥗', '🍲', '🍜', '🍝', '🍣', '🍱', '☕', '🍵', '🧃'
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Symbols',
    icon: Compass,
    emojis: [
      '💻', '🖥️', '📱', '☎️', '📞', '📻', '🎙️', '🎛️', '🎧', '📸',
      '📹', '🎥', '🔍', '💡', '🔦', '⏰', '⌚', '📜', '📁', '📌',
      '📍', '🔑', '🏷️', '✉️', '📦', '✏️', '📝', '🔒', '🛡️', '⚡'
    ]
  }
];

export default function EmojiPickerPopover({ onSelectEmoji, onClose }) {
  const [activeCategoryId, setActiveCategoryId] = useState(EMOJI_CATEGORIES[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const containerRef = useRef(null);

  // Load recents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('raabta_recent_emojis');
      if (saved) {
        setRecentEmojis(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load recent emojis:', err);
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

  const handleEmojiClick = (emoji) => {
    // Add to recents
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    try {
      localStorage.setItem('raabta_recent_emojis', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save recent emoji:', err);
    }

    onSelectEmoji(emoji);
  };

  // Determine emojis to show
  let displayEmojis = [];
  if (searchTerm.trim()) {
    // Basic match / search filter
    const term = searchTerm.toLowerCase();
    EMOJI_CATEGORIES.forEach(cat => {
      cat.emojis.forEach(em => {
        if (em.includes(term)) {
          displayEmojis.push(em);
        }
      });
    });
    // If no direct unicode match, show category emojis matching term or fall back
    if (displayEmojis.length === 0) {
      const matchedCats = EMOJI_CATEGORIES.filter(c => c.name.toLowerCase().includes(term));
      matchedCats.forEach(c => displayEmojis.push(...c.emojis));
    }
  } else if (activeCategoryId === 'recents') {
    displayEmojis = recentEmojis;
  } else {
    const currentCat = EMOJI_CATEGORIES.find(c => c.id === activeCategoryId);
    if (currentCat) {
      displayEmojis = currentCat.emojis;
    }
  }

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-16 right-8 sm:right-24 z-50 w-72 sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
      style={{ maxHeight: '380px', height: '360px' }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/90">
        <div className="flex items-center space-x-2">
          <Smile className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-100">Emojis</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-indigo-500/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Category Tabs (hidden when searching) */}
      {!searchTerm.trim() && (
        <div className="flex items-center px-2 py-1.5 gap-1 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/40 no-scrollbar">
          {recentEmojis.length > 0 && (
            <button
              onClick={() => setActiveCategoryId('recents')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                activeCategoryId === 'recents'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
              title="Recent"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
                title={cat.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid View */}
      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        {displayEmojis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-4">
            <Smile className="w-6 h-6 mb-1 opacity-50 stroke-[1.5]" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No emojis found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {displayEmojis.map((emoji, idx) => (
              <button
                key={idx + emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:scale-125 transition-transform duration-150 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
