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
      className="emoji-picker-popover animate-scale-in"
      style={{
        position: 'absolute',
        bottom: '68px',
        right: '16px',
        width: '330px',
        maxWidth: 'calc(100vw - 32px)',
        height: '350px',
        maxHeight: '45vh',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smile size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Emojis</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close emoji picker"
          className="action-icon-btn"
          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              fontSize: '0.82rem',
              borderRadius: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchTerm.trim() && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)'
        }}>
          {recentEmojis.length > 0 && (
            <button
              onClick={() => setActiveCategoryId('recents')}
              title="Recent Emojis"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeCategoryId === 'recents' ? 'var(--accent-glow)' : 'transparent',
                color: activeCategoryId === 'recents' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Clock size={16} />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                title={cat.name}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {displayEmojis.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Smile size={24} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <span style={{ fontSize: '0.82rem' }}>No emojis found</span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px'
          }}>
            {displayEmojis.map((emoji, idx) => (
              <button
                key={idx + emoji}
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease'
                }}
                className="emoji-btn-hover"
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
