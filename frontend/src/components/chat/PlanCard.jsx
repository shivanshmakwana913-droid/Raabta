import { useState } from 'react';
import { Calendar, CheckCircle2, HelpCircle, XCircle, Clock, User } from 'lucide-react';
import api from '../../services/api';

const PlanCard = ({ plan, currentUser, onPlanUpdated }) => {
  const [loadingStatus, setLoadingStatus] = useState(null);

  if (!plan) return null;

  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const myResponse = plan.responses?.find(
    (r) => (r.user?._id || r.user)?.toString() === currentUserId
  )?.status;

  const goingCount = plan.responses?.filter((r) => r.status === 'going').length || 0;
  const maybeCount = plan.responses?.filter((r) => r.status === 'maybe').length || 0;
  const cantGoCount = plan.responses?.filter((r) => r.status === 'cant_go').length || 0;

  const formattedDate = plan.date
    ? new Date(plan.date).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';

  const creatorName =
    typeof plan.creator === 'object'
      ? plan.creator?.name || plan.creator?.username
      : 'User';

  const handleRespond = async (status) => {
    if (loadingStatus || myResponse === status) return;
    setLoadingStatus(status);
    try {
      const { data } = await api.put(`/plans/${plan._id}/respond`, { status });
      if (onPlanUpdated) {
        onPlanUpdated(data);
      }
    } catch (err) {
      console.error('[Respond to plan error]:', err.message);
    } finally {
      setLoadingStatus(null);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '14px 16px',
        minWidth: '260px',
        maxWidth: '340px',
        textAlign: 'left',
        margin: '4px 0',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px'
        }}
      >
        <span
          style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            fontSize: '0.7rem',
            fontWeight: '800',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          <Calendar size={12} /> Raabta Plan
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: '1rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '6px',
          wordBreak: 'break-word'
        }}
      >
        {plan.title}
      </div>

      {/* Date & Time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px'
        }}
      >
        <Clock size={14} style={{ color: 'var(--accent-secondary)' }} />
        <span>{formattedDate}</span>
      </div>

      {/* Creator */}
      {creatorName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '12px'
          }}
        >
          <User size={12} />
          <span>Created by {creatorName}</span>
        </div>
      )}

      {/* Response Counts Summary */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          background: 'var(--bg-secondary)',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '0.78rem'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#10b981' }}>{goingCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Going</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#f59e0b' }}>{maybeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Maybe</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', color: '#ef4444' }}>{cantGoCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Can't Go</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          disabled={loadingStatus === 'going'}
          onClick={() => handleRespond('going')}
          style={{
            flex: 1,
            padding: '7px 8px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '600',
            border: myResponse === 'going' ? 'none' : '1px solid var(--border-color)',
            background: myResponse === 'going' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'var(--bg-secondary)',
            color: myResponse === 'going' ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle2 size={13} /> Going
        </button>

        <button
          type="button"
          disabled={loadingStatus === 'maybe'}
          onClick={() => handleRespond('maybe')}
          style={{
            flex: 1,
            padding: '7px 8px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '600',
            border: myResponse === 'maybe' ? 'none' : '1px solid var(--border-color)',
            background: myResponse === 'maybe' ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' : 'var(--bg-secondary)',
            color: myResponse === 'maybe' ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.15s ease'
          }}
        >
          <HelpCircle size={13} /> Maybe
        </button>

        <button
          type="button"
          disabled={loadingStatus === 'cant_go'}
          onClick={() => handleRespond('cant_go')}
          style={{
            flex: 1,
            padding: '7px 8px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '600',
            border: myResponse === 'cant_go' ? 'none' : '1px solid var(--border-color)',
            background: myResponse === 'cant_go' ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'var(--bg-secondary)',
            color: myResponse === 'cant_go' ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.15s ease'
          }}
        >
          <XCircle size={13} /> Can't Go
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
