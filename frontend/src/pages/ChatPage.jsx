import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import EmptyState from '../components/chat/EmptyState';
import SettingsModal from '../components/settings/SettingsModal';
import ReportModal from '../components/report/ReportModal';
import CreateGroupModal from '../components/group/CreateGroupModal';
import NotificationToast from '../components/chat/NotificationToast';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Settings & Report Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // { user, message }

  const [toasts, setToasts] = useState([]);

  // Fetch initial user conversations
  useEffect(() => {
    let isMounted = true;
    const fetchUserConversations = async () => {
      setLoadingConversations(true);
      try {
        const { data } = await api.get('/conversations');
        if (isMounted) {
          setConversations(data || []);
        }
      } catch (err) {
        console.error('[Fetch Conversations Error]:', err.message);
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    };

    fetchUserConversations();
    return () => { isMounted = false; };
  }, []);

  const handleCloseToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSelectToast = (toast) => {
    const targetConv = conversations.find((c) => c._id.toString() === toast.conversationId.toString());
    if (targetConv) {
      setSelectedConversation(targetConv);
      handleMarkConversationSeen(targetConv._id);
      if (socket) {
        socket.emit('mark_messages_seen', { conversationId: targetConv._id });
      }
    }
    handleCloseToast(toast.id);
    if (typeof window !== 'undefined') {
      window.focus();
    }
  };

  // Listen for socket online/offline updates, new messages & read status
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) =>
            p._id.toString() === data.userId.toString() ? { ...p, isOnline: true } : p
          )
        }))
      );

      setSelectedConversation((prevSelected) => {
        if (!prevSelected) return null;
        const updatedParticipants = prevSelected.participants.map((p) =>
          p._id.toString() === data.userId.toString() ? { ...p, isOnline: true } : p
        );
        return { ...prevSelected, participants: updatedParticipants };
      });
    };

    const handleUserOffline = (data) => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) =>
            p._id.toString() === data.userId.toString()
              ? { ...p, isOnline: false, lastSeen: data.lastSeen }
              : p
          )
        }))
      );

      setSelectedConversation((prevSelected) => {
        if (!prevSelected) return null;
        const updatedParticipants = prevSelected.participants.map((p) =>
          p._id.toString() === data.userId.toString()
            ? { ...p, isOnline: false, lastSeen: data.lastSeen }
            : p
        );
        return { ...prevSelected, participants: updatedParticipants };
      });
    };

    const handleNewMessage = (newMessage) => {
      const convId = newMessage.conversation.toString();
      const senderId = (newMessage.sender?._id || newMessage.sender).toString();
      const isFromOtherUser = senderId !== user._id.toString();

      setConversations((prev) => {
        const targetConv = prev.find((c) => c._id.toString() === convId);
        const isCurrentlySelected = selectedConversation?._id?.toString() === convId;
        const isAppHidden = typeof document !== 'undefined' && document.hidden;

        // Trigger In-App Toast & Native Notification if from another user and not currently active in view
        if (isFromOtherUser && (!isCurrentlySelected || isAppHidden)) {
          const senderName = newMessage.sender?.name || newMessage.sender?.username || 'Someone';
          const isGroupConv = targetConv?.type === 'group';
          const title = isGroupConv
            ? `${senderName} in ${targetConv?.groupName || 'Group'}`
            : senderName;

          let preview = '';
          if (newMessage.isDeleted) {
            preview = 'This message was deleted.';
          } else if (newMessage.messageType === 'image') {
            preview = '[Image]';
          } else {
            preview = newMessage.content?.length > 50
              ? `${newMessage.content.substring(0, 50)}...`
              : newMessage.content || 'New message';
          }

          const avatar = isGroupConv
            ? targetConv?.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(targetConv?.groupName || 'Group')}`
            : newMessage.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${newMessage.sender?.username || 'user'}`;

          const toastId = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const newToast = {
            id: toastId,
            conversationId: convId,
            title,
            preview,
            avatar
          };

          // Limit visible in-app toasts to maximum 3
          setToasts((currentToasts) => [...currentToasts.slice(-2), newToast]);

          // Auto dismiss after 4 seconds
          setTimeout(() => {
            handleCloseToast(toastId);
          }, 4000);

          // Native Browser Notification API if permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification(title, {
                body: preview,
                icon: avatar
              });
              notif.onclick = () => {
                window.focus();
                if (targetConv) {
                  setSelectedConversation(targetConv);
                  handleMarkConversationSeen(targetConv._id);
                }
                notif.close();
              };
            } catch (nErr) {
              console.error('[Native Notification Error]:', nErr);
            }
          }
        }

        return prev.map((conv) => {
          if (conv._id.toString() === convId) {
            const currentUnread = conv.unreadCount || 0;
            const newUnread = isFromOtherUser && (!isCurrentlySelected || isAppHidden) ? currentUnread + 1 : 0;

            return {
              ...conv,
              lastMessage: newMessage,
              unreadCount: newUnread,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const handleMessagesSeen = (data) => {
      const convId = data.conversationId;
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id.toString() === convId.toString()
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('new_message', handleNewMessage);
    socket.on('messages_seen', handleMessagesSeen);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('new_message', handleNewMessage);
      socket.off('messages_seen', handleMessagesSeen);
    };
  }, [socket, user._id, selectedConversation?._id]);

  const handleUpdateLastMessage = (conversationId, newMessage) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv._id.toString() === conversationId.toString()) {
          return {
            ...conv,
            lastMessage: newMessage,
            updatedAt: new Date().toISOString()
          };
        }
        return conv;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  const handleMarkConversationSeen = (conversationId) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id.toString() === conversationId.toString()
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleConversationCreated = (newConversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === newConversation._id);
      if (exists) return prev;
      return [newConversation, ...prev];
    });
  };

  const handleGroupUpdated = (updatedGroup) => {
    setConversations((prev) =>
      prev.map((c) => (c._id.toString() === updatedGroup._id.toString() ? updatedGroup : c))
    );
    if (selectedConversation?._id?.toString() === updatedGroup._id.toString()) {
      setSelectedConversation(updatedGroup);
    }
  };

  const handleSelectConversation = (conv) => {
    if (!conv) return;
    setSelectedConversation(conv);
    setConversations((prev) => {
      const exists = prev.some((c) => c._id.toString() === conv._id?.toString());
      if (exists) return prev;
      return [conv, ...prev];
    });
  };

  return (
    <div className="chat-container" style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--bg-primary)'
    }}>
      {/* Reconnecting banner if socket disconnects */}
      {!isConnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#d97706',
          color: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: '600',
          textAlign: 'center',
          padding: '4px 12px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span className="animate-pulse" style={{ fontSize: '1rem' }}>●</span>
          Reconnecting to real-time chat service...
        </div>
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${selectedConversation ? 'mobile-hidden' : 'mobile-visible'}`} style={{
        width: '360px',
        flexShrink: 0,
        height: '100%'
      }}>
        <Sidebar
          currentUser={user}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onLogout={logout}
          onConversationCreated={handleConversationCreated}
          onOpenProfile={() => setIsSettingsOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          loadingConversations={loadingConversations}
        />
      </div>

      {/* Main Chat Window */}
      <div className={`chat-wrapper ${selectedConversation ? 'mobile-visible' : 'mobile-hidden'}`} style={{
        flex: 1,
        height: '100%'
      }}>
        {selectedConversation ? (
          <ChatWindow
            key={selectedConversation._id}
            conversation={selectedConversation}
            currentUser={user}
            onBackMobile={() => setSelectedConversation(null)}
            onUpdateLastMessage={handleUpdateLastMessage}
            onMarkConversationSeen={handleMarkConversationSeen}
            onGroupUpdated={handleGroupUpdated}
            onRequestReport={(target) => setReportTarget(target)}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* In-App Toast Notifications */}
      <NotificationToast
        toasts={toasts}
        onSelectToast={handleSelectToast}
        onCloseToast={handleCloseToast}
      />

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {reportTarget && (
        <ReportModal
          targetUser={reportTarget.user}
          targetMessage={reportTarget.message || null}
          onClose={() => setReportTarget(null)}
        />
      )}

      {isCreateGroupOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateGroupOpen(false)}
          onGroupCreated={handleConversationCreated}
          onSelectConversation={setSelectedConversation}
        />
      )}
    </div>
  );
};

export default ChatPage;
