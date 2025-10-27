import React, { useState } from 'react'
import { useAuth } from '../features/auth/useAuth';
import VideoConference from '../features/video/components/VideoComponent';

const VideoConferencePage = () => {
   const { user } = useAuth();
  const [roomId, setRoomId] = useState('global-video-room');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');

  const handleCreateRoom = () => {
    if (!newRoomId.trim()) return;
    setRoomId(newRoomId.trim());
    setNewRoomId('');
    setCreatingRoom(false);
  };

  return (
    <div>
     
      <VideoConference
      newRoomId={newRoomId}
      setNewRoomId={setNewRoomId}
       creatingRoom={creatingRoom} handleCreateRoom={handleCreateRoom} roomId={roomId} user={user} />
     
    </div>
  )
}

export default VideoConferencePage
