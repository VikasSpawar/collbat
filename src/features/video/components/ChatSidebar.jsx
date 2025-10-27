// frontend/src/features/video/components/ChatSidebar.jsx
import React from "react";

export default function ChatSidebar({ messages, messageInput, setMessageInput, onSendMessage }) {
  return (
    <aside className="w-72 flex-shrink-0 border-l border-primary/20 p-4 dark:border-primary/10 flex flex-col">
      <h3 className="mb-2 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">Chat</h3>
      <div className="flex-grow overflow-y-auto rounded-lg bg-gray-100 p-3 dark:bg-background-dark/50">
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <p key={i} className="text-xs">
              <strong className="text-primary">{msg.author}:</strong> {msg.text}
            </p>
          ))}
        </div>
      </div>
      <form onSubmit={onSendMessage} className="mt-2 flex">
        <input
          type="text"
          placeholder="Type message..."
          className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-primary dark:border-gray-700 dark:focus:border-primary"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button
          type="submit"
          className="ml-2 rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary-700 focus:outline-none"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </form>
    </aside>
  );
}
