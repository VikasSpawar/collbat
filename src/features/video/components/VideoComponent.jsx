
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

export default function VideoConference({ user, roomId,newRoomId, setNewRoomId , creatingRoom, handleCreateRoom }) {
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


//variables for new ui
  const [unreadMessages , setUnreadMessages]=useState(0)

  const [callDuration,setCallDuration]=useState(0)
  const [isRecording,setIsRecording]=useState(false)
  const [overallConnectionQuality, setOverallConnectionQuality]=useState('excellent')

  /******************************************************************
 * 1. ----- STATE & REFS  (add near the other useState / useRef)  *
 ******************************************************************/
const [showSettings, setShowSettings]   = useState(false);   // settings drawer
const [typingUsers, setTypingUsers]     = useState([]);      // names currently typing
const [micLevel, setMicLevel]           = useState(0);       // 0 → 1
const chatContainerRef                  = useRef(null);      // scroll-to-bottom
const messageInputRef                   = useRef(null);      // focus / typing events
const typingTimeoutRef                  = useRef(null);      // debounce typing

/******************************************************************
 * 2. ----- TIME HELPERS  (place above component or inside)       *
 ******************************************************************/
const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h ? `${pad(h)}:` : ''}${pad(m)}:${pad(s)}`;
};

/******************************************************************
 * 3. ----- CALL TIMER  (keeps callDuration ticking)              *
 ******************************************************************/
useEffect(() => {
  if (!joined) return;
  const id = setInterval(() => setCallDuration((t) => t + 1), 1000);
  return () => clearInterval(id);
}, [joined]);

/******************************************************************
 * 4. ----- CHAT SCROLL-TO-BOTTOM                                 *
 ******************************************************************/
useEffect(() => {
  if (chatContainerRef.current) {
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }
}, [chatMessages]);

/******************************************************************
 * 5. -----  TYPING INDICATOR HANDLERS                            *
 ******************************************************************/
const handleTyping = () => {
  socketRef.current?.emit('typing', { roomId, sender: userName });
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    socketRef.current?.emit('stopTyping', { roomId, sender: userName });
  }, 3000);
};

useEffect(() => {
  if (!socketRef.current) return;

  const addTyper = ({ sender }) => {
    if (sender === userName) return;
    setTypingUsers((u) => [...new Set([...u, sender])]);
  };
  const removeTyper = ({ sender }) => {
    setTypingUsers((u) => u.filter((n) => n !== sender));
  };

  socketRef.current.on('typing', addTyper);
  socketRef.current.on('stopTyping', removeTyper);

  return () => {
    socketRef.current.off('typing', addTyper);
    socketRef.current.off('stopTyping', removeTyper);
  };
}, [userName]);

/******************************************************************
 * 6. -----  MICROPHONE LEVEL METER                               *
 ******************************************************************/
useEffect(() => {
  let audioCtx, analyser, src, rafId;

  if (micOn && micTrackRef.current) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src = audioCtx.createMediaStreamSource(new MediaStream([micTrackRef.current]));
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length; // 0-255
      setMicLevel(avg / 255);
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (audioCtx) audioCtx.close();
    setMicLevel(0);
  };
}, [micOn]);

/******************************************************************
 * 7. -----  CLEAN UP TYPING TIMEOUT ON UNMOUNT                   *
 ******************************************************************/
useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);




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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white px-6">
      <div className="text-center max-w-md w-full">

        <h2 className="text-3xl font-extrabold mb-4 text-teal-400 tracking-wide">
          Ready to Join?
        </h2>

        <p className="text-gray-400 mb-8 select-all text-lg  ">
          <span className="  px-2 py-1 rounded truncate inline-block max-w-full"> Current Room ID:{' '}</span>
         
          <span className="font-mono bg-gray-800 px-2 py-1 rounded truncate inline-block max-w-full">
            {roomId}
          </span>
        </p>

        {/* Join existing room button */}
        <button
          className="w-full mb-6 rounded-2xl bg-teal-600 px-10 py-4 text-white font-bold text-xl 
                     hover:bg-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-400 focus:ring-offset-2
                     transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleJoin}
          disabled={creatingRoom}
        >
          Join Conference
        </button>
         
          <div className="flex items-center my-6">
  <hr className="flex-grow border-t border-gray-700" />
  <span className="mx-4 text-gray-400 font-semibold select-none">OR</span>
  <hr className="flex-grow border-t border-gray-700" />
</div>

        {/* Input for new room ID */}
        <input
          type="text"
          placeholder="Enter new room ID"
          value={newRoomId}
          onChange={e => setNewRoomId(e.target.value)}
          className="w-full mb-4 rounded-xl bg-gray-800 border border-teal-600 text-teal-300 placeholder-teal-600 px-4 py-3
                     focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          disabled={creatingRoom}
          maxLength={30}
          spellCheck={false}
          autoComplete="off"
        />

        {/* Create new meeting button */}
        <button
          className={`w-full rounded-2xl px-10 py-4 font-semibold text-xl transition-colors shadow-inner 
                      focus:outline-none focus:ring-4 focus:ring-teal-400 focus:ring-offset-2
                      ${
                        creatingRoom || !newRoomId.trim()
                          ? "bg-teal-700 text-white cursor-not-allowed"
                          : "border border-teal-600 text-teal-400 hover:bg-teal-700 hover:text-white"
                      }`}
          onClick={handleCreateRoom}
          title="Create a new meeting room"
          disabled={creatingRoom || !newRoomId.trim()}
        >
          {creatingRoom ? "Creating Meeting..." : "Create New Meeting"}
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
  
<div className="flex h-screen w-full flex-col text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
  {/* Enhanced Error/Success Toast System */}
  {connectionError && (
    <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl max-w-sm transform transition-all duration-500 ease-in-out ${
      connectionError.type === 'error' ? 'bg-gradient-to-r from-red-600 to-red-700 border-l-4 border-red-400' : 
      connectionError.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-l-4 border-amber-300' : 
      'bg-gradient-to-r from-green-600 to-emerald-700 border-l-4 border-green-400'
    } backdrop-blur-sm border border-white/10`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          connectionError.type === 'error' ? 'bg-red-100' : 
          connectionError.type === 'warning' ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          <span className={`material-symbols-outlined text-sm ${
            connectionError.type === 'error' ? 'text-red-600' : 
            connectionError.type === 'warning' ? 'text-amber-600' : 'text-green-600'
          }`}>
            {connectionError.type === 'error' ? 'error' : 
             connectionError.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">
            {connectionError.type === 'error' ? 'Connection Error' : 
             connectionError.type === 'warning' ? 'Warning' : 'Success'}
          </p>
          <p className="text-xs text-white/90 mt-1">{connectionError.message}</p>
          {connectionError.type === 'error' && (
            <button 
              onClick={() => {/* Add retry logic */}}
              className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-all duration-200"
            >
              Retry
            </button>
          )}
        </div>
        <button 
          onClick={() => setConnectionError(null)}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  )}

  {/* Screen reader announcements */}
  <div className="sr-only" aria-live="polite" aria-atomic="true">
    {participants.length} participant{participants.length !== 1 ? 's' : ''} in the call
  </div>

  {/* Enhanced Header with Glass Effect */}
  <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/20 backdrop-blur-xl">
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <span className="material-symbols-outlined text-xl">videocam</span>
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
          connectionHealth === 'good' ? 'bg-green-500' :
          connectionHealth === 'poor' ? 'bg-red-500' :
          'bg-yellow-500'
        }`} title={`Connection: ${connectionHealth}`}></div>
      </div>
      
      <div>
        <h1 className="text-xl font-bold text-white">Team Sync</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Room: {roomId}</span>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      {isConnecting && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Connecting...</span>
        </div>
      )}
      
      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowChat((v) => !v)} 
          className={`relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            showChat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
          title={showChat ? "Hide Chat" : "Show Chat"}
        >
          <span className="material-symbols-outlined text-lg">chat</span>
          {unreadMessages > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </div>
          )}
        </button>
        
        <button 
          onClick={() => setShowParticipants((v) => !v)} 
          className={`p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            showParticipants ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
          title={showParticipants ? "Hide Panel" : "Show Panel"}
        >
          <span className="material-symbols-outlined text-lg">group</span>
        </button>

        {/* Settings Button */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          title="Settings"
        >
          <span className="material-symbols-outlined text-lg">settings</span>
        </button>
      </div>
    </div>
  </header>
  
  {/* Main Content Area */}
  <main className="flex flex-1 overflow-hidden">
    {/* Enhanced Participants Panel */}
    {showParticipants && (
      <aside className="w-80 flex-shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Participants</h3>
            <div className="text-sm text-gray-400 bg-white/10 px-2 py-1 rounded-full">
              {participants.length}
            </div>
          </div>
          
          <div className="space-y-2">
            {participants.map((participant) => (
              <div 
                key={participant.id} 
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  focusedParticipant?.id === participant.id 
                    ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-400/50 shadow-lg' 
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
                onClick={() => {
                  if (!focusMode) setFocusMode(true);
                  setFocusedParticipantId(participant.id);
                }}
              >
                <div className="relative h-12 w-12 flex-shrink-0">
                  <img
                    alt={`${participant.name}'s avatar`}
                    className="h-full w-full object-cover rounded-xl border-2 border-white/20"
                    src={participant.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(participant.name || "U")}`}
                  />
                  {/* Speaking Indicator */}
                  {participant.isSpeaking && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-gray-800"></div>
                  )}
                  {/* Connection Status */}
                  <div className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border border-gray-800 ${
                    participant.connectionStatus === 'connected' ? 'bg-green-500' :
                    participant.connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {participant.name}
                    </span>
                    {participant.isLocal && (
                      <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/50">
                        You
                      </span>
                    )}
                    {participant.isHost && (
                      <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/50">
                        Host
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span>{getStreamType(participant)}</span>
                    {participant.networkQuality && (
                      <>
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                        <span className={`${
                          participant.networkQuality === 'excellent' ? 'text-green-400' :
                          participant.networkQuality === 'good' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {participant.networkQuality}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Media Status Icons */}
                <div className="flex gap-1">
                  {!participant.stream?.getAudioTracks().some(t => t.enabled) && (
                    <div className="p-1 bg-red-500/20 rounded-full">
                      <span className="material-symbols-outlined text-red-400 text-sm">mic_off</span>
                    </div>
                  )}
                  {!participant.stream?.getVideoTracks().some(t => t.enabled) && (
                    <div className="p-1 bg-red-500/20 rounded-full">
                      <span className="material-symbols-outlined text-red-400 text-sm">videocam_off</span>
                    </div>
                  )}
                  {participant.isScreenSharing && (
                    <div className="p-1 bg-purple-500/20 rounded-full">
                      <span className="material-symbols-outlined text-purple-400 text-sm">present_to_all</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                  {!participant.isLocal && (
                    <>
                      <button className="p-1 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">volume_off</span>
                      </button>
                      <button className="p-1 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Room Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="text-sm font-medium text-white mb-2">Room Info</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{formatDuration(callDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span className={`${
                  overallConnectionQuality === 'excellent' ? 'text-green-400' :
                  overallConnectionQuality === 'good' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {overallConnectionQuality}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    )}
    
    {/* Video Area */}
    <section className="flex flex-1 flex-col relative">
      {/* Video Container */}
      <div className="flex-1 p-4 relative">
        {focusMode && focusedParticipant ? (
          <div className="h-full flex flex-col gap-4">
            {/* Main Speaker View */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-5xl relative">
                <ParticipantVideo
                  stream={focusedParticipant.stream}
                  isLocal={focusedParticipant.isLocal}
                  isMain={true}
                  avatar={focusedParticipant.avatar}
                  name={focusedParticipant.name}
                  participantCount={1}
                  isLoading={!focusedParticipant.stream}
                />
                
                {/* Speaker Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg overflow-hidden">
                      <img
                        src={focusedParticipant.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(focusedParticipant.name || "U")}`}
                        alt={focusedParticipant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{focusedParticipant.name}</p>
                      <p className="text-gray-300 text-xs">{getStreamType(focusedParticipant)}</p>
                    </div>
                    {focusedParticipant.isSpeaking && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-xs">Speaking</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Thumbnail Strip */}
            {thumbnailParticipants.length > 0 && (
              <div className="flex gap-3 justify-center pb-2 px-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {thumbnailParticipants.map((participant) => (
                    <div 
                      key={participant.id}
                      className="flex-shrink-0 cursor-pointer transform transition-all duration-200 hover:scale-105"
                      onClick={() => setFocusedParticipantId(participant.id)}
                    >
                      <div className="relative">
                        <ParticipantVideo
                          stream={participant.stream}
                          isLocal={participant.isLocal}
                          avatar={participant.avatar}
                          name={participant.name}
                          isThumbnail={true}
                          isLoading={!participant.stream}
                        />
                        {participant.isSpeaking && (
                          <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div 
            className="h-full grid gap-3 p-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridTemplateRows: `repeat(auto-fit, 1fr)`
            }}
          >
            {participants.map((participant) => (
              <div 
                key={participant.id}
                className="relative group"
                onDoubleClick={() => {
                  setFocusMode(true);
                  setFocusedParticipantId(participant.id);
                }}
              >
                <ParticipantVideo
                  stream={participant.stream}
                  isLocal={participant.isLocal}
                  avatar={participant.avatar}
                  name={participant.name}
                  participantCount={participants.length}
                  isLoading={!participant.stream}
                />
                
                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                  <button 
                    onClick={() => {
                      setFocusMode(true);
                      setFocusedParticipantId(participant.id);
                    }}
                    className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-all"
                    title="Focus on participant"
                  >
                    <span className="material-symbols-outlined text-sm">fullscreen</span>
                  </button>
                </div>
                
                {/* Speaking Indicator */}
                {participant.isSpeaking && (
                  <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse pointer-events-none"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {participants.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-400">group</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Waiting for participants</h3>
              <p className="text-gray-400">Share the room link to invite others</p>
              <button 
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Copy Room Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons for Quick Access */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {focusMode && (
          <button 
            onClick={() => setFocusMode(false)}
            className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-xl text-white transition-all duration-200 border border-white/10"
            title="Exit focus mode"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
        )}
        
        {screenSharing && (
          <div className="p-3 bg-purple-600/20 backdrop-blur-sm rounded-xl border border-purple-400/50">
            <div className="flex items-center gap-2 text-purple-300">
              <span className="material-symbols-outlined animate-pulse">present_to_all</span>
              <span className="text-sm font-medium">Sharing Screen</span>
            </div>
          </div>
        )}
      </div>
    </section>
    
    {/* Enhanced Chat Panel */}
    {showChat && (
      <aside className="w-80 flex-shrink-0 border-l border-white/10 bg-black/20 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Chat</h3>
            <div className="flex items-center gap-2">
              {unreadMessages > 0 && (
                <button 
                  onClick={() => setUnreadMessages(0)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full"
                >
                  Mark Read
                </button>
              )}
              <button className="text-gray-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 scroll-smooth"
        >
          <div className="space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-gray-400">chat</span>
                </div>
                <p className="text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 ${msg.isLocal ? 'flex-row-reverse' : ''}`}
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={msg.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(msg.author || "U")}`}
                      alt={msg.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className={`max-w-[70%] ${msg.isLocal ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      msg.isLocal 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                        : 'bg-white/10 text-gray-100 border border-white/10'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${msg.isLocal ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium">{msg.author}</span>
                      <span>•</span>
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.isLocal && msg.status && (
                        <span className={`${
                          msg.status === 'sent' ? 'text-blue-400' :
                          msg.status === 'delivered' ? 'text-green-400' :
                          'text-gray-500'
                        }`}>
                          {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : '○'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Enhanced Message Input */}
        <div className="p-4 border-t border-white/10">
          {typingUsers.length > 0 && (
            <div className="mb-2 text-xs text-gray-400 flex items-center gap-1">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span>
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={messageInputRef}
                type="text"
                placeholder="Type your message..."
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all duration-200"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                maxLength={500}
              />
              
              {/* Character Counter */}
              {message.length > 400 && (
                <div className={`absolute bottom-1 right-1 text-xs px-2 py-1 rounded ${
                  message.length >= 500 ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {message.length}/500
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className={`p-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                message.trim() 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!message.trim()}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </aside>
    )}
  </main>
  
  {/* Enhanced Control Bar */}
  <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl py-4 px-6">
    <div className="flex items-center justify-between">
      {/* Call Duration & Stats */}
      <div className="text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span>{formatDuration(callDuration)}</span>
          <div className={`flex items-center gap-1 ${
            overallConnectionQuality === 'excellent' ? 'text-green-400' :
            overallConnectionQuality === 'good' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
            <span className="text-xs capitalize">{overallConnectionQuality}</span>
          </div>
        </div>
      </div>
      
      {/* Main Controls */}
      <div className="flex items-center justify-center gap-3">
        <button 
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          onClick={handleToggleMic}
          tabIndex={1}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            micOn 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-500/50 shadow-lg shadow-green-600/25" 
              : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500/50 shadow-lg shadow-red-600/25"
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {micOn ? "mic" : "mic_off"}
          </span>
          
          {/* Microphone Level Indicator */}
          {micOn && micLevel > 0 && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
              <div 
                className="h-1 bg-green-400 rounded-full transition-all duration-100"
                style={{ width: `${Math.max(8, micLevel * 40)}px` }}
              ></div>
            </div>
          )}
        </button>
        
        <button 
          aria-label={camOn ? "Turn off camera" : "Turn on camera"}
          onClick={handleToggleCam}
          disabled={screenSharing}
          tabIndex={2}
          className={`group flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            camOn 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-500/50 shadow-lg shadow-green-600/25" 
              : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500/50 shadow-lg shadow-red-600/25"
          } ${screenSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-lg">
            {camOn ? "videocam" : "videocam_off"}
          </span>
        </button>
        
        <button 
          aria-label={screenSharing ? "Stop sharing screen" : "Share screen"}
          onClick={handleToggleScreenShare}
          tabIndex={3}
          className={`group flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            screenSharing 
              ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 focus:ring-purple-500/50 shadow-lg shadow-purple-600/25" 
              : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white focus:ring-gray-500/50 border border-white/20"
          }`}
        >
          <span className="material-symbols-outlined text-lg">present_to_all</span>
        </button>
        
        <div className="w-px h-8 bg-white/20 mx-2"></div>
        
        <button 
          aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
          onClick={handleToggleFocus}
          disabled={participants.length === 0}
          tabIndex={4}
          className="group flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
        >
          <span className="material-symbols-outlined">
            {focusMode ? "grid_view" : "fullscreen"}
          </span>
        </button>
        
        <button 
          aria-label={showChat ? "Hide chat" : "Show chat"}
          onClick={() => setShowChat((v) => !v)}
          tabIndex={5}
          className={`relative group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 border ${
            showChat 
              ? 'bg-blue-600 text-white border-blue-500' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border-white/20'
          }`}
        >
          <span className="material-symbols-outlined">chat</span>
          
          {unreadMessages > 0 && !showChat && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </div>
          )}
        </button>
        
        <button 
          aria-label={showParticipants ? "Hide participants panel" : "Show participants panel"}
          onClick={() => setShowParticipants((v) => !v)}
          tabIndex={6}
          className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 border ${
            showParticipants 
              ? 'bg-blue-600 text-white border-blue-500' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border-white/20'
          }`}
        >
          <span className="material-symbols-outlined">group</span>
        </button>
        
        <div className="w-px h-8 bg-white/20 mx-2"></div>
        
        <button 
          aria-label="Leave call"
          onClick={handleLeave}
          tabIndex={7}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg shadow-red-600/25"
        >
          <span className="material-symbols-outlined text-lg">call_end</span>
        </button>
      </div>
      
      {/* Secondary Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-all duration-200"
          title="Settings"
        >
          <span className="material-symbols-outlined text-sm">settings</span>
        </button>
        
        <button 
          onClick={() => setIsRecording(!isRecording)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isRecording 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
          }`}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          <span className="material-symbols-outlined text-sm">
            {isRecording ? 'stop' : 'radio_button_checked'}
          </span>
        </button>
      </div>
    </div>
  </footer>
</div>
  );
}








