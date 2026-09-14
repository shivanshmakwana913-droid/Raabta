import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Lock, Mail, AlertCircle, ArrowRight, Smile, AtSign, Phone, KeyRound, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { RaabtaLoader } from '../components/common/RaabtaLoader';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Optional Phone Number & Verification
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Username validation & check states
  const [usernameStatus, setUsernameStatus] = useState(''); // '' | 'available' | 'unavailable' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Debounced live username availability check
  useEffect(() => {
    const trimmed = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!trimmed) {
      setUsernameStatus('');
      setUsernameMessage('');
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
      setUsernameMessage('Letters, numbers & underscores only');
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
        setUsernameMessage('Could not verify username');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSendPhoneOtp = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setErrorMessage('Please enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }
    setErrorMessage('');
    setPhoneMessage('');
    setDevOtpHint(null);

    try {
      setOtpLoading(true);
      const { data } = await api.post('/auth/phone/register/send-otp', { phoneNumber });
      setOtpSent(true);
      setPhoneMessage('Verification code sent to phone');
      if (data?.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not send verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name || !username || !email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (usernameStatus === 'invalid' || usernameStatus === 'unavailable' || isCheckingUsername) {
      setErrorMessage(usernameMessage || 'Please enter a valid & available username');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(
        name,
        username,
        email,
        password,
        phoneNumber.trim() ? phoneNumber : null,
        otpCode.trim() ? otpCode : null,
        otpSent && otpCode.trim().length === 6
      );
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    isCheckingUsername ||
    (username.trim() && (usernameStatus === 'invalid' || usernameStatus === 'unavailable'));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px 16px',
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0b0f19 70%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambient Glow Orbs */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '340px', height: '340px', borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.15)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', left: '-120px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div className="glass-panel animate-slide-up auth-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px',
        borderRadius: '28px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '22px',
            background: 'var(--accent-gradient)',
            boxShadow: '0 8px 24px var(--accent-glow)',
            marginBottom: '14px',
            transform: 'rotate(2deg)'
          }}>
            <MessageSquare size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.03em' }}>
            Join Raabta
          </h2>
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.88rem', fontWeight: '600', letterSpacing: '0.01em' }}>
            Jahan baatein judti hain
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="animate-fade-in" style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <Smile size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Username (@) *
              </label>
              {username.trim() && (
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
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <AtSign size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'var(--bg-input)',
                  border: `1px solid ${
                    !username.trim()
                      ? 'var(--border-color)'
                      : isCheckingUsername
                      ? 'var(--border-color)'
                      : usernameStatus === 'available'
                      ? 'rgba(16, 185, 129, 0.5)'
                      : 'rgba(239, 68, 68, 0.5)'
                  }`,
                  borderRadius: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Optional Phone Number Section */}
          <div style={{
            background: 'var(--bg-input)',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} color="var(--accent-primary)" /> Phone Number (Optional)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Private</span>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setOtpSent(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            {phoneNumber.trim().length >= 8 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={otpLoading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--accent-primary)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary)',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {otpLoading ? <RaabtaLoader variant="button" /> : 'Send Verification OTP'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 34px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          letterSpacing: '2px',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                    {devOtpHint && (
                      <span style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={14} /> Dev Code: {devOtpHint}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitDisabled}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              marginTop: '6px',
              opacity: isSubmitDisabled ? 0.6 : 1,
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? <RaabtaLoader variant="button" /> : (
              <>
                Create Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: '700', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
