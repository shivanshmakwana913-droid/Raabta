import { useState, useEffect } from 'react';
import {
  X, User, Lock, Shield, Trash2, Save, RefreshCw, AlertCircle, CheckCircle2,
  Eye, LogOut, UserX, Loader2, AtSign, Smile, Image, Mail, Phone, KeyRound, Check
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SettingsModal = ({ onClose }) => {
  const { user, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'security' | 'privacy' | 'danger'

  // --- Account State ---
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [usernameStatus, setUsernameStatus] = useState('available');
  const [usernameMessage, setUsernameMessage] = useState('Current username');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  // --- Phone Identity State ---
  const [phoneInfo, setPhoneInfo] = useState({
    phoneNumber: null,
    phoneNumberVerified: false,
    phoneNumberVerifiedAt: null
  });
  const [inputPhone, setInputPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState(0); // 0: Idle, 1: OTP Sent
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [phoneDevOtp, setPhoneDevOtp] = useState(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  // --- Security State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  // --- Privacy State ---
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState(user?.privacySettings?.lastSeen || 'everyone');
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState(user?.privacySettings?.onlineStatus || 'everyone');
  const [profilePrivacy, setProfilePrivacy] = useState(user?.privacySettings?.profile || 'everyone');
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [privacySubmitting, setPrivacySubmitting] = useState(false);

  // --- Danger Zone State ---
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Alert Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearAlerts = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch Phone Details on Mount
  useEffect(() => {
    const fetchPhoneDetails = async () => {
      try {
        const { data } = await api.get('/users/me/phone');
        setPhoneInfo(data);
        if (data.phoneNumber) {
          setInputPhone(data.phoneNumber);
        }
      } catch (err) {
        console.error('[Fetch Phone Error]:', err.message);
      }
    };
    fetchPhoneDetails();
  }, []);

  // Phone countdown timer
  useEffect(() => {
    let timer;
    if (phoneCountdown > 0) {
      timer = setInterval(() => {
        setPhoneCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneCountdown]);

  // Fetch Blocked Users when Privacy Tab is selected
  useEffect(() => {
    if (activeTab === 'privacy') {
      const fetchBlocked = async () => {
        setLoadingBlocked(true);
        try {
          const { data } = await api.get('/users/blocked');
          setBlockedUsersList(data.blockedUsers || []);
        } catch (err) {
          console.error('[Fetch Blocked Users Error]:', err.message);
        } finally {
          setLoadingBlocked(false);
        }
      };
      fetchBlocked();
    }
  }, [activeTab]);

  // Debounced Username availability check
  useEffect(() => {
    const trimmed = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (user?.username && trimmed.toLowerCase() === user.username.toLowerCase()) {
      setUsernameStatus('available');
      setUsernameMessage('Current username');
      setIsCheckingUsername(false);
      return;
    }

    if (!trimmed || trimmed.length < 3 || trimmed.length > 20 || !usernameRegex.test(trimmed)) {
      setUsernameStatus('invalid');
      setUsernameMessage('3–20 chars (letters, numbers, underscores)');
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
        setUsernameMessage('Could not check username');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  // --- Handlers ---
  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!name.trim()) {
      setErrorMsg('Full name is required');
      return;
    }

    if (usernameStatus === 'invalid' || usernameStatus === 'unavailable' || isCheckingUsername) {
      setErrorMsg(usernameMessage || 'Please choose a valid & available username');
      return;
    }

    try {
      setAccountSubmitting(true);
      const { data } = await api.put('/users/profile', { name, username, bio, avatar });
      setUser(data.user);
      setSuccessMsg('Account profile updated successfully!');
      setTimeout(clearAlerts, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setAccountSubmitting(false);
    }
  };

  // Phone Management Handlers
  const handleSendPhoneOtp = async () => {
    clearAlerts();
    if (!inputPhone || inputPhone.trim().length < 8) {
      setErrorMsg('Please enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }

    try {
      setPhoneSubmitting(true);
      const { data } = await api.post('/users/phone/send-otp', { phoneNumber: inputPhone });
      setPhoneStep(1);
      setPhoneCountdown(data.cooldownSeconds || 60);
      setSuccessMsg('Verification code sent to phone');
      if (data.devOtp) setPhoneDevOtp(data.devOtp);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    clearAlerts();
    if (!phoneOtp || phoneOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    try {
      setPhoneSubmitting(true);
      const { data } = await api.post('/users/phone/verify-otp', {
        phoneNumber: inputPhone,
        otp: phoneOtp
      });
      setPhoneInfo({
        phoneNumber: data.phoneNumber,
        phoneNumberVerified: true,
        phoneNumberVerifiedAt: data.phoneNumberVerifiedAt
      });
      setPhoneStep(0);
      setEditingPhone(false);
      setPhoneOtp('');
      setUser((prev) => ({ ...prev, phoneNumberVerified: true }));
      setSuccessMsg('Phone number verified & linked successfully!');
      setTimeout(clearAlerts, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleRemovePhone = async () => {
    if (!window.confirm('Are you sure you want to remove your phone number from this account?')) {
      return;
    }
    clearAlerts();
    try {
      setPhoneSubmitting(true);
      await api.delete('/users/phone');
      setPhoneInfo({
        phoneNumber: null,
        phoneNumberVerified: false,
        phoneNumberVerifiedAt: null
      });
      setInputPhone('');
      setPhoneStep(0);
      setEditingPhone(false);
      setUser((prev) => ({ ...prev, phoneNumberVerified: false }));
      setSuccessMsg('Phone number removed from account.');
      setTimeout(clearAlerts, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove phone number');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    try {
      setSecuritySubmitting(true);
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      setSuccessMsg(data.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(clearAlerts, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    clearAlerts();
    try {
      setPrivacySubmitting(true);
      const { data } = await api.put('/users/privacy', {
        lastSeen: lastSeenPrivacy,
        onlineStatus: onlineStatusPrivacy,
        profile: profilePrivacy
      });
      setUser((prev) => ({ ...prev, privacySettings: data.privacySettings }));
      setSuccessMsg('Privacy settings updated successfully!');
      setTimeout(clearAlerts, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update privacy settings');
    } finally {
      setPrivacySubmitting(false);
    }
  };

  const handleUnblockUser = async (targetId) => {
    try {
      const { data } = await api.delete(`/users/block/${targetId}`);
      setBlockedUsersList((prev) => prev.filter((u) => u._id !== targetId));
      setUser((prev) => ({ ...prev, blockedUsers: data.blockedUsers }));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to unblock user');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!deletePassword) {
      setErrorMsg('Password confirmation is required to delete account');
      return;
    }

    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteSubmitting(true);
      await api.delete('/users/account', { data: { password: deletePassword } });
      logout();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete account');
      setDeleteSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Settings & Safety
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

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 16px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'account', label: 'Account Identity', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'privacy', label: 'Privacy', icon: Eye },
            { id: 'danger', label: 'Danger Zone', icon: Trash2, danger: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); clearAlerts(); }}
                style={{
                  padding: '14px 18px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive
                    ? tab.danger ? '#f87171' : 'var(--accent-primary)'
                    : 'var(--text-secondary)',
                  borderBottom: isActive
                    ? `2px solid ${tab.danger ? '#f87171' : 'var(--accent-primary)'}`
                    : '2px solid transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Feedback Alert Bar */}
        {(errorMsg || successMsg) && (
          <div style={{ padding: '12px 24px 0 24px' }}>
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem'
              }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '10px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem'
              }}>
                <CheckCircle2 size={18} />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* TAB 1: ACCOUNT IDENTITY & PHONE */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'user'}`}
                      alt="Avatar"
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--accent-primary)',
                        boxShadow: '0 4px 16px var(--accent-glow)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      title="Generate Avatar"
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        background: 'var(--accent-gradient)', border: 'none',
                        color: '#fff', width: '28px', height: '28px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Smile size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      Username (@)
                    </label>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '600',
                      color: isCheckingUsername ? 'var(--text-muted)' : usernameStatus === 'available' ? '#4ade80' : '#f87171'
                    }}>
                      {isCheckingUsername ? 'Checking...' : usernameStatus === 'available' ? `✓ ${usernameMessage}` : `✗ ${usernameMessage}`}
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <AtSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Email Address (Read-Only)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Bio ({bio.length}/200)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    rows={2}
                    placeholder="Tell others about yourself..."
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={accountSubmitting || isCheckingUsername || usernameStatus === 'invalid' || usernameStatus === 'unavailable'}
                  style={{ padding: '12px', marginTop: '4px' }}
                >
                  {accountSubmitting ? 'Saving...' : <><Save size={16} /> Save Profile Changes</>}
                </button>
              </form>

              {/* Phone Identity Section */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={18} color="var(--accent-primary)" /> Phone Identity & OTP Verification
                  </h4>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                    Private
                  </span>
                </div>

                {/* Display Current Phone Status */}
                {phoneInfo.phoneNumber && !editingPhone ? (
                  <div style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {phoneInfo.phoneNumber}
                        {phoneInfo.phoneNumberVerified ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> Verified
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(248, 113, 113, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                            Unverified
                          </span>
                        )}
                      </div>
                      {phoneInfo.phoneNumberVerifiedAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Verified on {new Date(phoneInfo.phoneNumberVerifiedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhone(true);
                          setPhoneStep(0);
                        }}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhone}
                        disabled={phoneSubmitting}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {phoneStep === 0 ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="tel"
                            placeholder="+1234567890"
                            value={inputPhone}
                            onChange={(e) => setInputPhone(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={phoneSubmitting}
                          className="btn-primary"
                          style={{ padding: '10px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          {phoneSubmitting ? 'Sending...' : 'Send OTP'}
                        </button>
                        {editingPhone && (
                          <button
                            type="button"
                            onClick={() => setEditingPhone(false)}
                            style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Enter 6-digit verification code sent to <strong>{inputPhone}</strong>
                        </div>
                        {phoneDevOtp && (
                          <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>
                            Dev Code: {phoneDevOtp}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                              style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', letterSpacing: '4px', fontWeight: '700' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyPhoneOtp}
                            disabled={phoneSubmitting || phoneOtp.length !== 6}
                            className="btn-primary"
                            style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                          >
                            {phoneSubmitting ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={phoneCountdown > 0 || phoneSubmitting}
                            style={{ background: 'none', border: 'none', color: phoneCountdown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)', fontSize: '0.8rem', cursor: phoneCountdown > 0 ? 'not-allowed' : 'pointer' }}
                          >
                            {phoneCountdown > 0 ? `Resend code in ${phoneCountdown}s` : 'Resend Code'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhoneStep(0)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Change Number
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Change Password
                </h4>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    New Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={securitySubmitting}
                  style={{ padding: '12px' }}
                >
                  {securitySubmitting ? 'Updating...' : <><Shield size={16} /> Update Password</>}
                </button>
              </form>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Session Control
                </h4>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <LogOut size={16} /> Sign Out of Account
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & BLOCKED USERS */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <form onSubmit={handleSavePrivacy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Privacy Preferences
                </h4>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Who can see your Last Seen timestamp?
                  </label>
                  <select
                    value={lastSeenPrivacy}
                    onChange={(e) => setLastSeenPrivacy(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Who can see your Online status badge?
                  </label>
                  <select
                    value={onlineStatusPrivacy}
                    onChange={(e) => setOnlineStatusPrivacy(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="everyone">Everyone</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Public Profile Details Visibility
                  </label>
                  <select
                    value={profilePrivacy}
                    onChange={(e) => setProfilePrivacy(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="everyone">Everyone (Public Route)</option>
                    <option value="users">Registered Users Only</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={privacySubmitting}
                  style={{ padding: '12px' }}
                >
                  {privacySubmitting ? 'Updating...' : <><Save size={16} /> Save Privacy Settings</>}
                </button>
              </form>

              {/* Blocked Users Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Blocked Accounts ({blockedUsersList.length})
                </h4>

                {loadingBlocked ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading blocked users...</div>
                ) : blockedUsersList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {blockedUsersList.map((bu) => (
                      <div
                        key={bu._id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={bu.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${bu.username}`}
                            alt={bu.name}
                            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>{bu.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>@{bu.username}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnblockUser(bu._id)}
                          style={{
                            padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer'
                          }}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    You have not blocked any users.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === 'danger' && (
            <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '16px', borderRadius: '16px', color: '#f87171'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '1rem', marginBottom: '6px' }}>
                  <AlertCircle size={20} /> Permanent Account Deletion
                </div>
                <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5, color: '#fca5a5' }}>
                  Deleting your account will deactivate your profile and anonymize your personal credentials.
                  Existing conversation threads will remain safely stored for other members so historical messages are not broken.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Confirm Password to Proceed
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your account password"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={deleteSubmitting}
                style={{
                  padding: '14px', background: '#dc2626', color: '#ffffff',
                  border: 'none', borderRadius: '12px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {deleteSubmitting ? <><Loader2 size={16} className="animate-spin" /> Deleting Account...</> : <><UserX size={18} /> Confirm & Permanently Delete Account</>}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
