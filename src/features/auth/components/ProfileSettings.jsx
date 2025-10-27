import React from 'react';
import { useAuth } from '../useAuth';

// Helper for avatar demo: consistent fallback based on user id/email
const generateAvatarUrl = (identifier) => {
  if (!identifier) return `https://avatar.iran.liara.run/public/1`;
  const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imgIndex = (hash % 10) + 1;
  return `https://avatar.iran.liara.run/public/${imgIndex}?u=${identifier}`;
};

export default function ProfileSettings() {
  const { user, signOut } = useAuth();

  if (!user)
    return (
      <div className="max-w-md mx-auto p-8 mt-16 bg-gray-900 text-teal-400 rounded-2xl shadow-2xl text-center font-bold">
        Please log in to view your profile.
      </div>
    );

  const displayName = user.user_metadata?.full_name || user.email || 'Guest';
  const avatarUrl = user.user_metadata?.avatar_url || generateAvatarUrl(user.email);

  return (
    <div className="max-w-md mx-auto mt-10 px-8 py-10 bg-gray-900 border-2 border-teal-600 rounded-2xl shadow-2xl flex flex-col items-center font-sans text-gray-100">
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg border-4 border-teal-500 mb-3 bg-gray-800">
          <img
            src={avatarUrl}
            alt={displayName}
            className="object-cover w-full h-full"
          />
        </div>
        <h2 className="text-2xl font-extrabold text-teal-400 tracking-wide mb-1">{displayName}</h2>
        <span className="text-gray-400 text-sm">{user.email}</span>
      </div>
      <div className="w-full text-left bg-gray-800 rounded-xl shadow px-5 py-4 mb-7">
        <p className="mb-2"><span className="text-teal-300 font-semibold">Email:</span> {user.email}</p>
        <p className="mb-2"><span className="text-teal-300 font-semibold">User ID:</span> {user.id}</p>
        <p className="mb-2"><span className="text-teal-300 font-semibold">Account:</span> {user.user_metadata?.role || 'Member'}</p>
      </div>
      <button
        onClick={signOut}
        className="w-full py-3 mt-3 bg-red-600 text-white rounded-full shadow-lg font-bold transition-colors hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        Logout
      </button>
    </div>
  );
}
