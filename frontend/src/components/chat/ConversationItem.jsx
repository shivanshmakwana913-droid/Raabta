import { formatConversationTime } from '../../utils/dateFormatter';
import { Image as ImageIcon, Users, Mic } from 'lucide-react';

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

    if (lastMessage.isDeleted) {
      return <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Message deleted</span>;
    }

    if (lastMessage.messageType === 'audio') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {prefix}<Mic size={13} style={{ verticalAlign: 'middle' }} /> <span style={{ fontWeight: '600' }}>Voice message</span>
        </span>
      );
    }

    if (lastMessage.messageType === 'gif') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {prefix}<span style={{ fontWeight: '700', fontSize: '0.75rem', background: 'var(--accent-glow)', color: 'var(--accent-primary)', padding: '1px 5px', borderRadius: '4px' }}>GIF</span> {lastMessage.content && lastMessage.content !== 'GIF' ? lastMessage.content : ''}
        </span>
      );
    }

    if (lastMessage.messageType === 'sticker') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {prefix}<span style={{ fontWeight: '700', fontSize: '0.75rem', color: '#ec4899' }}>[Sticker]</span> {lastMessage.content && lastMessage.content !== 'Sticker' ? lastMessage.content : ''}
        </span>
      );
    }

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
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
        transition: 'all var(--transition-fast)',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        marginBottom: '2px'
      }}
      className={`conversation-item ${isSelected ? 'active' : ''}`}
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
              bottom: '1px',
              right: '1px',
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--status-online)' : 'var(--status-offline)',
              border: '2.5px solid var(--bg-secondary)',
              boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
            }}
          />
        )}
        {isGroup && (
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              border: '2px solid var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}
          >
            <Users size={9} />
          </span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <h4 style={{
            fontSize: '0.94rem',
            fontWeight: unreadCount > 0 ? '800' : '600',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {displayName}
          </h4>
          <span style={{ fontSize: '0.74rem', color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: unreadCount > 0 ? '700' : '500', flexShrink: 0 }}>
            {formatConversationTime(conversation.updatedAt)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '0.84rem',
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
              fontWeight: '800',
              padding: '3px 9px',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0,
              boxShadow: '0 2px 8px var(--accent-glow)'
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
