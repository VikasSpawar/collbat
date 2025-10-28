// collbat/src/features/chat/components/ChatWindow.jsx
// ============================================================================
// FULLY FIXED VERSION - All chat bugs resolved
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket'; 
import { useAuth } from '../../auth/useAuth'; 
import usePresence from '../hooks/usePresence'; 
import { supabase } from '../../../services/SupabaseClient'; 
import { Send, Users, AlertCircle } from 'lucide-react';

// Message Component
const Message = React.memo(({ message, isOwn }) => {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!isOwn) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 300);
      return () => clearTimeout(timer);
    }
  }, [message.id, isOwn]); // ✅ FIX: Use message.id instead of message

  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeTitle = new Date(message.timestamp).toLocaleString();

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] lg:max-w-[60%] flex flex-col p-3 rounded-xl shadow-md transition-all duration-200 ${
          isOwn 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : `bg-gray-100 text-gray-800 rounded-tl-none ${isNew ? 'ring-2 ring-indigo-300 transform scale-[1.01]' : ''}`
        }`}
        title={timeTitle}
      >
        {!isOwn && (
          <strong className="block mb-1 text-xs font-semibold text-indigo-500">
            {message.user.split('@')[0]}
          </strong>
        )}
        <p className={`text-sm leading-snug break-words ${isOwn ? 'text-indigo-50' : ''}`}>
          {message.text}
        </p>
        <span className={`self-end mt-1 text-xs font-medium ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
          {time}
        </span>
      </div>
    </div>
  );
});

Message.displayName = 'Message';

// Main ChatWindow Component
export default function ChatWindow() {
  const socket = useSocket();
  const { user } = useAuth();
  const onlineUsers = usePresence();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  
  const ROOM_ID = 'global-chat'; 

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ✅ FIX: Fetch messages from Supabase on mount
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', ROOM_ID)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) {
        console.error('Error fetching messages:', fetchError);
        setError('Failed to load message history');
        return;
      }

      // ✅ FIX: Transform Supabase data to message format with IDs
      const formattedMessages = (data || []).map(msg => ({
        id: msg.id, // ✅ FIX: Include ID from database
        user: msg.user_email,
        text: msg.text,
        timestamp: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Critical error fetching messages:', err);
      setError('Failed to load messages');
    }
  }, [user, ROOM_ID]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ✅ FIX: Socket setup with reconnection handling
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    // Join room
    socket.emit('joinRoom', ROOM_ID);
    setIsConnected(true);
    setError(null);

    // ✅ FIX: Message listener with deduplication
    const handleMessage = (message) => {
      setMessages((prev) => {
        // ✅ FIX: Deduplicate by ID
        if (message.id && prev.some(m => m.id === message.id)) {
          return prev; // Skip duplicate
        }
        // ✅ FIX: Also check by timestamp + user for socket messages without ID yet
        const isDuplicate = prev.some(m => 
          m.timestamp === message.timestamp && 
          m.user === message.user && 
          m.text === message.text
        );
        if (isDuplicate) return prev;
        
        return [...prev, message];
      });
    };

    socket.on('message', handleMessage);

    // ✅ FIX: Handle reconnection
    const handleReconnect = () => {
      console.log('Socket reconnected, rejoining room');
      socket.emit('joinRoom', ROOM_ID);
      setIsConnected(true);
      setError(null);
      // Refetch messages to catch any missed during disconnect
      fetchMessages();
    };

    socket.on('reconnect', handleReconnect);

    // ✅ FIX: Handle disconnect
    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...');
    };

    socket.on('disconnect', handleDisconnect);

    // ✅ FIX: Handle connection errors
    const handleConnectError = (err) => {
      console.error('Socket connection error:', err);
      setError('Connection error. Please refresh the page.');
    };

    socket.on('connect_error', handleConnectError);

    // Cleanup
    return () => {
      socket.off('message', handleMessage);
      socket.off('reconnect', handleReconnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket, ROOM_ID, fetchMessages]);

  // ✅ FIX: Send message with proper ID and error handling
  const sendMessage = useCallback(async () => {
    const currentUserEmail = user?.email;
    const messageText = input.trim();
    
    if (!messageText || !user || !currentUserEmail) {
      return;
    }

    if (!socket || !isConnected) {
      setError('Cannot send message: not connected');
      return;
    }

    // ✅ FIX: Generate unique message ID
    const messageId = crypto.randomUUID();
    
    const baseMessage = {
      id: messageId, // ✅ FIX: Include unique ID
      user: currentUserEmail,
      text: messageText,
      timestamp: new Date().toISOString(), 
    };
    
    // Clear input immediately
    setInput('');
    
    // ✅ FIX: Emit to socket (let socket listener handle UI update to avoid duplication)
    socket.emit('message', baseMessage); 
    
    // ❌ REMOVED: No optimistic update to prevent duplication
    // The socket listener will add the message when server echoes it back
    
    // ✅ FIX: Persist to Supabase with proper error handling
    const persistencePayload = {
      id: messageId, // ✅ FIX: Include ID so we can deduplicate
      user_email: currentUserEmail,
      text: messageText,
      room_id: ROOM_ID,
    };
    
    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert([persistencePayload]);

      if (insertError) {
        console.error('Failed to save message to Supabase:', insertError);
        setError('Message sent but not saved to history');
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Critical error during Supabase operation:', error);
      setError('Failed to save message');
      setTimeout(() => setError(null), 3000);
    }
  }, [input, user, socket, isConnected, ROOM_ID]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Please log in to use chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Team Chat</h1>
          <p className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-600">● Disconnected</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users size={18} />
          <span className="font-semibold">{onlineUsers.length} online</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-6 py-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <Message 
              key={msg.id || `${msg.timestamp}-${msg.user}`} // ✅ FIX: Use ID as key
              message={msg} 
              isOwn={msg.user === user.email} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={!isConnected}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !isConnected}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}