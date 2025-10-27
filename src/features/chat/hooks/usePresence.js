import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

export default function usePresence(roomId = null) {
  const socket = useSocket();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join the specified room to track presence
    socket.emit('joinRoom', roomId);

    // Listen for presence updates for this room
    socket.on('presenceUpdate', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.off('presenceUpdate');
    };
  }, [socket, roomId]);

  return onlineUsers;
}
