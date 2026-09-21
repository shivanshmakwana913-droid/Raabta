import { useState, useEffect, useRef } from 'react';
import { X, Mail, Smile, Image, AlertCircle, CheckCircle2, Save, RefreshCw, AtSign, Camera } from 'lucide-react';
import api, { getMediaUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RaabtaLoader } from '../common/RaabtaLoader';

const ProfileModal = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const avatarFileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Username availability checking states
  const [usernameStatus, setUsernameStatus] = useState('available'); // 'available' | 'unavailable' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('Current username');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  // Debounced username validation & availability check
  useEffect(() => {
    const trimmed = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    // If unchanged from current user's username
    if (user?.username && trimmed.toLowerCase() === user.username.toLowerCase()) {
      setUsernameStatus('available');
      setUsernameMessage('Current username');
      setIsCheckingUsername(false);
      return;
    }

    if (!trimmed) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username is required');
      setIsCheckingUsername(false);
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameStatus('invalid');
      setUsernameMessage('Must be 3 to 20 characters');
      setIsCheckingUsername(false);
      return;
    }

    if (!usernameRegex.test(trimmed)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Only letters, numbers & underscores allowed');
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/check-username?username=${encodeURIComponent(trimmed)}`);
        setUsernameStatus(data.status);
        setUsernameMessage(data.message);
      } catch (err) {
        setUsernameStatus('invalid');
        setUsernameMessage(err.response?.data?.message || err.message || 'Could not verify username');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  // Upload Avatar File from device
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setErrorMessage('');
      const formData = new FormData();
      formData.append('avatar', file);

      const { data } = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAvatar(data.avatar);
      if (data.user) {
        setUser(data.user);
      }
      setSuccessMessage('Profile photo uploaded!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Preset dicebear avatar generator
  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    if (usernameStatus === 'invalid' || usernameStatus === 'unavailable' || isCheckingUsername) {
      setErrorMessage(usernameMessage || 'Please choose a valid & available username');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data } = await api.put('/users/profile', {
        name,
        username,
        bio,
        avatar
      });

      setUser(data.user);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSaveDisabled =
    isSubmitting ||
    isCheckingUsername ||
    usernameStatus === 'invalid' ||
    usernameStatus === 'unavailable';

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
      zIndex: 1000
    }}>
      <div className="glass-panel glass-modal-content animate-slide-up" style={{
        width: '100%',
        maxWidth: '480px',
        borderRadius: '28px',
        padding: '30px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Edit Profile
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="action-icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="animate-fade-in" style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '14px',
            marginBottom: '18px',
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
          <div className="animate-fade-in" style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar Preview & URL */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={getMediaUrl(avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'user'}`}
                alt="Avatar Preview"
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-primary)',
                  boxShadow: '0 4px 16px var(--accent-glow)'
                }}
              />
              <input
                type="file"
                ref={avatarFileInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Upload Profile Photo from device"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '-4px',
                  background: 'var(--accent-gradient)',
                  border: '2px solid var(--bg-surface)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Camera size={15} />
              </button>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                title="Generate Random Avatar"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '-4px',
                  background: 'var(--bg-card)',
                  border: '2px solid var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            {isUploadingAvatar && (
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Uploading profile photo...
              </span>
            )}

            <div style={{ width: '100%', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Avatar Image URL
              </label>
              <div style={{ position: 'relative' }}>
                <Image size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <Smile size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Username (@)
              </label>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: '600',
                color: isCheckingUsername
                  ? 'var(--text-muted)'
                  : usernameStatus === 'available'
                  ? '#10b981'
                  : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isCheckingUsername ? (
                  <RaabtaLoader variant="button" />
                ) : usernameStatus === 'available' ? (
                  <>✓ {usernameMessage}</>
                ) : (
                  <>✗ {usernameMessage}</>
                )}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <AtSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'var(--bg-input)',
                  border: `1px solid ${
                    isCheckingUsername
                      ? 'var(--border-color)'
                      : usernameStatus === 'available'
                      ? 'rgba(16, 185, 129, 0.5)'
                      : 'rgba(239, 68, 68, 0.5)'
                  }`,
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address (Read-Only)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  cursor: 'not-allowed'
                }}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Bio ({bio.length}/200)
            </label>
            <textarea
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
              disabled={isSaveDisabled}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '12px',
                opacity: isSaveDisabled ? 0.6 : 1,
                cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? <RaabtaLoader variant="button" /> : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
