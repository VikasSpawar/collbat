
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Helper function to calculate grid layout
const calculateGridLayout = (participantCount) => {
  if (participantCount <= 1) return { columns: 1, rows: 1 };
  if (participantCount <= 4) return { columns: 2, rows: 2 };
  if (participantCount <= 6) return { columns: 3, rows: 2 };
  if (participantCount <= 9) return { columns: 3, rows: 3 };
  return { columns: 4, rows: Math.ceil(participantCount / 4) };
};

function ParticipantVideo({ 
  stream, 
  isLocal, 
  isMain, 
  avatar, 
  name, 
  participantCount = 1,
  isLoading = false,
  isThumbnail = false 
}) {
  const videoRef = useRef();
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    console.log('ParticipantVideo useEffect:', { name, isLocal, hasStream: !!stream, trackCount: stream?.getTracks().length });
      if (videoRef.current) {
    if (stream && stream.getVideoTracks().some(t => t.enabled)) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      const hasActiveVideo = videoTracks.length > 0 && videoTracks[0].enabled;
      const hasActiveAudio = audioTracks.length > 0 && audioTracks[0].enabled;
      
      setHasVideo(hasActiveVideo);
      setHasAudio(hasActiveAudio);
      
      console.log('Video tracks:', videoTracks.length, 'Audio tracks:', audioTracks.length);
      console.log('Has active video:', hasActiveVideo, 'Has active audio:', hasActiveAudio);
      
      const handleTrackAdded = () => {
        console.log('Track added to stream');
        const vTracks = stream.getVideoTracks();
        const aTracks = stream.getAudioTracks();
        setHasVideo(vTracks.length > 0 && vTracks[0].enabled);
        setHasAudio(aTracks.length > 0 && aTracks[0].enabled);
      };

      const handleTrackRemoved = () => {
        console.log('Track removed from stream');
        const vTracks = stream.getVideoTracks();
        const aTracks = stream.getAudioTracks();
        setHasVideo(vTracks.length > 0 && vTracks[0].enabled);
        setHasAudio(aTracks.length > 0 && aTracks[0].enabled);
      };

      stream.addEventListener('addtrack', handleTrackAdded);
      stream.addEventListener('removetrack', handleTrackRemoved);

      return () => {
        stream.removeEventListener('addtrack', handleTrackAdded);
        stream.removeEventListener('removetrack', handleTrackRemoved);
      };
    } else if (videoRef.current) {
      console.log('Clearing video srcObject for:', name);
      videoRef.current.srcObject = null;
      setHasVideo(false);
      setHasAudio(false);
    }
  }, [stream, name, isLocal]);

  const getContainerStyles = () => {
    if (isMain) {
      return {
        width: "100%",
        height: "100%",
        aspectRatio: "16/9"
      };
    }
    
    if (isThumbnail) {
      return {
        width: "120px",
        height: "90px",
        flexShrink: 0
      };
    }

    const { columns } = calculateGridLayout(participantCount);
    const widthPercentage = 100 / columns;
    
    return {
      width: `${widthPercentage}%`,
      aspectRatio: "16/9",
      minWidth: "200px"
    };
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-700 rounded-lg border border-gray-600"
        style={getContainerStyles()}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-300">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gray-600 bg-gray-800"
      style={getContainerStyles()}
    >
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${hasVideo ? '' : 'opacity-0'}`}
          onLoadedMetadata={() => {
            console.log(`Video loaded for ${name}`);
            const vTracks = stream.getVideoTracks();
            if (vTracks.length > 0 && vTracks[0].enabled) {
              setHasVideo(true);
            }
          }}
          onError={(e) => console.error(`Video error for ${name}:`, e)}
        />
      )}
      
      {(!stream || !hasVideo) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <img
            src={avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(name || "U")}`}
            alt={name}
            className={`rounded-full ${isThumbnail ? 'w-8 h-8' : 'w-16 h-16'}`}
            onError={e => (e.target.src = "/default-avatar.svg")}
          />
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-black/70 rounded px-2 py-1 text-white text-xs flex items-center justify-between">
          <span className="truncate">{name} {isLocal && "(You)"}</span>
          <div className="flex gap-1 ml-2">
            {!hasAudio && (
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: '12px' }}>
                mic_off
              </span>
            )}
            {!hasVideo && (
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: '12px' }}>
                videocam_off
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoConference({ user, roomId }) {
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedParticipantId, setFocusedParticipantId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Error state management
  const [connectionError, setConnectionError] = useState(null);
  const [connectionHealth, setConnectionHealth] = useState('good');

  const socketRef = useRef();
  const peersRef = useRef({});
  const userStreamRef = useRef(new MediaStream());
  const micTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  
  // Enhanced negotiation state management
  const negotiationStateRef = useRef({});
  const pendingNegotiationsRef = useRef(new Set());

  // Use refs for current state to avoid stale closures
  const participantsRef = useRef([]);
  const mountedRef = useRef(true);
  const pingIntervalRef = useRef(null);
  const cleanupTimeoutsRef = useRef(new Set());

  const userAvatar = `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(user.email)}`;
  const userName = user.email.split("@")[0];

  const addOrUpdateParticipant = useCallback((id, stream, name, avatar, isLocal) => {
    if (!id || !mountedRef.current) return;

    console.log("Adding/updating participant:", id, "stream tracks:", stream?.getTracks().length, "isLocal:", isLocal);
    
    setParticipants((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const participant = { id, stream, name, avatar, isLocal };
      
      let newParticipants;
      if (idx !== -1) {
        newParticipants = [...prev];
        newParticipants[idx] = participant;
        console.log("Updated existing participant:", id);
      } else {
        newParticipants = [...prev, participant];
        console.log("Added new participant:", id);
      }
      
      participantsRef.current = newParticipants;
      return newParticipants;
    });
  }, []);

  const showError = useCallback((message, type = 'error') => {
    if (!mountedRef.current) return;
    
    setConnectionError({ message, type, timestamp: Date.now() });
    
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionError(null);
      }
    }, 5000);
    
    cleanupTimeoutsRef.current.add(timeoutId);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!joined || !roomId) return;

    setIsConnecting(true);
    socketRef.current = io(SIGNALING_SERVER_URL, { autoConnect: true });

    const setupSocketHandlers = () => {
      socketRef.current.on("connect", () => {
        console.log("Connected to signaling server");
        if (!mountedRef.current) return;
        
        setIsConnecting(false);
        setConnectionHealth('good');
        
        userStreamRef.current = new MediaStream();

        addOrUpdateParticipant(
          socketRef.current.id,
          userStreamRef.current,
          userName,
          userAvatar,
          true
        );

        socketRef.current.emit("joinRoom", {
          roomId,
          name: userName,
          avatar: userAvatar,
        });
      });

      socketRef.current.on("error", ({ type, message }) => {
        console.error("Socket error:", type, message);
        if (!mountedRef.current) return;
        
        setConnectionHealth('poor');
        
        if (type === "INVALID_ROOM_ID") {
          showError("Invalid room ID. Please check and try again.", 'error');
        } else if (type === "JOIN_ROOM_ERROR") {
          showError("Failed to join room. Please try again.", 'error');
        } else {
          showError(message || "Connection error occurred", 'error');
        }
      });

      socketRef.current.on("signaling_error", ({ type, target, message }) => {
        console.error("Signaling error:", type, target, message);
        if (!mountedRef.current) return;
        
        setConnectionHealth('poor');
        
        if (type === "PEER_NOT_FOUND") {
          console.log("Removing disconnected peer:", target);
          
          const currentParticipants = participantsRef.current;
          setParticipants(prev => {
            const filtered = prev.filter((p) => p.id !== target);
            participantsRef.current = filtered;
            return filtered;
          });
          
          if (peersRef.current[target]) {
            peersRef.current[target].close();
            delete peersRef.current[target];
          }
        }
        
        showError(`Connection issue with participant: ${message}`, 'warning');
      });

      socketRef.current.on("signaling_timeout", ({ type, target }) => {
        console.log("Signaling timeout:", type, target);
        if (!mountedRef.current) return;
        
        setConnectionHealth('poor');
        
        if (type === "OFFER_TIMEOUT") {
          console.log(`Connection timeout with peer ${target}, retrying...`);
          showError("Connection timeout, attempting to reconnect...", 'warning');
          
          const participant = participantsRef.current.find(p => p.id === target);
          
          if (peersRef.current[target]) {
            peersRef.current[target].close();
            delete peersRef.current[target];
            
            const timeoutId = setTimeout(() => {
              if (participant && mountedRef.current) {
                initiatePeerConnection(target, participant.name, participant.avatar, true);
              }
            }, 2000);
            
            cleanupTimeoutsRef.current.add(timeoutId);
          }
        }
      });

      socketRef.current.on("chat_error", ({ message }) => {
        console.error("Chat error:", message);
        if (!mountedRef.current) return;
        showError(`Chat failed: ${message}`, 'error');
      });

      socketRef.current.on("allPeers", (peers) => {
        console.log("Received all peers:", peers);
        if (!mountedRef.current) return;
        
        peers.forEach(({ id, name, avatar }) => {
          const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
              initiatePeerConnection(id, name, avatar, true);
            }
          }, 100);
          
          cleanupTimeoutsRef.current.add(timeoutId);
        });
      });

      socketRef.current.on("newPeer", ({ id, name, avatar }) => {
        console.log("New peer joined:", id, name);
        if (!mountedRef.current) return;
        initiatePeerConnection(id, name, avatar, false);
      });

      socketRef.current.on("offer", async ({ from, offer }) => {
        console.log("Received offer from:", from);
        if (!mountedRef.current) return;
        
        const pc = initiatePeerConnection(from, null, null, false);
        try {
          if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit("answer", { to: from, answer: pc.localDescription });
            console.log("Sent answer to:", from);
          }
        } catch (error) {
          console.error("Error handling offer:", error);
          showError("Failed to establish connection with participant", 'error');
        }
      });

      socketRef.current.on("answer", async ({ from, answer }) => {
        console.log("Received answer from:", from);
        if (!mountedRef.current) return;
        
        const pc = peersRef.current[from];
        if (pc && pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(answer);
            console.log("Set remote description for:", from);
            setConnectionHealth('good');
          } catch (error) {
            console.error("Error setting remote description:", error);
            showError("Connection negotiation failed", 'error');
          }
        }
      });

      socketRef.current.on("ice-candidate", ({ from, candidate }) => {
        console.log("Received ICE candidate from:", from);
        if (!mountedRef.current) return;
        
        const pc = peersRef.current[from];
        if (pc && pc.remoteDescription) {
          try {
            pc.addIceCandidate(candidate);
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      });

      socketRef.current.on("peerDisconnected", (id) => {
        console.log("Peer disconnected:", id);
        if (!mountedRef.current) return;
        
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        if (negotiationStateRef.current[id]) {
          delete negotiationStateRef.current[id];
        }
        
        setParticipants(prev => {
          const filtered = prev.filter((p) => p.id !== id);
          participantsRef.current = filtered;
          return filtered;
        });
      });

      socketRef.current.on("chat", ({ sender, text, timestamp }) => {
        if (!mountedRef.current) return;
        
        setChatMessages((prev) => [...prev, { 
          author: sender, 
          text, 
          timestamp: timestamp || Date.now()
        }]);
      });

      pingIntervalRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('ping');
        }
      }, 30000);

      socketRef.current.on('pong', ({ timestamp }) => {
        console.log('Connection healthy, server time:', new Date(timestamp));
        if (!mountedRef.current) return;
        setConnectionHealth('good');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        if (!mountedRef.current) return;
        
        setConnectionHealth('poor');
        setIsConnecting(false);
        showError('Disconnected from server. Attempting to reconnect...', 'warning');
      });

      socketRef.current.on('reconnect', () => {
        console.log('Reconnected to server');
        if (!mountedRef.current) return;
        
        setConnectionHealth('good');
        showError('Reconnected successfully!', 'success');
      });
    };

    setupSocketHandlers();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [joined, roomId]);

  function cleanup() {
    console.log("Cleaning up connections");
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    cleanupTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    cleanupTimeoutsRef.current.clear();
    
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    negotiationStateRef.current = {};
    pendingNegotiationsRef.current.clear();
    
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    
    micTrackRef.current = null;
    videoTrackRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    userStreamRef.current = new MediaStream();
    
    setParticipants([]);
    participantsRef.current = [];
    setIsConnecting(false);
    setConnectionError(null);
    setConnectionHealth('good');
  }

  function initiatePeerConnection(peerId, name, avatar, initiator) {
    console.log("Initiating peer connection with:", peerId, "initiator:", initiator);
    
    if (peersRef.current[peerId]) {
      console.log("Peer connection already exists for:", peerId);
      return peersRef.current[peerId];  
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[peerId] = pc;
    negotiationStateRef.current[peerId] = { isNegotiating: false };

    addOrUpdateParticipant(peerId, new MediaStream(), name, avatar, false);

    console.log("Adding current tracks to peer connection:", userStreamRef.current.getTracks().length);
    userStreamRef.current.getTracks().forEach((track) => {
      try {
        console.log("Adding track:", track.kind, track.id, "enabled:", track.enabled);
        pc.addTrack(track, userStreamRef.current);
      } catch (error) {
        console.error("Error adding track to peer connection:", error);
      }
    });

    pc.ontrack = (event) => {
      console.log("Received track from peer:", peerId, "track kind:", event.track.kind);
      
      let remoteStream;
      if (event.streams && event.streams[0]) {
        remoteStream = event.streams[0];
      } else {
        remoteStream = new MediaStream();
        remoteStream.addTrack(event.track);
      }
      
      console.log("Remote stream tracks:", remoteStream.getTracks().length);
      
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          addOrUpdateParticipant(peerId, remoteStream, name, avatar, false);
        }
      }, 100);
      
      cleanupTimeoutsRef.current.add(timeoutId);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", peerId);
        socketRef.current.emit("ice-candidate", {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer connection ${peerId} state:`, pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setConnectionHealth('good');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.log(`Cleaning up failed connection for ${peerId}`);
        setConnectionHealth('poor');
        
        if (peersRef.current[peerId]) {
          delete peersRef.current[peerId];
        }
        if (negotiationStateRef.current[peerId]) {
          delete negotiationStateRef.current[peerId];
        }
        
        setParticipants(prev => {
          const filtered = prev.filter((p) => p.id !== peerId);
          participantsRef.current = filtered;
          return filtered;
        });
        
        showError(`Connection lost with participant`, 'warning');
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!negotiationStateRef.current[peerId] || negotiationStateRef.current[peerId]?.isNegotiating) {
        console.log("Already negotiating or peer removed:", peerId);
        return;
      }
      
      try {
        negotiationStateRef.current[peerId].isNegotiating = true;
        console.log("Negotiation needed for:", peerId);
        await createAndSendOffer(peerId, pc);
      } catch (error) {
        console.error("Error in negotiationneeded for peer:", peerId, error);
        showError("Connection negotiation failed", 'error');
      } finally {
        if (negotiationStateRef.current[peerId]) {
          negotiationStateRef.current[peerId].isNegotiating = false;
        }
      }
    };

    if (initiator) {
      console.log("Creating offer for:", peerId);
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          createAndSendOffer(peerId, pc);
        }
      }, 100);
      
      cleanupTimeoutsRef.current.add(timeoutId);
    }

    return pc;
  }

  async function createAndSendOffer(peerId, pc) {
    if (pendingNegotiationsRef.current.has(peerId)) {
      console.log("Pending negotiation exists for", peerId);
      return;
    }

    try {
      pendingNegotiationsRef.current.add(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Sending offer to:", peerId);
      socketRef.current.emit("offer", {
        to: peerId,
        offer: pc.localDescription,
      });
    } catch (error) {
      console.error("Error creating offer for peer:", peerId, error);
      showError("Failed to create connection offer", 'error');
    } finally {
      pendingNegotiationsRef.current.delete(peerId);
    }
  }

  async function updateTrackOnAllPeers(kind, newTrack) {
    console.log("Updating track on all peers:", kind, "new track:", !!newTrack);
    
    const peers = Object.entries(peersRef.current);
    const updatePromises = peers.map(async ([peerId, pc]) => {
      try {
        const senders = pc.getSenders();
        const sender = senders.find((s) => s.track?.kind === kind);
        
        if (sender) {
          if (newTrack) {
            console.log("Replacing track for peer:", peerId, kind);
            await sender.replaceTrack(newTrack);
          } else {
            console.log("Stopping track for peer:", peerId, kind);
            await sender.replaceTrack(null);
          }
        } else if (newTrack) {
          console.log("Adding new track for peer:", peerId, kind);
          pc.addTrack(newTrack, userStreamRef.current);
        }
      } catch (error) {
        console.error(`Error updating ${kind} track for peer ${peerId}:`, error);
        showError(`Failed to update ${kind} for participant`, 'warning');
      }
    });

    await Promise.allSettled(updatePromises);
  }

  async function handleToggleMic() {
    console.log("Toggling mic. Current state:", micOn);
    
    if (!micOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const micTrack = stream.getAudioTracks()[0];
        console.log("Got mic track:", micTrack.id);
        
        micTrackRef.current = micTrack;
        userStreamRef.current.addTrack(micTrack);
        
        await updateTrackOnAllPeers("audio", micTrack);
        
        addOrUpdateParticipant(
          socketRef.current?.id,
          userStreamRef.current,
          userName,
          userAvatar,
          true
        );
        
        setMicOn(true);
        console.log("Mic turned on successfully");
      } catch (error) {
        console.error("Microphone error:", error);
        showError("Microphone permission denied or unavailable.", 'error');
      }
    } else {
      if (micTrackRef.current) {
        console.log("Turning off mic");
        
        userStreamRef.current.removeTrack(micTrackRef.current);
        micTrackRef.current.stop();
        
        await updateTrackOnAllPeers("audio", null);
        
        micTrackRef.current = null;
        setMicOn(false);
        
        addOrUpdateParticipant(
          socketRef.current?.id,
          userStreamRef.current,
          userName,
          userAvatar,
          true
        );
        
        console.log("Mic turned off successfully");
      }
    }
  }

// Updated stopScreenSharing function to restore camera track on stop of screen share
async function stopScreenSharing() {
  console.log("Stopping screen share");

  // Stop screen track and remove from user stream
  if (screenTrackRef.current) {
    screenTrackRef.current.stop();
    if (userStreamRef.current.getTracks().includes(screenTrackRef.current)) {
      userStreamRef.current.removeTrack(screenTrackRef.current);
    }
    screenTrackRef.current = null;
  }

  setScreenSharing(false);

  // Restore camera video track to userStream if exists or get new one
  if (!videoTrackRef.current || !videoTrackRef.current.enabled) {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      if (videoTrackRef.current) {
        userStreamRef.current.removeTrack(videoTrackRef.current);
        videoTrackRef.current.stop();
      }

      userStreamRef.current.addTrack(camTrack);
      videoTrackRef.current = camTrack;

      // Update track on all peers
      await updateTrackOnAllPeers("video", camTrack);
      setCamOn(true);
    } catch (error) {
      console.error("Error restoring camera after screen share stop:", error);
      setCamOn(false);
    }
  } else {
    // Just re-enable existing camera track if disabled
    videoTrackRef.current.enabled = true;
    await updateTrackOnAllPeers("video", videoTrackRef.current);
    setCamOn(true);
  }

  // Renegotiate connections replacing screen sharing track with camera track
  for (const [peerId, pc] of Object.entries(peersRef.current)) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("offer", { to: peerId, offer: pc.localDescription });
  }

  addOrUpdateParticipant(
    socketRef.current?.id,
    userStreamRef.current,
    userName,
    userAvatar,
    true
  );

  console.log("Screen sharing stopped successfully");
}

// Updated handleToggleScreenShare with proper disabling/restoring tracks
async function handleToggleScreenShare() {
  if (!screenSharing) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        if (userStreamRef.current.getTracks().includes(screenTrackRef.current)) {
          userStreamRef.current.removeTrack(screenTrackRef.current);
        }
      }

      screenTrackRef.current = screenTrack;
      userStreamRef.current.addTrack(screenTrack);

      // Replace video track on all peers with screen track
      await updateTrackOnAllPeers("video", screenTrack);

      setScreenSharing(true);

      // Disable camera video when screen sharing starts
      if (videoTrackRef.current) {
        videoTrackRef.current.enabled = false;
      }
      setCamOn(false);

      // Renegotiate connections after replacing video track
      for (const [peerId, pc] of Object.entries(peersRef.current)) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("offer", { to: peerId, offer: pc.localDescription });
      }

      screenTrack.onended = async () => {
        await stopScreenSharing();
      };
    } catch (error) {
      console.error("Screen sharing failed", error);
    }
  } else {
    await stopScreenSharing();
  }
}

// Updated handleToggleCam to properly re-enable or get new camera track
async function handleToggleCam() {
  if (!camOn && videoTrackRef.current) {
    // Resume by enabling existing video track
    videoTrackRef.current.enabled = true;
    setCamOn(true);
    await updateTrackOnAllPeers("video", videoTrackRef.current);
  } else if (camOn && videoTrackRef.current) {
    // Stop and remove the video track to turn off camera light
    videoTrackRef.current.enabled = false;
    videoTrackRef.current.stop(); // Stops camera hardware and light
    userStreamRef.current.removeTrack(videoTrackRef.current);

    // Remove from peers
    for (const pc of Object.values(peersRef.current)) {
      const sender = pc.getSenders().find(s => s.track === videoTrackRef.current);
      if (sender) {
        pc.removeTrack(sender);
      }
    }

    videoTrackRef.current = null;
    setCamOn(false);
    await updateTrackOnAllPeers("video", null);
  } else if (!camOn && !videoTrackRef.current) {
    // No video track, so get new video stream and add it
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      userStreamRef.current.addTrack(videoTrack);
      videoTrackRef.current = videoTrack;

      Object.values(peersRef.current).forEach((pc) => {
        pc.addTrack(videoTrack, userStreamRef.current);
      });
      setCamOn(true);
    } catch (error) {
      console.error("Error starting camera:", error);
      setCamOn(false);
    }
  }
}


  function handleSendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return;
    
    socketRef.current.emit("chat", {
      roomId,
      text: message,
      sender: userName,
    });
    
    setChatMessages((prev) => [...prev, { 
      author: "Me", 
      text: message, 
      timestamp: Date.now() 
    }]);
    
    setMessage("");
  }

  function handleJoin() {
    setJoined(true);
  }
  
  function handleLeave() {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId });
    }
    
    cleanup();
    
    setMicOn(false);
    setCamOn(false);
    setScreenSharing(false);
    setChatMessages([]);
    setJoined(false);
    setFocusMode(false);
    setFocusedParticipantId(null);
  }

  const handleToggleFocus = () => {
    if (!focusMode) {
      const screenSharer = participants.find(p => {
        const videoTracks = p.stream?.getVideoTracks();
        return videoTracks?.some(track => {
          const settings = track.getSettings();
          return settings.displaySurface !== undefined;
        });
      });
      
      const focusTarget = screenSharer || participants[0];
      setFocusedParticipantId(focusTarget?.id || null);
      setFocusMode(true);
    } else {
      setFocusMode(false);
      setFocusedParticipantId(null);
    }
  };

  const getStreamType = (participant) => {
    if (!participant?.stream) return "No Stream";
    
    const videoTracks = participant.stream.getVideoTracks();
    if (videoTracks.length === 0) return "Audio Only";
    
    const videoTrack = videoTracks[0];
    const settings = videoTrack.getSettings();
    
    if (settings.displaySurface || settings.logicalSurface || videoTrack.label.includes('screen')) {
      return "Screen Share";
    }
    
    return "Camera";
  };

  const getFocusedParticipant = () => {
    if (!focusMode || !focusedParticipantId) return null;
    return participants.find(p => p.id === focusedParticipantId) || null;
  };

  const getThumbnailParticipants = () => {
    if (!focusMode) return [];
    return participants.filter(p => p.id !== focusedParticipantId);
  };

  if (!joined) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-gray-400 mb-6">Room ID: {roomId}</p>
          <button
            className="rounded-xl bg-primary px-8 py-4 text-white font-bold text-xl hover:bg-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={handleJoin}
          >
            Join Conference
          </button>
        </div>
      </div>
    );
  }

  if (participants.length === 0 && !isConnecting) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Waiting for others to join...</h2>
          <p className="text-gray-400 mb-6">Share the room ID: {roomId}</p>
          <button
            className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 transition-colors"
            onClick={handleLeave}
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  const focusedParticipant = getFocusedParticipant();
  const thumbnailParticipants = getThumbnailParticipants();
  const { columns } = calculateGridLayout(participants.length);

  return (
    <div className="flex h-screen w-full flex-col text-white bg-gray-900">
      {/* Error notification */}
      {connectionError && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          connectionError.type === 'error' ? 'bg-red-600' : 
          connectionError.type === 'warning' ? 'bg-yellow-600' : 
          'bg-green-600'
        }`}>
          <p className="font-semibold text-white">
            {connectionError.type === 'error' ? 'Error' : 
             connectionError.type === 'warning' ? 'Warning' : 'Success'}
          </p>
          <p className="text-sm text-white opacity-90">{connectionError.message}</p>
        </div>
      )}

      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {participants.length} participant{participants.length !== 1 ? 's' : ''} in the call
      </div>

      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4 bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-xl">videocam</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Team Sync</h1>
            <p className="text-sm text-gray-400">Room: {roomId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            connectionHealth === 'good' ? 'bg-green-500' :
            connectionHealth === 'poor' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} title={`Connection: ${connectionHealth}`}></div>
          
          {isConnecting && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Connecting...</span>
            </div>
          )}
          
          <span className="text-sm text-gray-400">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
          
          <button 
            onClick={() => setShowChat((v) => !v)} 
            className="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {showChat ? "Hide Chat" : "Show Chat"}
          </button>
          
          <button 
            onClick={() => setShowParticipants((v) => !v)} 
            className="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 transition hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {showParticipants ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </header>
      
      <main className="flex flex-1 overflow-hidden">
        {showParticipants && (
          <aside className="w-80 flex-shrink-0 border-r border-gray-700 bg-gray-800 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-white">Participants</h3>
              
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      focusedParticipant?.id === participant.id 
                        ? 'bg-primary/20 border border-primary/50' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => {
                      if (!focusMode) {
                        setFocusMode(true);
                      }
                      setFocusedParticipantId(participant.id);
                    }}
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                      <img
                        alt={`${participant.name}'s avatar`}
                        className="h-full w-full object-cover"
                        src={participant.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(participant.name || "U")}`}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {participant.name}
                        </span>
                        {participant.isLocal && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getStreamType(participant)}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {!participant.stream?.getAudioTracks().some(t => t.enabled) && (
                        <span className="material-symbols-outlined text-red-400 text-sm">
                          mic_off
                        </span>
                      )}
                      {!participant.stream?.getVideoTracks().some(t => t.enabled) && (
                        <span className="material-symbols-outlined text-red-400 text-sm">
                          videocam_off
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
        
        <section className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            {focusMode && focusedParticipant ? (
              <div className="h-full flex flex-col gap-4">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-4xl">
                    <ParticipantVideo
                      stream={focusedParticipant.stream}
                      isLocal={focusedParticipant.isLocal}
                      isMain={true}
                      avatar={focusedParticipant.avatar}
                      name={focusedParticipant.name}
                      participantCount={1}
                      isLoading={!focusedParticipant.stream}
                    />
                  </div>
                </div>
                
                {thumbnailParticipants.length > 0 && (
                  <div className="flex gap-2 justify-center pb-2">
                    {thumbnailParticipants.map((participant) => (
                      <div 
                        key={participant.id}
                        className="cursor-pointer"
                        onClick={() => setFocusedParticipantId(participant.id)}
                      >
                        <ParticipantVideo
                          stream={participant.stream}
                          isLocal={participant.isLocal}
                          avatar={participant.avatar}
                          name={participant.name}
                          isThumbnail={true}
                          isLoading={!participant.stream}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="h-full grid gap-2 p-2"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gridTemplateRows: `repeat(auto-fit, 1fr)`
                }}
              >
                {participants.map((participant) => (
                  <ParticipantVideo
                    key={participant.id}
                    stream={participant.stream}
                    isLocal={participant.isLocal}
                    avatar={participant.avatar}
                    name={participant.name}
                    participantCount={participants.length}
                    isLoading={!participant.stream}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        
        {showChat && (
          <aside className="w-80 flex-shrink-0 border-l border-gray-700 bg-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-primary text-sm">
                          {msg.author}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800"
                  disabled={!message.trim()}
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </form>
            </div>
          </aside>
        )}
      </main>
      
      <footer className="border-t border-gray-700 bg-gray-800 py-4">
        <div className="flex items-center justify-center gap-3">
          <button 
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            onClick={handleToggleMic}
            tabIndex={1}
            className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              micOn 
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500" 
                : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            }`}
          >
            <span className="material-symbols-outlined">
              {micOn ? "mic" : "mic_off"}
            </span>
          </button>
          
          <button 
            aria-label={camOn ? "Turn off camera" : "Turn on camera"}
            onClick={handleToggleCam}
            disabled={screenSharing}
            tabIndex={2}
            className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              camOn 
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500" 
                : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            } ${screenSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined">
              {camOn ? "videocam" : "videocam_off"}
            </span>
          </button>
          
          <button 
            aria-label={screenSharing ? "Stop sharing screen" : "Share screen"}
            onClick={handleToggleScreenShare}
            tabIndex={3}
            className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              screenSharing 
                ? "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500" 
                : "bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500"
            }`}
          >
            <span className="material-symbols-outlined">present_to_all</span>
          </button>
          
          <button 
            aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            onClick={handleToggleFocus}
            disabled={participants.length === 0}
            tabIndex={4}
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white hover:bg-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">
              {focusMode ? "grid_view" : "fullscreen"}
            </span>
          </button>
          
          <button 
            aria-label={showChat ? "Hide chat" : "Show chat"}
            onClick={() => setShowChat((v) => !v)}
            tabIndex={5}
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white hover:bg-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <span className="material-symbols-outlined">chat</span>
          </button>
          
          <button 
            aria-label={showParticipants ? "Hide participants panel" : "Show participants panel"}
            onClick={() => setShowParticipants((v) => !v)}
            tabIndex={6}
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white hover:bg-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <span className="material-symbols-outlined">group</span>
          </button>
          
          <button 
            aria-label="Leave call"
            onClick={handleLeave}
            tabIndex={7}
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <span className="material-symbols-outlined">call_end</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

