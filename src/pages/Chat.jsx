import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from '../features/auth/AuthContext';
import { useAuth } from '../features/auth/useAuth';

// ---------------------------------------------------------------------
// --- CONFIGURATION ---
// ---------------------------------------------------------------------
const SOCKET_URL = 'http://localhost:5000'; 
const TYPING_TIMEOUT = 1000; // Time in ms before typing status resets

// Helper to generate a consistent, deterministic avatar URL
// Since the previous attempts had issues, let's keep the generation logic simple and consistent.
const generateAvatarUrl = (identifier) => {
    if (!identifier) return `https://avatar.iran.liara.run/public/1`;
    const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imgIndex = (hash % 10) + 1; // Generates 1-10
    // We use a custom parameter (u=) to ensure the URL resolves to the same image
    return `https://avatar.iran.liara.run/public/${imgIndex}?u=${identifier}`;
};


// ---------------------------------------------------------------------
// --- REAL-TIME CHAT COMPONENT ---
// ---------------------------------------------------------------------

const Chat = ({ projectId = "demo-room-1" }) => {
    const { user } = useAuth(AuthContext);
    const [messages, setMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [socket, setSocket] = useState(null);
    const [onlinePeers, setOnlinePeers] = useState([]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false); 
    const [typingUsers, setTypingUsers] = useState([]); 
    
    const messagesEndRef = useRef(null);
    const popoverRef = useRef(null);
    const typingTimeoutRef = useRef(null); 
    
    // Define the current user and their unique identifier (email)
    const currentSenderIdentifier = user?.email || 'Guest'; 
    const currentUser = {
        ...user,
        name: user?.full_name || user?.email || 'Guest', 
        email: currentSenderIdentifier,
        // ⭐ FIX: Use the consistent generation helper here ⭐
        avatar_url: generateAvatarUrl(currentSenderIdentifier), 
    }; 

    // Scrolls to the bottom of the chat window
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- 1. SOCKET.IO CONNECTION & SETUP ---
    useEffect(() => {
        if (!currentSenderIdentifier || currentSenderIdentifier === 'Guest') return;

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('joinRoom', {
                roomId: projectId,
                name: currentUser.name, // Display name
                avatar: currentUser.avatar_url,
                identifier: currentSenderIdentifier, 
            });
        });

        newSocket.on('chat', (message) => {
            setMessages(prev => [
                ...prev,
                {
                    id: message.sender + message.timestamp + Math.random(),
                    text: message.text,
                    sender: message.sender, // The unique ID/email
                    timestamp: message.timestamp,
                    // Check ownership against the unique ID
                    isOwner: message.sender === currentSenderIdentifier, 
                }
            ]);
            setTimeout(scrollToBottom, 0); 
        });
        
        newSocket.on('presenceUpdate', (peerData) => {
            setOnlinePeers(peerData); 
        });
        
        newSocket.on('typing', ({ identifier, name, isTyping }) => {
            if (identifier === currentSenderIdentifier) return; 
            
            setTypingUsers(prev => {
                if (isTyping && !prev.some(u => u.identifier === identifier)) {
                    return [...prev, { identifier, name }];
                }
                if (!isTyping) {
                    return prev.filter(u => u.identifier !== identifier);
                }
                return prev;
            });
            setTimeout(scrollToBottom, 0);
        });

        newSocket.on('disconnect', () => console.log('Socket Disconnected'));
        newSocket.on('error', (err) => console.error('Socket Error:', err));

        return () => {
            if (newSocket.connected) {
                newSocket.emit('leaveRoom', { roomId: projectId });
            }
            newSocket.close();
        };
    }, [projectId, currentSenderIdentifier, currentUser.name, currentUser.avatar_url]); 

    // --- 2. TYPING INDICATOR EMITTER ---
    const handleTyping = (e) => {
        const text = e.target.value;
        setNewMessageText(text);

        if (!socket) return;

        if (text.length > 0 && typingTimeoutRef.current === null) {
            socket.emit('typing', { roomId: projectId, identifier: currentSenderIdentifier, name: currentUser.name, isTyping: true });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { roomId: projectId, identifier: currentSenderIdentifier, name: currentUser.name, isTyping: false });
            typingTimeoutRef.current = null;
        }, TYPING_TIMEOUT);
    };

    // --- 3. SEND MESSAGE FUNCTION ---
    const handleSend = (e) => {
        e.preventDefault();
        const text = newMessageText.trim();
        if (!text || !socket) return;
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        socket.emit('typing', { roomId: projectId, identifier: currentSenderIdentifier, name: currentUser.name, isTyping: false });

        const messageData = {
            roomId: projectId,
            text: text,
            sender: currentSenderIdentifier, 
            timestamp: Date.now(),
        };

        socket.emit('chat', messageData);

        setMessages(prev => [
            ...prev,
            {
                id: messageData.sender + messageData.timestamp,
                text: messageData.text,
                sender: currentSenderIdentifier, // Store ID locally for avatar generation
                timestamp: messageData.timestamp,
                isOwner: true, 
            }
        ]);
        
        setNewMessageText('');
        setTimeout(scrollToBottom, 0); 
    };
    
    // --- 4. POPUP CONTROL ---
    const popoverHoverProps = {
        onMouseEnter: () => setIsPopoverOpen(true),
        onMouseLeave: () => setIsPopoverOpen(false),
    };

    const onlineCount = onlinePeers.length;
    // Use display name for typing indicator
    const typingNames = typingUsers.map(u => u.name).join(', ');

    // --- 5. RENDERING (Dark Theme Applied) ---
    return (
        <div className="flex flex-col h-[500px] max-w-xl mx-auto my-4 border border-gray-700 rounded-2xl shadow-2xl bg-gray-900 text-gray-100 overflow-hidden font-sans dark">
            
            {/* Header with Presence */}
            <div className="relative p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center shadow-lg z-10">
                <h2 className="text-xl font-extrabold text-white truncate">Room: <span className="text-teal-400">{projectId}</span></h2>
                
                {/* Online Peers Button/Trigger and Popover Container */}
                <div 
                    className="relative"
                    ref={popoverRef}
                    {...popoverHoverProps}
                >
                    <button
                        type="button"
                        className="flex items-center space-x-2 bg-teal-800/30 px-3 py-1 rounded-full text-sm font-semibold text-teal-400 hover:bg-teal-800/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    >
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                        </span>
                        <span>{onlineCount} Online</span>
                    </button>

                    {/* Users Online Popover */}
                    {isPopoverOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-gray-700 border border-gray-600 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                            <div className="p-3 text-sm font-bold border-b border-gray-600 bg-gray-800 text-gray-200">
                                {onlineCount} Active Users
                            </div>
                            <ul className="divide-y divide-gray-600 max-h-48 overflow-y-auto">
                                {onlinePeers.map((peer, index) => (
                                    <li key={peer.id || index} className="flex items-center p-3 hover:bg-gray-600 transition-colors">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 overflow-hidden mr-3">
                                            <img 
                                                // Use identifier (email) for consistent avatar generation
                                                src={generateAvatarUrl(peer.identifier || peer.name)} 
                                                alt={peer.name} 
                                                className="object-cover w-full h-full" 
                                            />
                                        </div>
                                        <span className={`text-sm font-medium ${peer.identifier === currentSenderIdentifier ? 'text-teal-400 font-bold' : 'text-gray-200'}`}>
                                            {peer.name} {peer.identifier === currentSenderIdentifier && ' (You)'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Message List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-900">
                {messages.map((msg) => {
                    const isOwner = msg.isOwner;
                    const senderIdentifier = msg.sender; 
                    
                    const peer = onlinePeers.find(p => p.identifier === senderIdentifier);
                    // Display name from peer data, or default to the unique ID (email), or 'You'
                    const senderDisplayName = isOwner ? 'You' : (peer?.name || senderIdentifier);
                    
                    return (
                        <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                            {!isOwner && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 overflow-hidden mr-2 self-start mt-1">
                                    <img 
                                        src={generateAvatarUrl(senderIdentifier)} 
                                        alt={senderDisplayName} 
                                        className="object-cover w-full h-full" 
                                    />
                                </div>
                            )}
                            
                            <div 
                                className={`flex flex-col max-w-[80%] p-3 rounded-xl shadow-md transition-all duration-300 
                                  ${isOwner 
                                    // Darker Teal for owner messages 
                                    ? 'bg-teal-600 text-white rounded-br-lg rounded-tl-xl' 
                                    // Lighter Gray for others' messages
                                    : 'bg-gray-700 text-gray-100 rounded-tr-xl rounded-bl-lg border border-gray-600'
                                  }`}
                            >
                                <div className={`flex items-center text-xs mb-1 ${isOwner ? 'justify-end' : 'justify-start'}`}>
                                    <span className={`font-semibold ${isOwner ? 'text-teal-200' : 'text-gray-400'}`}>
                                        {senderDisplayName}
                                    </span>
                                    <span className={`mx-2 text-[10px] ${isOwner ? 'text-teal-300' : 'text-gray-500'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm break-words leading-relaxed">{msg.text}</p>
                            </div>
                            
                            {isOwner && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 overflow-hidden ml-2 self-start mt-1">
                                    <img src={currentUser.avatar_url} alt="You" className="object-cover w-full h-full" />
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center justify-start text-sm text-gray-400 italic mt-2 animate-pulse">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 overflow-hidden mr-2">
                             <img 
                                src={generateAvatarUrl(typingUsers[0].identifier)} 
                                alt="typing" 
                                className="object-cover w-full h-full" 
                            />
                        </div>
                        {typingNames} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Form (Footer) */}
            <form className="p-4 border-t border-gray-700 bg-gray-800 flex items-center space-x-3 shadow-inner" onSubmit={handleSend}>
                
                <textarea
                    value={newMessageText}
                    onChange={handleTyping} 
                    placeholder="Type your message..."
                    className="flex-grow p-3 border border-gray-600 rounded-xl focus:ring-teal-500 focus:border-teal-500 resize-none text-sm transition-shadow duration-150 bg-gray-700 text-white placeholder-gray-400"
                    rows="1" 
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            handleSend(e); 
                        } 
                    }}
                />
                <button 
                    type="submit" 
                    disabled={newMessageText.trim().length === 0}
                    className="px-3 py-2 bg-teal-500 text-white rounded-full shadow-lg hover:bg-teal-600 disabled:bg-teal-700/50 transition-all duration-200 flex-shrink-0"
                    title="Send Message"
                >
                  <span className="material-symbols-outlined pt-1">send</span>
                </button>
            </form>
        </div>
    );
};

export default Chat;