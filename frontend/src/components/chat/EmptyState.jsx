import { RaabtaLogoMark } from '../common/RaabtaLogo';

const EmptyState = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '32px',
      textAlign: 'center',
      color: 'var(--text-muted)',
      background: 'var(--bg-primary)'
    }}>
      <div className="animate-scale-in" style={{
        marginBottom: '24px',
        display: 'inline-flex'
      }}>
        <RaabtaLogoMark size={100} glow={true} />
      </div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
        Raabta
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '16px', letterSpacing: '0.01em' }}>
        Feel Connected.
      </p>
      <p style={{ maxWidth: '340px', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Select a conversation from the sidebar or search for users to start chatting in real time.
      </p>
    </div>
  );
};

export default EmptyState;
