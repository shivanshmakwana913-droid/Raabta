import React from 'react';

/**
 * Raabta Branded Custom Handshake Logo Component
 * 
 * Props:
 *  - variant: 'mark' | 'full' | 'badge' (default: 'mark')
 *  - size: number or string (e.g. 40, 48, '100%')
 *  - showText: boolean (shows 'Raabta' text next to mark)
 *  - showTagline: boolean
 *  - glow: boolean (enables glowing backdrop shadow)
 *  - className: additional CSS classes
 */
export const RaabtaLogoMark = ({ size = 40, glow = true, className = '', style = {} }) => {
  return (
    <div 
      className={`raabta-logo-mark-wrapper ${glow ? 'has-glow' : ''} ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        ...style
      }}
    >
      <img 
        src="/raabta-logo.png" 
        alt="Raabta Logo" 
        className="raabta-logo-img"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export const RaabtaLogo = ({ 
  variant = 'mark', 
  size = 44, 
  showText = false, 
  showTagline = false,
  glow = true,
  className = '',
  style = {} 
}) => {
  if (variant === 'badge' || (showText && variant === 'mark')) {
    return (
      <div className={`raabta-brand-badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', ...style }}>
        <RaabtaLogoMark size={size} glow={glow} />
        <div>
          <h1 className="raabta-brand-name" style={{ margin: 0, fontSize: typeof size === 'number' ? `${size * 0.58}px` : '1.4rem', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Raabta
          </h1>
          {showTagline && (
            <span className="raabta-brand-tagline" style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
              Feel Connected.
            </span>
          )}
        </div>
      </div>
    );
  }

  return <RaabtaLogoMark size={size} glow={glow} className={className} style={style} />;
};

export default RaabtaLogo;
