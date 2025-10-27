import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io(import.meta.env.VITE_SOCKET_SERVER_URL, {
        autoConnect: false,
        reconnectionAttempts: 5,
        transports: ['websocket'],
      });
      socketRef.current = newSocket;
      setSocket(newSocket);

      const onError = (err) => {
        console.error('Socket connection error:', err);
      };
      newSocket.on('connect_error', onError);

      newSocket.connect();

      return () => {
        newSocket.off('connect_error', onError);
        newSocket.disconnect();
        // Do not set socketRef.current = null unless really needed
      };
    }
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export function useSocket() {
  return useContext(SocketContext);
}
