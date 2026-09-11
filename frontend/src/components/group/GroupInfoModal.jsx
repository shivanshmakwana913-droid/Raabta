import { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserMinus, Edit2, Check, Shield, AlertCircle, Search } from 'lucide-react';
import api from '../../services/api';

const GroupInfoModal = ({ conversation, currentUser, onClose, onGroupUpdated }) => {
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isAdmin = (conversation.groupAdmin?._id || conversation.groupAdmin)?.toString() === currentUser._id.toString();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Search users for adding to group
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        // Exclude users already in the group
        const groupParticipantIds = conversation.participants.map((p) => p._id.toString());
        const filtered = data.filter((u) => !groupParticipantIds.includes(u._id.toString()));
        setSearchResults(filtered);
      } catch (err) {
        console.error('[Search Add Users Error]:', err.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, conversation.participants]);

  // Handle Rename Group
  const handleRenameGroup = async () => {
    if (!groupName.trim() || groupName.trim() === conversation.groupName) {
      setIsEditingName(false);
      return;
    }

    setErrorMessage('');
    try {
      setIsSubmitting(true);
      const { data } = await api.put('/conversations/group/rename', {
        conversationId: conversation._id,
        groupName: groupName.trim()
      });

      if (onGroupUpdated) onGroupUpdated(data);
      setIsEditingName(false);
      setSuccessMessage('Group renamed successfully');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to rename group');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Member
  const handleAddMember = async (targetUser) => {
    setErrorMessage('');
    try {
      setIsSubmitting(true);
      const { data } = await api.put('/conversations/group/add', {
        conversationId: conversation._id,
        userId: targetUser._id
      });

      if (onGroupUpdated) onGroupUpdated(data);
      setSearchQuery('');
      setSearchResults([]);
      setSuccessMessage(`${targetUser.name || targetUser.username} added to group`);
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (targetUserId) => {
    setErrorMessage('');
    try {
      setIsSubmitting(true);
      const { data } = await api.put('/conversations/group/remove', {
        conversationId: conversation._id,
        userId: targetUserId
      });

      if (onGroupUpdated) onGroupUpdated(data);
      setSuccessMessage('Member removed from group');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Group Details
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
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
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '0.88rem'
          }}>
            {successMessage}
          </div>
        )}

        {/* Group Header Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img
            src={conversation.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.groupName}`}
            alt={conversation.groupName}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent-primary)',
              marginBottom: '12px'
            }}
          />

          {isEditingName && isAdmin ? (
            <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}
              />
              <button
                onClick={handleRenameGroup}
                disabled={isSubmitting}
                className="btn-primary"
                style={{ padding: '8px 12px', borderRadius: '8px' }}
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {conversation.groupName}
              </h4>
              {isAdmin && (
                <Edit2
                  size={16}
                  style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setIsEditingName(true)}
                />
              )}
            </div>
          )}

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {conversation.participants.length} Members • Admin: {conversation.groupAdmin?.name || conversation.groupAdmin?.username || 'Admin'}
          </div>
        </div>

        {/* Add Members Section (Admin Only) */}
        {isAdmin && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Add Members to Group
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Search results dropdown */}
            {searchQuery.trim() && (
              <div style={{ maxHeight: '140px', overflowY: 'auto', marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '6px' }}>
                {isSearching ? (
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleAddMember(user)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      className="search-result-item"
                    >
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{user.name} (@{user.username})</span>
                      <UserPlus size={16} color="var(--accent-primary)" />
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No users available</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group Participants List */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Group Members ({conversation.participants.length})
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {conversation.participants.map((member) => {
              const isMemberAdmin = (conversation.groupAdmin?._id || conversation.groupAdmin)?.toString() === member._id.toString();
              return (
                <div
                  key={member._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                      alt={member.name}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{member.name}</span>
                        {isMemberAdmin && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        @{member.username}
                      </div>
                    </div>
                  </div>

                  {/* Admin Remove Button */}
                  {isAdmin && !isMemberAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={isSubmitting}
                      title="Remove from group"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%'
                      }}
                    >
                      <UserMinus size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
