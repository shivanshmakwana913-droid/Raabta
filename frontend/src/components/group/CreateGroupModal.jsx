import { useState, useEffect } from 'react';
import { X, Search, Users, UserPlus, AlertCircle, Check } from 'lucide-react';
import api from '../../services/api';

const CreateGroupModal = ({ onClose, onGroupCreated, onSelectConversation }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // User search with 300ms debounce
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
        setSearchResults(data);
      } catch (err) {
        console.error('[Search Users Error]:', err.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddUser = (user) => {
    if (!selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!groupName.trim()) {
      setErrorMessage('Please provide a group name');
      return;
    }

    if (selectedUsers.length < 1) {
      setErrorMessage('Please select at least 1 other participant for the group');
      return;
    }

    try {
      setIsSubmitting(true);
      const participantIds = selectedUsers.map((u) => u._id);

      const { data } = await api.post('/conversations/group', {
        groupName: groupName.trim(),
        participantIds
      });

      if (onGroupCreated) onGroupCreated(data);
      if (onSelectConversation) onSelectConversation(data);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to create group');
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
        maxWidth: '500px',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Create New Group
            </h3>
          </div>
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

        {/* Error Alert */}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Group Name Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Project Developers, Family Chat..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Selected Members ({selectedUsers.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--accent-gradient)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem',
                      fontWeight: '500'
                    }}
                  >
                    <span>{user.name || user.username}</span>
                    <X
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveUser(user._id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users to Add */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Add Members
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search users by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Search Results List */}
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {isSearching ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Searching users...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u._id === user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() => (isSelected ? handleRemoveUser(user._id) : handleAddUser(user))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      marginBottom: '4px'
                    }}
                    className="search-result-item"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.name}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        @{user.username}
                      </div>
                    </div>
                    {isSelected ? (
                      <Check size={18} color="var(--status-online)" />
                    ) : (
                      <UserPlus size={18} color="var(--accent-primary)" />
                    )}
                  </div>
                );
              })
            ) : searchQuery.trim() ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No users found
              </div>
            ) : null}
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedUsers.length < 1 || !groupName.trim()}
              className="btn-primary"
              style={{ flex: 1, padding: '12px' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
