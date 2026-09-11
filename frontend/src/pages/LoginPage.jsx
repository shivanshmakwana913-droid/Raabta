import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Lock, User, AlertCircle, ArrowRight, Phone, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState('credentials'); // 'credentials' | 'phone'

  // Credentials State
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState(1); // 1: Send OTP, 2: Verify OTP
  const [countdown, setCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, sendPhoneLoginOtp, verifyPhoneLoginOtp } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailOrUsername || !password) {
      setErrorMessage('Please enter both email/username and password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevOtpHint(null);

    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setErrorMessage('Please enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await sendPhoneLoginOtp(phoneNumber);
      setOtpStep(2);
      setCountdown(res.cooldownSeconds || 60);
      setSuccessMessage('Verification code sent to your phone!');
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send OTP code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyPhoneLoginOtp(phoneNumber, otpCode);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'OTP verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '14px',
            borderRadius: '20px',
            background: 'var(--accent-gradient)',
            boxShadow: '0 8px 24px var(--accent-glow)',
            marginBottom: '16px'
          }}>
            <MessageSquare size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            Raabta
          </h2>
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: '500' }}>
            Jahan baatein judti hain.
          </p>
        </div>

        {/* Login Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => {
              setLoginMode('credentials');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: loginMode === 'credentials' ? 'var(--accent-gradient)' : 'transparent',
              color: loginMode === 'credentials' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Email / Username
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('phone');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: loginMode === 'phone' ? 'var(--accent-gradient)' : 'transparent',
              color: loginMode === 'phone' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Phone Number
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '12px',
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

        {/* Success Alert */}
        {successMessage && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dev Mode OTP Hint */}
        {devOtpHint && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px dashed rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            🔑 <strong>Dev Test Code:</strong> {devOtpHint}
          </div>
        )}

        {/* FORM MODE: Email / Username */}
        {loginMode === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Email or Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Enter email or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Password
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
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '14px', marginTop: '6px' }}
            >
              {isSubmitting ? 'Signing in...' : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM MODE: Phone OTP */}
        {loginMode === 'phone' && (
          <div>
            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Phone Number (with Country Code)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                    We'll send a 6-digit verification code to this phone number.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '14px', marginTop: '6px' }}
                >
                  {isSubmitting ? 'Sending Code...' : (
                    <>
                      Send Code <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      Enter 6-Digit Code sent to {phoneNumber}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(1);
                        setOtpCode('');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '1.2rem',
                        letterSpacing: '6px',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || isSubmitting}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={14} className={isSubmitting ? 'spin' : ''} />
                    {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || otpCode.length !== 6}
                  style={{ width: '100%', padding: '14px' }}
                >
                  {isSubmitting ? 'Verifying...' : (
                    <>
                      Verify & Log In <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: '600', textDecoration: 'none' }}>
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
