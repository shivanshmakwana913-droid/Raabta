import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Lock, User, AlertCircle, ArrowRight, Phone, KeyRound, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { RaabtaLoader } from '../components/common/RaabtaLoader';

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
      padding: '24px 16px',
      background: 'radial-gradient(circle at top left, #1e1b4b 0%, #0b0f19 70%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambient Glow Orbs */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', right: '-120px',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.15)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div className="glass-panel animate-slide-up auth-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px',
        borderRadius: '28px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '22px',
            background: 'var(--accent-gradient)',
            boxShadow: '0 8px 24px var(--accent-glow)',
            marginBottom: '16px',
            transform: 'rotate(-2deg)'
          }}>
            <MessageSquare size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.03em' }}>
            Raabta
          </h2>
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.88rem', fontWeight: '600', letterSpacing: '0.01em' }}>
            Jahan baatein judti hain
          </p>
        </div>

        {/* Login Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-input)',
          padding: '4px',
          borderRadius: '16px',
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
              borderRadius: '12px',
              border: 'none',
              background: loginMode === 'credentials' ? 'var(--accent-gradient)' : 'transparent',
              color: loginMode === 'credentials' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
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
              borderRadius: '12px',
              border: 'none',
              background: loginMode === 'phone' ? 'var(--accent-gradient)' : 'transparent',
              color: loginMode === 'phone' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Phone OTP
          </button>
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

        {/* Success Alert */}
        {successMessage && (
          <div className="animate-fade-in" style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '14px',
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
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px dashed rgba(99, 102, 241, 0.4)',
            color: '#818cf8',
            padding: '10px 14px',
            borderRadius: '14px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={16} /> Dev Test Code: <strong>{devOtpHint}</strong>
          </div>
        )}

        {/* FORM MODE: Email / Username */}
        {loginMode === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', marginTop: '6px' }}
            >
              {isSubmitting ? <RaabtaLoader variant="button" /> : (
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
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '14px',
                        color: 'var(--text-primary)',
                        fontSize: '0.92rem',
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
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', marginTop: '6px' }}
                >
                  {isSubmitting ? <RaabtaLoader variant="button" /> : (
                    <>
                      Send OTP Code <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Enter 6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(1);
                        setOtpCode('');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Change Phone
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
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '14px',
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
                      fontSize: '0.82rem',
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
                  style={{ width: '100%', padding: '14px', borderRadius: '14px' }}
                >
                  {isSubmitting ? <RaabtaLoader variant="button" /> : (
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
        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: '700', textDecoration: 'none' }}>
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
