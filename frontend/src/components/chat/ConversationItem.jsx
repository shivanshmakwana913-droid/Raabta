import { formatConversationTime } from '../../utils/dateFormatter';
import { Image as ImageIcon, Users } from 'lucide-react';

const ConversationItem = ({ conversation, currentUserId, isSelected, onClick }) => {
  const isGroup = conversation.type === 'group';

  // Find the other participant in 1-on-1 direct chat
  const otherUser = isGroup
    ? null
    : conversation.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      ) || conversation.participants[0] || {};

  const lastMessage = conversation.lastMessage;
  const isOnline = isGroup ? false : otherUser?.isOnline;
  const unreadCount = conversation.unreadCount || 0;

  const displayName = isGroup
    ? conversation.groupName || 'Group Chat'
    : otherUser?.name || otherUser?.username || 'Unknown User';

  const avatarUrl = isGroup
    ? conversation.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(displayName)}`
    : otherUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser?.username || 'user'}`;

  const renderLastMessagePreview = () => {
    if (!lastMessage) {
      return <span style={{ fontStyle: 'italic', opacity: 0.7 }}>No messages yet</span>;
    }

    const senderId = (lastMessage.sender?._id || lastMessage.sender)?.toString();
    const isMe = senderId === currentUserId.toString();
    const senderName = isMe ? 'You' : lastMessage.sender?.name || lastMessage.sender?.username || 'User';

    const prefix = `${senderName}: `;

    if (lastMessage.messageType === 'image' || lastMessage.imageUrl) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {prefix}<ImageIcon size={14} style={{ verticalAlign: 'middle' }} /> {lastMessage.content || 'Photo'}
        </span>
      );
    }

    return `${prefix}${lastMessage.content}`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
        transition: 'background var(--transition-fast)',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative'
      }}
      className="conversation-item"
    >
      {/* Avatar Container */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            objectFit: 'cover',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)'
          }}
        />
        {!isGroup && (
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--status-online)' : 'var(--status-offline)',
              border: '2px solid var(--bg-secondary)'
            }}
          />
        )}
        {isGroup && (
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              border: '2px solid var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '8px'
            }}
          >
            <Users size={8} />
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <h4 style={{
            fontSize: '0.95rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {displayName}
          </h4>
          <span style={{ fontSize: '0.75rem', color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: unreadCount > 0 ? '600' : '400', flexShrink: 0 }}>
            {formatConversationTime(conversation.updatedAt)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '0.85rem',
            color: unreadCount > 0 ? 'var(--text-primary)' : isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontWeight: unreadCount > 0 ? '600' : '400',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: '8px'
          }}>
            {renderLastMessagePreview()}
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0,
              boxShadow: '0 2px 6px var(--accent-glow)'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
