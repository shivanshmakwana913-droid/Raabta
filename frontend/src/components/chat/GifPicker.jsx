import React, { useState, useEffect, useRef } from 'react';
import { Search, X, RefreshCw, AlertCircle, Film } from 'lucide-react';
import { RaabtaLoader } from '../common/RaabtaLoader';

// Curated high quality GIF fallbacks (used if public API requests fail or offline)
const CURATED_FALLBACK_GIFS = {
  trending: [
    { id: 't1', title: 'Happy Cat', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnFlMnIycWV1bXFlNWoxbWRrdmFlbHN6N3ZnbmtuaXhhMnRpaXF2ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BvBE720FY9KyA/giphy.gif' },
    { id: 't2', title: 'Excited Dance', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHMxc2x6d3E3MnQydmlwbW00cHRoc25rNXoxcHQ0a2E2MXB4OW96NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0amJzj6eRLyanJwI/giphy.gif' },
    { id: 't3', title: 'Mind Blown', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm5nZjM1bnhkZjUxdjU4ZDFscTJubThjMXA3NXBla2szMGg1c3M0biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufdipQqU2lhNA4g/giphy.gif' },
    { id: 't4', title: 'Applause', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h0YnpwNm9sYzVzeWV3NnJpdTllMHU1bHpwOTRtdTVndms1M20ybyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g9582DNuQppxC/giphy.gif' },
    { id: 't5', title: 'Thumbs Up', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzB0YWs5cXk5Nng4am1rZndtbTFrcTVpdDhpNmpxNWsybTB1bjdrYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/111ebonMs90YLu/giphy.gif' },
    { id: 't6', title: 'Love Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjRwbndmYWJidmdxcHB4bXR0c2cxdm56NmxmbmtxNWc4bTB1bXR1dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41JwPlaJv7d1Fug0/giphy.gif' }
  ],
  happy: [
    { id: 'h1', title: 'Happy Dance', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHMxc2x6d3E3MnQydmlwbW00cHRoc25rNXoxcHQ0a2E2MXB4OW96NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0amJzj6eRLyanJwI/giphy.gif' },
    { id: 'h2', title: 'Joyful Cheer', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h0YnpwNm9sYzVzeWV3NnJpdTllMHU1bHpwOTRtdTVndms1M20ybyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g9582DNuQppxC/giphy.gif' }
  ],
  love: [
    { id: 'l1', title: 'Heart Eyes', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjRwbndmYWJidmdxcHB4bXR0c2cxdm56NmxmbmtxNWc4bTB1bXR1dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41JwPlaJv7d1Fug0/giphy.gif' }
  ]
};

const CATEGORIES = ['Trending', 'Happy', 'Love', 'Laughing', 'Surprised', 'Sad', 'Dance'];

const GifPicker = ({ onSelectGif, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pickerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Fetch GIFs (GIPHY Public Endpoint or Fallback)
  const fetchGifs = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      // Giphy public beta key
      const apiKey = 'dc6zaTOxFJmzC';
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query.trim())}&limit=18&api_key=${apiKey}`
        : `https://api.giphy.com/v1/gifs/trending?limit=18&api_key=${apiKey}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch GIFs from provider API');
      const data = await res.json();

      if (data && data.data && data.data.length > 0) {
        const formatted = data.data.map((item) => ({
          id: item.id,
          title: item.title || 'GIF',
          url: item.images?.downsized_medium?.url || item.images?.original?.url || item.images?.fixed_height?.url
        }));
        setGifs(formatted);
      } else {
        // Fallback if empty results
        const catKey = query.toLowerCase() in CURATED_FALLBACK_GIFS ? query.toLowerCase() : 'trending';
        setGifs(CURATED_FALLBACK_GIFS[catKey] || CURATED_FALLBACK_GIFS.trending);
      }
    } catch (err) {
      console.warn('[GIF Fetch Warning]: Using curated GIFs fallback due to network/API limit:', err.message);
      const catKey = query.toLowerCase() in CURATED_FALLBACK_GIFS ? query.toLowerCase() : 'trending';
      setGifs(CURATED_FALLBACK_GIFS[catKey] || CURATED_FALLBACK_GIFS.trending);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on query change (debounced 350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGifs(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    if (cat === 'Trending') {
      setSearchQuery('');
      fetchGifs('');
    } else {
      setSearchQuery(cat);
    }
  };

  return (
    <div
      ref={pickerRef}
      className="animate-slide-up"
      style={{
        position: 'absolute',
        bottom: '70px',
        left: '16px',
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '440px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <Film size={18} color="var(--accent-primary)" />
          <span>GIF Express</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close GIF picker"
          className="action-icon-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '10px 14px 6px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 30px 8px 36px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <X
              size={14}
              onClick={() => { setSearchQuery(''); fetchGifs(''); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
            />
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 0 4px 0' }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat && (!searchQuery || searchQuery.toLowerCase() === cat.toLowerCase());
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* GIF Grid List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 14px 12px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <RaabtaLoader message="Searching GIFs..." size="small" />
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <AlertCircle size={24} style={{ marginBottom: '8px', color: '#f87171' }} />
            <p>{error}</p>
            <button
              onClick={() => fetchGifs(searchQuery)}
              className="btn-secondary"
              style={{ marginTop: '10px', padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={14} /> Retry Search
            </button>
          </div>
        ) : gifs.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {gifs.map((gif) => (
              <div
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif.url);
                  onClose();
                }}
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '110px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  transition: 'transform var(--transition-fast), border-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No GIFs found for "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default GifPicker;
