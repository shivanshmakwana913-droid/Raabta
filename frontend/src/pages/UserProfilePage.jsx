import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, User, Calendar, ShieldCheck, AlertCircle, Flag, Share2, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { formatLastSeen } from '../utils/dateFormatter';
import ReportModal from '../components/report/ReportModal';
import { RaabtaLoader } from '../components/common/RaabtaLoader';

const UserProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMessaging, setIsMessaging] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    const fetchPublicProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/users/profile/${encodeURIComponent(username)}`);
        setProfileUser(data.user);
      } catch (err) {
        setError(err.response?.data?.message || 'User profile not found');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  const handleMessageUser = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser._id === profileUser._id) {
      navigate('/');
      return;
    }

    try {
      setIsMessaging(true);
      await api.post('/conversations', {
        targetUserId: profileUser._id
      });
      navigate('/');
    } catch (err) {
      console.error('[Start Conversation Error]:', err.message);
      navigate('/');
    } finally {
      setIsMessaging(false);
    }
  };

  const handleShareProfile = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `${profileUser.name} on Raabta`,
      text: `Connect with @${profileUser.username} on Raabta!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          showToast('Profile link copied');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Profile link copied');
    }
  };

  const handleCopyUsername = async () => {
    await navigator.clipboard.writeText(`@${profileUser.username}`);
    showToast('Username copied');
  };

  const isSelf = currentUser && profileUser && currentUser._id === profileUser._id;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px 16px',
      background: 'radial-gradient(circle at top center, #1e1b4b 0%, #0b0f19 70%)',
      position: 'relative'
    }}>
      <div className="glass-panel animate-slide-up" style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: '28px',
        padding: '32px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative'
      }}>
        {/* Toast Notification Banner */}
        {toastMsg && (
          <div className="animate-fade-in" style={{
            position: 'absolute',
            top: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent-gradient)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: '700',
            boxShadow: '0 8px 24px var(--accent-glow)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Check size={14} /> {toastMsg}
          </div>
        )}

        {/* Back Link & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.84rem'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {profileUser && (
              <button
                onClick={handleShareProfile}
                title="Share Profile"
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82rem'
                }}
              >
                <Share2 size={15} /> Share
              </button>
            )}

            {!isSelf && currentUser && profileUser && (
              <button
                onClick={() => setIsReportOpen(true)}
                title="Report User Profile"
                className="action-icon-btn"
                style={{ color: '#f87171' }}
              >
                <Flag size={17} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <RaabtaLoader message="Loading public profile..." />
          </div>
        ) : error || !profileUser ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              marginBottom: '16px'
            }}>
              <AlertCircle size={36} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              User Not Found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              The profile for @{username} does not exist or has been removed.
            </p>
            <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', padding: '10px 20px', borderRadius: '12px' }}>
              Return to Home
            </Link>
          </div>
        ) : (
          <div>
            {/* Profile Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <img
                  src={profileUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profileUser.username}`}
                  alt={profileUser.name}
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--accent-primary)',
                    boxShadow: '0 6px 20px var(--accent-glow)'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: profileUser.isOnline ? 'var(--status-online)' : 'var(--text-muted)',
                    border: '2.5px solid var(--bg-secondary)',
                    boxShadow: profileUser.isOnline ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
                  }}
                  title={profileUser.isOnline ? 'Online' : 'Offline'}
                />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                {profileUser.name}
              </h2>
              <div
                onClick={handleCopyUsername}
                title="Click to copy username"
                style={{
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  color: 'var(--accent-primary)',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                @{profileUser.username} <Copy size={13} />
              </div>

              {/* Status Indicator */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: profileUser.isOnline ? 'var(--status-online)' : 'var(--text-muted)'
                }} />
                {profileUser.isOnline ? 'Online Now' : profileUser.lastSeen ? `Last seen ${formatLastSeen(profileUser.lastSeen)}` : 'Offline'}
              </div>
            </div>

            {/* Bio Card */}
            {profileUser.bio && (
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '18px',
                padding: '16px 20px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                  About
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {profileUser.bio}
                </p>
              </div>
            )}

            {/* Meta Stats */}
            <div style={{
              display: 'flex',
              justify: 'space-around',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '18px',
              padding: '14px 16px',
              marginBottom: '24px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--accent-primary)" />
                <span>Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} color="var(--accent-primary)" />
                <span>Verified Member</span>
              </div>
            </div>

            {/* Message Action Button */}
            <button
              onClick={handleMessageUser}
              disabled={isMessaging}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem'
              }}
            >
              {isMessaging ? (
                <RaabtaLoader variant="button" />
              ) : isSelf ? (
                <>
                  <User size={18} /> Back to My Chats
                </>
              ) : (
                <>
                  <Send size={18} /> Message @{profileUser.username}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {isReportOpen && profileUser && (
        <ReportModal
          targetUser={profileUser}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
