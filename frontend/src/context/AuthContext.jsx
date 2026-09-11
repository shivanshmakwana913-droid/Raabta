import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chat_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-login / Restore session on initial load
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem('chat_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setToken(storedToken);
      } catch (err) {
        console.error('[Auth Restore Error]:', err.response?.data?.message || err.message);
        localStorage.removeItem('chat_token');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Register
  const register = async (name, username, email, password, phoneNumber = null, otp = null, verifyOtp = false) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/register', {
        name,
        username,
        email,
        password,
        phoneNumber,
        otp,
        verifyOtp
      });

      localStorage.setItem('chat_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Login with Email / Username
  const login = async (emailOrUsername, password) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/login', {
        emailOrUsername,
        password
      });

      localStorage.setItem('chat_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Send Phone Login OTP
  const sendPhoneLoginOtp = async (phoneNumber) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/phone/login/send-otp', { phoneNumber });
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP code';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Verify Phone Login OTP & Authenticate
  const verifyPhoneLoginOtp = async (phoneNumber, otp) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/phone/login/verify-otp', {
        phoneNumber,
        otp
      });

      localStorage.setItem('chat_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'OTP verification failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('chat_token');
    setUser(null);
    setToken(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        register,
        login,
        sendPhoneLoginOtp,
        verifyPhoneLoginOtp,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
