import { useState } from 'react';
import { X, CheckSquare, Calendar, Users, Sparkles, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const ConvertToActionModal = ({ message, conversation, currentUser, onClose, onActionCreated }) => {
  const [actionType, setActionType] = useState('task'); // 'task' | 'reminder' | 'plan'
  const [title, setTitle] = useState(message.content || 'New Action Item');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const participants = conversation?.participants || [];

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a title for the action');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (actionType === 'plan') {
        // Create Raabta Plan
        const planDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const { data } = await api.post('/plans', {
          conversationId: conversation._id,
          title: title.trim(),
          date: planDate
        });
        if (onActionCreated) onActionCreated({ type: 'plan', data });
      } else {
        // Create Task or Reminder
        const { data } = await api.post('/intelligence/followups', {
          conversationId: conversation._id,
          messageId: message._id,
          title: title.trim(),
          actionType,
          assignees: selectedAssignees,
          dueDate: dueDate ? new Date(dueDate) : null,
          note: message.content || ''
        });
        if (onActionCreated) onActionCreated({ type: actionType, data });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create action item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(6px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-primary, #f8fafc)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--accent-primary, #6366f1)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Convert Message to Action</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Source Message Preview */}
        <div style={{
          backgroundColor: 'var(--bg-primary, #0f172a)',
          borderLeft: '4px solid var(--accent-primary, #6366f1)',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '2px' }}>
            Source Message from {message.sender?.name || message.sender?.username || 'User'}:
          </div>
          <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{message.content || `[${message.messageType}]`}"
          </div>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Action Type Selector */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Action Type
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'task', label: '📝 Task' },
                { key: 'reminder', label: '⏰ Reminder' },
                { key: 'plan', label: '📅 Raabta Plan' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActionType(item.key)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    backgroundColor: actionType === item.key ? 'var(--accent-primary, #6366f1)' : 'transparent',
                    color: actionType === item.key ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Title */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Action Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Action Title..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #334155)',
                backgroundColor: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Optional Deadline */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Deadline / Target Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #334155)',
                backgroundColor: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Assignees Selection (for tasks/reminders) */}
          {actionType !== 'plan' && participants.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Assignees (Optional)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {participants.map((p) => {
                  const pId = typeof p === 'object' ? (p._id || p.id) : p;
                  const name = typeof p === 'object' ? (p.name || p.username) : 'Member';
                  const isSelected = selectedAssignees.includes(pId);
                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => handleToggleAssignee(pId)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color, #334155)',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                        color: isSelected ? 'var(--accent-primary, #6366f1)' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}{name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #334155)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent-primary, #6366f1)',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Creating Action...' : 'Confirm & Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertToActionModal;
