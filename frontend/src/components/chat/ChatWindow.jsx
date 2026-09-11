import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Loader2, Check, CheckCheck, Image as ImageIcon, X, Info, Reply, Edit3, Trash2, Smile, CornerUpLeft, ChevronDown, Flag } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { formatTime, formatLastSeen } from '../../utils/dateFormatter';
import GroupInfoModal from '../group/GroupInfoModal';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ChatWindow = ({ conversation, currentUser, onBackMobile, onUpdateLastMessage, onMarkConversationSeen, onGroupUpdated, onRequestReport }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Phase 9 States: Reply, Edit, React
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState(null);
  const [activeActionMenuMsgId, setActiveActionMenuMsgId] = useState(null);

  // Image Attachment state
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Lightbox full image preview modal
  const [fullImageViewUrl, setFullImageViewUrl] = useState(null);

  // Scroll experience states & refs
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);

  const { socket } = useSocket();
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const isGroup = conversation.type === 'group';

  // Recipient for 1-on-1 direct chat
  const recipient = isGroup
    ? null
    : conversation.participants?.find(
        (p) => p._id.toString() !== currentUser._id.toString()
      ) || conversation.participants?.[0] || {};

  const headerName = isGroup ? conversation.groupName || 'Group Chat' : recipient?.name || recipient?.username;
  const headerAvatar = isGroup
    ? conversation.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(headerName)}`
    : recipient?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipient?.username || 'user'}`;

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll event handler to track distance from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isScrolledUp = distanceFromBottom > 150;
    setShowScrollBottomBtn(isScrolledUp);
    isUserScrolledUpRef.current = isScrolledUp;
  };

  // Keyboard shortcut listener (Escape to cancel edit/reply/popups)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullImageViewUrl) setFullImageViewUrl(null);
        else if (activeReactionMenuMsgId) setActiveReactionMenuMsgId(null);
        else if (editingMessage) handleCancelEdit();
        else if (replyingToMessage) setReplyingToMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullImageViewUrl, activeReactionMenuMsgId, editingMessage, replyingToMessage]);

  // Lock body scroll when image lightbox is open
  useEffect(() => {
    if (fullImageViewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullImageViewUrl]);

  // Initial load scroll
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [conversation._id]);

  // Smart auto scroll on message updates
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length, typingUsers, imagePreviewUrl, replyingToMessage, editingMessage]);

  // Fetch message history & setup Socket room
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/${conversation._id}`);
        if (isMounted) {
          setMessages(data.messages || []);
        }

        await api.post('/messages/mark-seen', { conversationId: conversation._id });
        if (onMarkConversationSeen) {
          onMarkConversationSeen(conversation._id);
        }
      } catch (err) {
        console.error('[Fetch Messages Error]:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('join_conversation', { conversationId: conversation._id });
      socket.emit('mark_messages_seen', { conversationId: conversation._id });

      const handleReconnect = () => {
        socket.emit('join_conversation', { conversationId: conversation._id });
        socket.emit('mark_messages_seen', { conversationId: conversation._id });
      };

      socket.on('connect', handleReconnect);

      return () => {
        isMounted = false;
        socket.off('connect', handleReconnect);
        socket.emit('leave_conversation', { conversationId: conversation._id });
      };
    }

    return () => {
      isMounted = false;
    };
  }, [conversation._id, socket]);

  // Socket event listeners for real-time messages, updates, edits, deletes, and reactions
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (newMessage.conversation.toString() === conversation._id.toString()) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });

        socket.emit('mark_messages_seen', { conversationId: conversation._id });
        if (onMarkConversationSeen) {
          onMarkConversationSeen(conversation._id);
        }

        if (onUpdateLastMessage) {
          onUpdateLastMessage(conversation._id, newMessage);
        }
      }
    };

    const handleMessageUpdated = (updatedMsg) => {
      if (updatedMsg.conversation.toString() === conversation._id.toString()) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
        );
      }
    };

    const handleMessageDeleted = (deletedMsg) => {
      if (deletedMsg.conversation.toString() === conversation._id.toString()) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === deletedMsg._id ? deletedMsg : msg))
        );
      }
    };

    const handleMessageReactionUpdated = (reactedMsg) => {
      if (reactedMsg.conversation.toString() === conversation._id.toString()) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === reactedMsg._id ? reactedMsg : msg))
        );
      }
    };

    const handleMessagesSeen = (data) => {
      if (data.conversationId === conversation._id) {
        const seenTime = data.seenAt || new Date().toISOString();
        setMessages((prev) =>
          prev.map((msg) =>
            (msg.sender?._id || msg.sender).toString() === currentUser._id.toString()
              ? { ...msg, seenAt: msg.seenAt || seenTime, deliveredAt: msg.deliveredAt || seenTime }
              : msg
          )
        );
      }
    };

    const handleUserTyping = (data) => {
      if (data.conversationId === conversation._id && data.userId !== currentUser._id) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.username || 'Someone'
        }));
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.conversationId === conversation._id && data.userId !== currentUser._id) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reaction_updated', handleMessageReactionUpdated);
    socket.on('messages_seen', handleMessagesSeen);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reaction_updated', handleMessageReactionUpdated);
      socket.off('messages_seen', handleMessagesSeen);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [socket, conversation._id, currentUser._id, onUpdateLastMessage, onMarkConversationSeen]);

  // Handle Image File selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setUploadError('');

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are supported');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleClearSelectedImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket) {
      socket.emit('typing_start', { conversationId: conversation._id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: conversation._id });
      }, 1500);
    }
  };

  // Submit Message (New, Reply, or Edit)
  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (editingMessage) {
      if (!inputText.trim()) return;
      const textToUpdate = inputText.trim();

      if (socket) {
        socket.emit('edit_message', {
          messageId: editingMessage._id,
          content: textToUpdate
        });
      } else {
        try {
          const { data } = await api.put(`/messages/${editingMessage._id}`, { content: textToUpdate });
          setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
        } catch (err) {
          console.error('[Edit Message Error]:', err.message);
        }
      }

      handleCancelEdit();
      return;
    }

    if (!inputText.trim() && !selectedImageFile) return;

    let imageUrl = null;
    let imagePublicId = null;
    let messageType = 'text';

    if (selectedImageFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedImageFile);

        const { data } = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        imageUrl = data.url;
        imagePublicId = data.publicId;
        messageType = 'image';
      } catch (err) {
        setUploadError(err.response?.data?.message || 'Failed to upload image. Please try again.');
        setIsUploading(false);
        return;
      }
    }

    const payload = {
      conversationId: conversation._id,
      content: inputText.trim(),
      messageType,
      imageUrl,
      imagePublicId,
      replyTo: replyingToMessage?._id || null
    };

    if (socket) {
      socket.emit('send_message', payload, (res) => {
        if (res && res.status === 'ok') {
          if (onUpdateLastMessage) onUpdateLastMessage(conversation._id, res.data);
        }
      });
      setInputText('');
      setReplyingToMessage(null);
      handleClearSelectedImage();
      setIsUploading(false);
      isUserScrolledUpRef.current = false;
      scrollToBottom('smooth');
    } else {
      try {
        const { data } = await api.post('/messages', payload);
        setMessages((prev) => [...prev, data]);
        if (onUpdateLastMessage) onUpdateLastMessage(conversation._id, data);
        setInputText('');
        setReplyingToMessage(null);
        handleClearSelectedImage();
        isUserScrolledUpRef.current = false;
        scrollToBottom('smooth');
      } catch (err) {
        console.error('[Send Message REST Error]:', err.message);
        setUploadError('Failed to send message.');
      } finally {
        setIsUploading(false);
      }
    }

    if (socket) {
      socket.emit('typing_stop', { conversationId: conversation._id });
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setReplyingToMessage(null);
    setInputText(msg.content || '');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = (msg) => {
    if (socket) {
      socket.emit('delete_message', { messageId: msg._id });
    } else {
      api.delete(`/messages/${msg._id}`).catch((err) => console.error(err));
    }
  };

  const handleToggleReaction = (msgId, emoji) => {
    setActiveReactionMenuMsgId(null);
    if (socket) {
      socket.emit('react_to_message', { messageId: msgId, emoji });
    } else {
      api.post(`/messages/${msgId}/react`, { emoji }).catch((err) => console.error(err));
    }
  };

  const renderStatusTicks = (msg) => {
    const isMe = (msg.sender?._id || msg.sender).toString() === currentUser._id.toString();
    if (!isMe) return null;

    if (msg.seenAt) {
      return <CheckCheck size={15} color="#38bdf8" title="Seen" style={{ display: 'inline', marginLeft: '4px' }} />;
    }
    if (msg.deliveredAt) {
      return <CheckCheck size={15} color="var(--text-muted)" title="Delivered" style={{ display: 'inline', marginLeft: '4px' }} />;
    }
    return <Check size={15} color="var(--text-muted)" title="Sent" style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  const renderTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(', ')} are typing...`;
  };

  const getReactionCounts = (reactionsArr = []) => {
    const counts = {};
    reactionsArr.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-primary)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10
      }}>
        <button
          onClick={onBackMobile}
          aria-label="Back to conversations"
          title="Back to conversations"
          className="mobile-back-btn"
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%'
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={headerAvatar}
            alt={headerName}
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
          />
          {!isGroup && (
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              backgroundColor: recipient?.isOnline ? 'var(--status-online)' : 'var(--status-offline)',
              border: '2px solid var(--bg-secondary)'
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {headerName}
          </h3>
          <div style={{ fontSize: '0.78rem', color: renderTypingText() ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
            {renderTypingText() ? (
              <span className="animate-pulse" style={{ fontWeight: '500' }}>{renderTypingText()}</span>
            ) : isGroup ? (
              <span>{conversation.participants?.length || 0} members</span>
            ) : (
              <span>{recipient?.isOnline ? 'Online' : formatLastSeen(recipient?.lastSeen)}</span>
            )}
          </div>
        </div>

        {!isGroup && recipient && onRequestReport && (
          <button
            onClick={() => onRequestReport({ user: recipient, message: null })}
            aria-label="Report user"
            title="Report User"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%'
            }}
          >
            <Flag size={18} />
          </button>
        )}

        {isGroup && (
          <button
            onClick={() => setIsGroupInfoOpen(true)}
            aria-label="Group details"
            title="Group details"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%'
            }}
          >
            <Info size={20} />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onClick={() => {
          setActiveActionMenuMsgId(null);
          setActiveReactionMenuMsgId(null);
        }}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-pulse" size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = (msg.sender?._id || msg.sender).toString() === currentUser._id.toString();
            const isImageMsg = msg.messageType === 'image';
            const isDeleted = msg.isDeleted;
            const reactionCounts = getReactionCounts(msg.reactions);
            const myReaction = msg.reactions?.find((r) => (r.user?._id || r.user)?.toString() === currentUser._id.toString());

            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSenderAsPrev = prevMsg && !prevMsg.isDeleted &&
              (prevMsg.sender?._id || prevMsg.sender)?.toString() === (msg.sender?._id || msg.sender)?.toString();

            const marginTop = isSameSenderAsPrev ? '3px' : '12px';

            return (
              <div
                key={msg._id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  position: 'relative',
                  marginTop
                }}
                className={`message-row ${activeActionMenuMsgId === msg._id ? 'show-actions' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDeleted) {
                    setActiveActionMenuMsgId((prev) => (prev === msg._id ? null : msg._id));
                  }
                }}
              >
                {/* Sender Name in Group Chat */}
                {!isMe && isGroup && !isDeleted && !isSameSenderAsPrev && (
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '3px', paddingLeft: '4px' }}>
                    {msg.sender?.name || msg.sender?.username || 'User'}
                  </span>
                )}

                {/* Message Bubble Box */}
                <div
                  className="message-bubble-wrapper"
                  style={{
                    position: 'relative'
                  }}
                >
                  {/* Action Menu Trigger Popover */}
                  {!isDeleted && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-32px',
                        right: isMe ? '0' : 'auto',
                        left: isMe ? 'auto' : '0',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '20px',
                        padding: '2px 6px',
                        display: 'flex',
                        gap: '4px',
                        zIndex: 10,
                        boxShadow: 'var(--shadow-md)'
                      }}
                      className="message-actions-bar"
                    >
                      <button
                        onClick={() => {
                          setReplyingToMessage(msg);
                          setEditingMessage(null);
                        }}
                        aria-label="Reply to message"
                        title="Reply"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Reply size={14} />
                      </button>

                      <button
                        onClick={() => setActiveReactionMenuMsgId(activeReactionMenuMsgId === msg._id ? null : msg._id)}
                        aria-label="React to message"
                        title="React"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Smile size={14} />
                      </button>

                      {isMe && !isImageMsg && (
                        <button
                          onClick={() => handleStartEdit(msg)}
                          aria-label="Edit message"
                          title="Edit Message"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          aria-label="Delete message"
                          title="Delete for Everyone"
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {!isMe && onRequestReport && (
                        <button
                          onClick={() => onRequestReport({ user: msg.sender, message: msg })}
                          aria-label="Report message"
                          title="Report Message"
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Emoji Quick Picker Dropdown */}
                  {activeReactionMenuMsgId === msg._id && !isDeleted && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-44px',
                        right: isMe ? '0' : 'auto',
                        left: isMe ? 'auto' : '0',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '24px',
                        padding: '4px 10px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 20,
                        boxShadow: 'var(--shadow-lg)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      {ALLOWED_EMOJIS.map((emoji) => (
                        <span
                          key={emoji}
                          onClick={() => handleToggleReaction(msg._id, emoji)}
                          style={{
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '2px',
                            transition: 'transform 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div
                    style={{
                      background: isDeleted
                        ? 'var(--bg-secondary)'
                        : isMe
                        ? 'var(--accent-gradient)'
                        : 'var(--bg-secondary)',
                      color: isMe ? '#ffffff' : 'var(--text-primary)',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      padding: isImageMsg && !isDeleted ? '4px' : '10px 14px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: 'var(--shadow-sm)',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {/* Replying Quote Banner */}
                    {msg.replyTo && !isDeleted && (
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderLeft: '3px solid var(--accent-primary)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          marginBottom: '8px',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: isMe ? '#e0e7ff' : 'var(--accent-primary)' }}>
                          {msg.replyTo.sender?.name || msg.replyTo.sender?.username || 'Replying to message'}
                        </div>
                        <div style={{ color: isMe ? '#f1f5f9' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.replyTo.isDeleted
                            ? 'This message was deleted'
                            : msg.replyTo.messageType === 'image'
                            ? '[Image]'
                            : msg.replyTo.content}
                        </div>
                      </div>
                    )}

                    {/* Deleted Message Placeholder */}
                    {isDeleted ? (
                      <span style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        This message was deleted.
                      </span>
                    ) : isImageMsg ? (
                      /* Image Message View */
                      <div style={{ borderRadius: '14px', overflow: 'hidden', cursor: 'pointer' }}>
                        <img
                          src={msg.imageUrl}
                          alt="Shared attachment"
                          onClick={() => setFullImageViewUrl(msg.imageUrl)}
                          style={{
                            width: '100%',
                            maxHeight: '280px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            display: 'block'
                          }}
                        />
                        {msg.content && (
                          <div style={{ padding: '6px 8px 4px 8px', fontSize: '0.9rem', color: isMe ? '#ffffff' : 'var(--text-primary)' }}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Text Message View */
                      <span style={{ fontSize: '0.92rem', lineHeight: '1.4' }}>
                        {msg.content}
                      </span>
                    )}

                    {/* Footer Info: Edited label, Time & Ticks */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '0.7rem',
                        color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)'
                      }}
                    >
                      {msg.editedAt && !isDeleted && (
                        <span style={{ fontStyle: 'italic' }}>edited</span>
                      )}
                      <span>{formatTime(msg.createdAt)}</span>
                      {!isDeleted && renderStatusTicks(msg)}
                    </div>
                  </div>

                  {/* Reaction Pill Counters */}
                  {Object.keys(reactionCounts).length > 0 && !isDeleted && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginTop: '4px',
                        justifyContent: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {Object.entries(reactionCounts).map(([emoji, count]) => {
                        const isMyReactionEmoji = myReaction?.emoji === emoji;
                        return (
                          <span
                            key={emoji}
                            onClick={() => handleToggleReaction(msg._id, emoji)}
                            style={{
                              background: isMyReactionEmoji ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                              border: `1px solid ${isMyReactionEmoji ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                              borderRadius: '12px',
                              padding: '2px 6px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <span>{emoji}</span>
                            <span style={{ fontWeight: '600', color: isMyReactionEmoji ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                              {count}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom('smooth')}
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
          style={{
            position: 'absolute',
            bottom: '84px',
            right: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-primary)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 40,
            transition: 'transform 0.2s ease, background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          padding: '8px 16px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <span>{uploadError}</span>
          <X size={16} onClick={() => setUploadError('')} style={{ cursor: 'pointer' }} />
        </div>
      )}

      {/* Replying Preview Banner */}
      {replyingToMessage && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <CornerUpLeft size={16} color="var(--accent-primary)" />
            <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                Replying to {replyingToMessage.sender?.name || replyingToMessage.sender?.username}:
              </span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {replyingToMessage.messageType === 'image' ? '[Image]' : replyingToMessage.content}
              </span>
            </div>
          </div>
          <X size={16} onClick={() => setReplyingToMessage(null)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* Editing Mode Banner */}
      {editingMessage && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--accent-primary)' }}>
              Editing Message
            </span>
          </div>
          <button
            onClick={handleCancelEdit}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Selected Image Preview Container */}
      {imagePreviewUrl && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ position: 'relative' }}>
            <img
              src={imagePreviewUrl}
              alt="Preview"
              style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <button
              onClick={handleClearSelectedImage}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--danger)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={12} />
            </button>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Ready to send image
          </span>
        </div>
      )}

      {/* Input Box / Form */}
      <form
        onSubmit={handleSubmitMessage}
        className="chat-input-container"
        style={{
          padding: '14px 20px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={editingMessage !== null}
          aria-label="Attach image"
          title="Attach Image"
          style={{
            background: 'transparent',
            border: 'none',
            color: selectedImageFile ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: editingMessage ? 0.4 : 1
          }}
        >
          <ImageIcon size={22} />
        </button>

        <input
          type="text"
          placeholder={editingMessage ? "Edit your message..." : selectedImageFile ? "Add an optional caption..." : "Type a message..."}
          value={inputText}
          onChange={handleInputChange}
          disabled={isUploading}
          style={{
            flex: 1,
            padding: '12px 18px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none'
          }}
        />

        <button
          type="submit"
          disabled={isUploading || (!inputText.trim() && !selectedImageFile)}
          className="btn-primary"
          aria-label="Send message"
          title="Send Message"
          style={{
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            padding: 0,
            flexShrink: 0
          }}
        >
          {isUploading ? <Loader2 size={18} className="animate-pulse" /> : <Send size={18} />}
        </button>
      </form>

      {/* Lightbox Modal for Full Image View */}
      {fullImageViewUrl && (
        <div
          onClick={() => setFullImageViewUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <button
            onClick={() => setFullImageViewUrl(null)}
            aria-label="Close image preview"
            title="Close"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={24} />
          </button>
          <img
            src={fullImageViewUrl}
            alt="Full view"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              objectFit: 'contain',
              boxShadow: 'var(--shadow-lg)'
            }}
          />
        </div>
      )}

      {/* Group Info Modal */}
      {isGroupInfoOpen && (
        <GroupInfoModal
          conversation={conversation}
          currentUser={currentUser}
          onClose={() => setIsGroupInfoOpen(false)}
          onGroupUpdated={onGroupUpdated}
        />
      )}
    </div>
  );
};

export default ChatWindow;
