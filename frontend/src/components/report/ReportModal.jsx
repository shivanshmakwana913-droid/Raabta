import { useState, useEffect } from 'react';
import { X, Flag, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import api from '../../services/api';
import { RaabtaLoader } from '../common/RaabtaLoader';

const ReportModal = ({ targetUser, targetMessage = null, onClose }) => {
  const [reason, setReason] = useState('Spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!targetUser?._id) {
      setErrorMsg('Target user information is missing');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data } = await api.post('/reports', {
        reportedUserId: targetUser._id,
        messageId: targetMessage?._id || null,
        reason,
        details
      });

      setSuccessMsg(data.message || 'Report submitted successfully');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(11, 15, 25, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1100
    }}>
      <div className="glass-panel glass-modal-content animate-slide-up" style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '28px',
        padding: '28px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flag size={20} color="#f87171" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              {targetMessage ? 'Report Message' : 'Report User'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="action-icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Target Preview */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '12px 14px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Reporting: <span style={{ color: 'var(--accent-primary)' }}>{targetUser?.name} (@{targetUser?.username})</span>
          </div>
          {targetMessage && targetMessage.content && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--accent-primary)',
              paddingLeft: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              "{targetMessage.content}"
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {errorMsg && (
          <div className="animate-fade-in" style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="animate-fade-in" style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Reason for Report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Abuse">Abuse</option>
              <option value="Inappropriate content">Inappropriate Content</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Additional Details (Optional, max 500 chars)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Describe the issue..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? <RaabtaLoader variant="button" /> : (
                <>
                  <Send size={16} /> Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
