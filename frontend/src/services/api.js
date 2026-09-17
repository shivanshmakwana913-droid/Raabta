import axios from 'axios';

const getApiBaseUrl = () => {
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  let envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', hostname);
    }
    return envUrl;
  }
  return `http://${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Bearer token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isPublicAuthRoute = /\/(auth\/|users\/check-username|users\/profile\/)/.test(requestUrl);
      if (!isPublicAuthRoute) {
        // Clear token only if unauthorized on a protected route / token expired
        localStorage.removeItem('chat_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
