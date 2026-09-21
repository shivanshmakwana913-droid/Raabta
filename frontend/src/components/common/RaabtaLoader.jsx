import React from 'react';
import { RaabtaLogoMark } from './RaabtaLogo';

/**
 * Raabta Branded Loader Component
 * Variants:
 *  - fullPage: Full screen backdrop loader with branded animated rings
 *  - inline: Centered loader inside cards/containers
 *  - button: Compact white/accent spinner for action buttons
 *  - skeleton: Chat/Sidebar loading skeleton pulse UI
 */
export const RaabtaLoader = ({ variant = 'inline', message = 'Loading...', size = 'medium', isExiting = false }) => {
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
      <div className={`raabta-fullpage-loader ${isExiting ? 'zoom-out-exit' : ''}`} role="status" aria-label="Loading Raabta">
        <div className="raabta-brand-pulse-container">
          <div className="raabta-pulse-ring ring-1"></div>
          <div className="raabta-pulse-ring ring-2"></div>
          <div className="raabta-brand-logo-mark">
            <RaabtaLogoMark size={54} glow={true} />
          </div>
        </div>
        <h2 className="raabta-brand-title">Raabta</h2>
        <p className="raabta-brand-subtitle">Feel Connected.</p>
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
