import { useState, useEffect } from 'react';
import { Search, LogOut, MessageSquare, UserPlus, X, Settings, Users, Bell, BellOff } from 'lucide-react';
import api from '../../services/api';
import ConversationItem from './ConversationItem';
import { formatConversationTime } from '../../utils/dateFormatter';

const Sidebar = ({
  currentUser,
  conversations,
  selectedConversation,
  onSelectConversation,
  onLogout,
  onConversationCreated,
  onOpenProfile,
  onOpenCreateGroup,
  loadingConversations
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState('chats'); // 'chats' | 'messages' | 'users'

  // User search state
  const [userResults, setUserResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Message search state
  const [messageResults, setMessageResults] = useState([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleRequestNotifPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported by your browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      alert('Browser notifications are already enabled!');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Browser notifications are blocked. Please enable them in your browser site settings.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    } catch (err) {
      console.error('[Notification Permission Error]:', err);
    }
  };

  // Handle User Search API
  useEffect(() => {
    if (searchTab !== 'users' || !searchQuery.trim()) {
      setUserResults([]);
      setIsSearchingUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setUserResults(data || []);
      } catch (err) {
        console.error('[User Search Error]:', err.message);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab]);

  // Handle Message Search API
  useEffect(() => {
    if (searchTab !== 'messages' || !searchQuery.trim()) {
      setMessageResults([]);
      setIsSearchingMessages(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMessages(true);
      try {
        const { data } = await api.get(`/messages/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setMessageResults(data.messages || []);
      } catch (err) {
        console.error('[Message Search Error]:', err.message);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab]);

  const handleSelectUser = async (targetUser) => {
    try {
      const { data } = await api.post('/conversations', {
        targetUserId: targetUser._id
      });

      setSearchQuery('');
      setUserResults([]);

      if (onConversationCreated) {
        onConversationCreated(data);
      }
      onSelectConversation(data);
    } catch (err) {
      console.error('[Create Conversation Error]:', err.message);
    }
  };

  const handleSelectMessageResult = (msg) => {
    const convId = (msg.conversation?._id || msg.conversation).toString();
    const existingConv = conversations.find((c) => c._id.toString() === convId);

    if (existingConv) {
      onSelectConversation(existingConv);
    } else if (msg.conversation && typeof msg.conversation === 'object') {
      onSelectConversation(msg.conversation);
    }

    setSearchQuery('');
    setMessageResults([]);
  };

  // Instant local frontend filtering of active conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim() || searchTab !== 'chats') return true;
    const q = searchQuery.trim().toLowerCase();

    if (conv.type === 'group') {
      return conv.groupName?.toLowerCase().includes(q);
    }

    const recipient = conv.participants?.find(
      (p) => p._id.toString() !== currentUser._id.toString()
    ) || {};

    return (
      recipient.name?.toLowerCase().includes(q) ||
      recipient.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)'
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)'
      }}>
        <div
          onClick={onOpenProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Click to edit profile"
        >
          <img
            src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
            alt={currentUser.name}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--accent-primary)'
            }}
          />
          <div className="sidebar-header-title">
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.name}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              @{currentUser.username}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onOpenCreateGroup}
            title="Create New Group"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Users size={20} />
          </button>

          <button
            onClick={handleRequestNotifPermission}
            title={
              notifPermission === 'granted'
                ? 'Notifications Enabled'
                : notifPermission === 'denied'
                ? 'Notifications Blocked in Browser Settings'
                : 'Enable Browser Notifications'
            }
            style={{
              background: 'transparent',
              border: 'none',
              color: notifPermission === 'granted' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)'
            }}
          >
            {notifPermission === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
          </button>

          <button
            onClick={onOpenProfile}
            title="Edit Profile Settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={onLogout}
            title="Logout"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search Input Bar & Mode Selector */}
      <div style={{ padding: '12px 16px 8px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={
              searchTab === 'chats'
                ? 'Filter conversations...'
                : searchTab === 'messages'
                ? 'Search message text...'
                : 'Search users...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 38px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <X
              size={16}
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            />
          )}
        </div>

        {/* Search Mode Pill Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'chats', label: 'Chats' },
            { id: 'messages', label: 'Messages' },
            { id: 'users', label: 'Users' }
          ].map((tab) => {
            const isActive = searchTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? '600' : '400',
                  border: 'none',
                  background: isActive ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px 8px' }}>
        {/* TAB 1: CHATS (Local Filter) */}
        {searchTab === 'chats' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {searchQuery.trim() ? `Filtered Conversations (${filteredConversations.length})` : 'Conversations'}
            </div>
            {loadingConversations ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  currentUserId={currentUser._id}
                  isSelected={selectedConversation?._id === conv._id}
                  onClick={() => onSelectConversation(conv)}
                />
              ))
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <MessageSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>{searchQuery.trim() ? `No chats matching "${searchQuery}"` : 'No active chats yet.'}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MESSAGES (Global Message Search) */}
        {searchTab === 'messages' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Message Search Results
            </div>
            {!searchQuery.trim() ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Type a keyword above to search text messages across all your chats.
              </div>
            ) : isSearchingMessages ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Searching message history...
              </div>
            ) : messageResults.length > 0 ? (
              messageResults.map((msg) => {
                const isGroup = msg.conversation?.type === 'group';
                const convTitle = isGroup
                  ? msg.conversation?.groupName || 'Group'
                  : msg.sender?.name || msg.sender?.username || 'Chat';

                return (
                  <div
                    key={msg._id}
                    onClick={() => handleSelectMessageResult(msg)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: 'var(--bg-primary)',
                      marginBottom: '6px',
                      border: '1px solid var(--border-color)',
                      transition: 'border-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--accent-primary)' }}>
                        {convTitle}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatConversationTime(msg.createdAt)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                        {msg.sender?.name || msg.sender?.username}:
                      </span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {msg.content}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No messages found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS (User Search) */}
        {searchTab === 'users' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              User Search Results
            </div>
            {!searchQuery.trim() ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Type a name or username above to search for people.
              </div>
            ) : isSearchingUsers ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Searching users...
              </div>
            ) : userResults.length > 0 ? (
              userResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)'
                  }}
                  className="search-result-item"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.name}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--accent-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{user.username}
                    </div>
                    {user.bio && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {user.bio}
                      </div>
                    )}
                  </div>
                  <UserPlus size={18} color="var(--accent-primary)" />
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
