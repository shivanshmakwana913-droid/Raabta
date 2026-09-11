import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('[Socket Connected]:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket Disconnected]');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket Auth/Connection Error]:', err.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
