// frontend/src/features/video/components/ParticipantsSidebar.jsx
import React from "react";

export default function ParticipantsSidebar({ participants, showParticipants }) {
  if (!showParticipants) return null;

  return (
    <aside className="w-72 flex-shrink-0 border-r border-primary/20 p-4 dark:border-primary/10 overflow-y-auto">
      {participants.length > 0 && (
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full">
            <img alt="Main" className="h-full w-full object-cover" src={participants[0].avatar} />
          </div>
          <h2 className="text-lg font-semibold">{participants[0].name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Speaking</p>
        </div>
      )}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
          Participants ({participants.length})
        </h3>
        <ul className="space-y-3">
          {participants.slice(1).map(({ id, name, avatar }) => (
            <li key={id} className="flex items-center gap-3">
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                <img alt={`Avatar ${name}`} className="h-full w-full object-cover" src={avatar} />
              </div>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
