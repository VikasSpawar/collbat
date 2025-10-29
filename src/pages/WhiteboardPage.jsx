import React, { useEffect, useState } from 'react';
import CollaborativeWhiteboard from '../features/whiteboard/components/CollaborativeWhiteboard';
import { useAuth } from '../features/auth/useAuth';
import { AuthContext } from '../features/auth/AuthContext';

const API_ENDPOINT = `${import.meta.env.VITE_BACKEND_BASE_URL}/api/whiteboards`||'http://localhost:5000/api/whiteboards';

const WhiteboardPage = () => {
  const { user, headers } = useAuth(AuthContext);
  const [whiteboards, setWhiteboards] = useState([]);
  const [selectedWhiteboardId, setSelectedWhiteboardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [action, setAction] = useState({ loading: false, error: null });

const fetchBoards = async () => {
  // 1. Start loading state
  setLoading(true);

  try {
    // 2. Await the network request
    const res = await fetch(API_ENDPOINT, { headers });
   
    // 3. Handle non-OK HTTP status codes
    if (!res.ok) {
      throw new Error(`Failed to fetch whiteboards (Status: ${res.status})`);
    }

    // Console logging the response object (can be removed in production)
    // console.log(res);

    // 4. Await JSON parsing
    const data = await res.json();

    // 5. Success state updates
    setWhiteboards(data || []);

    // Select the first board if none is selected
    if (!selectedWhiteboardId && data.length > 0) {
      setSelectedWhiteboardId(data[0].id);
    }

  } catch (err) {
    // 6. Handle any errors (network, non-ok status, or JSON parsing failure)
    setError(err.message);

  } finally {
    // 7. Reset loading state, regardless of success or failure
    setLoading(false);
  }
};

  useEffect(() => { fetchBoards(); }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAction({ loading: true, error: null });
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), project_id: '5e02875e-4d83-4d0f-bacc-a1679990895f' }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Unable to create whiteboard');
        return res.json();
      })
      .then(newBoard => {
        setWhiteboards(prev => [newBoard, ...prev]);
        setSelectedWhiteboardId(newBoard.id);
        setNewName('');
        setCreating(false);
        setAction({ loading: false, error: null });
      })
      .catch(err => {
        setAction({ loading: false, error: err.message });
      });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this whiteboard? This cannot be undone.')) return;
    setAction({ loading: true, error: null });
    fetch(`${API_ENDPOINT}/${id}`, {
      method: 'DELETE',
      headers,
    }).then(() => {
      setWhiteboards(wbs => wbs.filter(wb => wb.id !== id));
      if (selectedWhiteboardId === id && whiteboards.length > 1) {
        setSelectedWhiteboardId(whiteboards.find(wb => wb.id !== id).id);
      } else if (whiteboards.length <= 1) {
        setSelectedWhiteboardId(null);
      }
      setAction({ loading: false, error: null });
    }).catch(err => {
      setAction({ loading: false, error: err.message });
    });
  };

  const handleRename = (id) => {
    if (!renameValue.trim()) return;
    setAction({ loading: true, error: null });
    fetch(`${API_ENDPOINT}/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Rename failed');
        setWhiteboards(ws => ws.map(wb =>
          wb.id === id ? { ...wb, name: renameValue.trim() } : wb
        ));
        setRenamingId(null);
        setRenameValue('');
        setAction({ loading: false, error: null });
      })
      .catch(err => {
        setAction({ loading: false, error: err.message });
      });
  };

  return (
    <div className="flex h-screen bg-gray-900 font-sans text-gray-100">
      {/* Sidebar */}
      <aside className="w-80 bg-gray-800 p-6 border-r border-gray-900 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="font-extrabold text-xl text-teal-400 tracking-tight">Whiteboards</div>
          <button
            className="text-xs px-4 py-2 rounded-full font-bold transition-colors shadow bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50"
            onClick={() => { setCreating(true); setAction({ loading: false, error: null }); }}
            disabled={action.loading}
            title="Add new whiteboard"
          >
            + New
          </button>
        </div>

        {/* Create New Board */}
        {creating && (
          <form className="mb-5 flex space-x-2" onSubmit={handleCreate}>
            <input
              className="border border-gray-700 bg-gray-900 rounded-xl px-3 py-2 flex-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
              placeholder="Board name…"
              value={newName}
              autoFocus
              onChange={e => setNewName(e.target.value)}
              disabled={action.loading}
            />
            <button
              type="submit"
              className="text-xs px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-full text-white font-bold disabled:opacity-50"
              disabled={action.loading || !newName.trim()}
            >
              Create
            </button>
            <button
              type="button"
              className="text-xs px-4 py-2 rounded-full border border-gray-600 bg-gray-900 hover:bg-gray-700 text-gray-400 font-bold"
              onClick={() => { setCreating(false); setNewName(''); }}
              disabled={action.loading}
              tabIndex={-1}
            >
              Cancel
            </button>
          </form>
        )}

        {loading && <p className="text-sm text-teal-400 mb-3 animate-pulse">Loading…</p>}
        {error && <p className="text-sm text-red-500 font-bold mb-3">{error}</p>}
        {action.error && <p className="text-xs text-red-500 font-semibold mb-3">{action.error}</p>}

        {!loading && !error && (
          <ul className="flex-1 overflow-y-auto space-y-2 mt-2">
            {whiteboards.map((wb) => (
              <li key={wb.id} className="flex items-center group py-1">
                {renamingId === wb.id ? (
                  <>
                    <input
                      className="border border-gray-700 bg-gray-900 rounded-xl px-3 py-2 flex-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { handleRename(wb.id); }
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                      }}
                      autoFocus
                      disabled={action.loading}
                    />
                    <button
                      className="ml-2 text-xs px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-full text-white font-bold disabled:opacity-50"
                      onClick={() => handleRename(wb.id)}
                      disabled={action.loading || !renameValue.trim()}
                    >OK</button>
                    <button
                      className="ml-2 text-xs px-4 py-2 rounded-full border border-gray-700 bg-gray-900 hover:bg-gray-700 text-gray-400 font-bold"
                      onClick={() => { setRenamingId(null); setRenameValue(''); }}
                      tabIndex={-1}
                      disabled={action.loading}
                    >Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedWhiteboardId(wb.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl font-bold transition-colors ${
                        selectedWhiteboardId === wb.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-900 text-teal-300 hover:bg-teal-700 hover:text-white'
                      }`}
                    >
                      {wb.name}
                    </button>
                    <button
                      className="ml-2 text-teal-400 hover:text-white text-lg"
                      title="Rename"
                      onClick={() => { setRenamingId(wb.id); setRenameValue(wb.name); }}
                      disabled={action.loading}
                    >✏️</button>
                    <button
                      className="ml-2 text-red-500 hover:text-white text-lg"
                      title="Delete"
                      onClick={() => handleDelete(wb.id)}
                      disabled={action.loading}
                    >🗑️</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-gray-700 pt-4">
          <strong className="text-gray-400">User:</strong>
          <p className="mt-2 text-sm font-semibold text-teal-300">
            {user.user_metadata?.full_name || user.email || 'Guest'}
          </p>
        </div>
      </aside>

      {/* Main panel: Collaborative Whiteboard */}
      <main className="flex-1 bg-gray-900 flex flex-col">
        {selectedWhiteboardId ? (
          <CollaborativeWhiteboard
            whiteboardId={selectedWhiteboardId}
            user={user}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-teal-400 text-lg">
            Select a whiteboard to start collaborating.
          </div>
        )}
      </main>
    </div>
  );
};

export default WhiteboardPage;
