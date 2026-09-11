import { MessageSquareDashed } from 'lucide-react';

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
      color: 'var(--text-muted)'
    }}>
      <div style={{
        padding: '24px',
        borderRadius: '50%',
        background: 'var(--bg-secondary)',
        marginBottom: '20px',
        border: '1px solid var(--border-color)'
      }}>
        <MessageSquareDashed size={48} color="var(--accent-primary)" />
      </div>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
        Raabta
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '500', marginBottom: '12px' }}>
        Jahan baatein judti hain.
      </p>
      <p style={{ maxWidth: '320px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Select a conversation from the sidebar or search for users to start a real-time chat.
      </p>
    </div>
  );
};

export default EmptyState;
