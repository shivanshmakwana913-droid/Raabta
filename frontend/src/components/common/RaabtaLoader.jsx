import React from 'react';

/**
 * Raabta Branded Loader Component
 * Variants:
 *  - fullPage: Full screen backdrop loader with branded animated rings
 *  - inline: Centered loader inside cards/containers
 *  - button: Compact white/accent spinner for action buttons
 *  - skeleton: Chat/Sidebar loading skeleton pulse UI
 */
export const RaabtaLoader = ({ variant = 'inline', message = 'Loading...', size = 'medium' }) => {
  if (variant === 'button') {
    return (
      <span className="raabta-button-spinner" aria-label="Loading">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
          <path d="M12 3a9 9 0 0 1 9 9" className="raabta-spinner-head" />
        </svg>
      </span>
    );
  }

  if (variant === 'fullPage') {
    return (
      <div className="raabta-fullpage-loader" role="status" aria-label="Loading Raabta">
        <div className="raabta-brand-pulse-container">
          <div className="raabta-pulse-ring ring-1"></div>
          <div className="raabta-pulse-ring ring-2"></div>
          <div className="raabta-brand-logo-mark">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 28V12C10 9.79086 11.7909 8 14 8H26C28.2091 8 30 9.79086 30 12V22C30 24.2091 28.2091 26 26 26H16L10 28Z" stroke="url(#raabta-grad-1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 15H25" stroke="url(#raabta-grad-2)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M15 19H21" stroke="url(#raabta-grad-2)" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="raabta-grad-1" x1="10" y1="8" x2="30" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366F1" />
                  <stop offset="1" stopColor="#A855F7" />
                </linearGradient>
                <linearGradient id="raabta-grad-2" x1="15" y1="15" x2="25" y2="19" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#818CF8" />
                  <stop offset="1" stopColor="#C084FC" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <h2 className="raabta-brand-title">Raabta</h2>
        <p className="raabta-brand-subtitle">Jahan baatein judti hain</p>
        <div className="raabta-loading-bar-wrapper">
          <div className="raabta-loading-bar-fill"></div>
        </div>
      </div>
    );
  }

  // Default: Inline variant
  return (
    <div className={`raabta-inline-loader ${size}`} role="status" aria-label="Loading">
      <div className="raabta-spinner-ring"></div>
      {message && <span className="raabta-inline-message">{message}</span>}
    </div>
  );
};

export const SidebarSkeleton = () => {
  return (
    <div className="raabta-skeleton-list">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="raabta-skeleton-item">
          <div className="raabta-skeleton-avatar"></div>
          <div className="raabta-skeleton-lines">
            <div className="raabta-skeleton-line short"></div>
            <div className="raabta-skeleton-line long"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatSkeleton = () => {
  return (
    <div className="raabta-skeleton-chat">
      <div className="raabta-skeleton-bubble incoming">
        <div className="raabta-skeleton-line long"></div>
        <div className="raabta-skeleton-line short"></div>
      </div>
      <div className="raabta-skeleton-bubble outgoing">
        <div className="raabta-skeleton-line medium"></div>
      </div>
      <div className="raabta-skeleton-bubble incoming">
        <div className="raabta-skeleton-line medium"></div>
        <div className="raabta-skeleton-line long"></div>
      </div>
      <div className="raabta-skeleton-bubble outgoing">
        <div className="raabta-skeleton-line short"></div>
      </div>
    </div>
  );
};

export default RaabtaLoader;
