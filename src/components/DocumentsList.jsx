import React, { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { supabase } from '../Services/SupabaseClient';

const BACKEND_BASE_URL = 'http://localhost:5000';

const DocumentsList = ({ onSelectDocument, selectedDocumentId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const getAuthHeaders = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.access_token) {
        throw new Error('No active session or access token');
      }
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json',
      };
    } catch (error) {
      throw error;
    }
  };

  const fetchDocuments = async () => {
    try {
      setError(null);
      if (!user) {
        setDocuments([]);
        return;
      }
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_BASE_URL}/api/documents`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
      }
      const data = await response.json();
      setDocuments(data || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    const title = prompt('Enter document title:');
    if (!title || title.trim() === '') return;
    setCreating(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_BASE_URL}/api/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title.trim(), project_id: null }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Create failed'}`);
      }
      const newDoc = await response.json();
      setDocuments(prev => [newDoc, ...prev]);
      onSelectDocument(newDoc.id);
    } catch (error) {
      setError(error.message);
      alert('Error creating document: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"?`)) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_BASE_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Delete failed'}`);
      }
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      if (selectedDocumentId === docId) {
        onSelectDocument(null);
      }
    } catch (error) {
      alert('Error deleting document: ' + error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-7">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-8">
            <div className="h-8 bg-gray-800 rounded w-32"></div>
            <div className="h-10 bg-gray-800 rounded w-28"></div>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-7 bg-gray-800 border-b border-teal-700 flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-teal-400">Documents</h2>
        <button
          onClick={handleCreateDocument}
          disabled={creating}
          className="bg-teal-600 hover:bg-teal-500 disabled:bg-teal-700 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center space-x-2 shadow-lg"
        >
          {creating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span className="text-xl font-extrabold">+</span>
              <span>New Document</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 mx-7 p-4 bg-red-700 border border-red-800 rounded-xl shadow font-semibold text-white">
          <div className="flex items-center">
            <span className="text-teal-300 mr-2">Error:</span>
            <span className='text-ellipsis line-clamp-1'>{error}</span>
          </div>
          <button
            onClick={fetchDocuments}
            className="mt-2 underline text-teal-300 hover:no-underline text-sm"
          >W'll fix it soon..,
            Try Again
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-7">
        {documents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-6">📝</div>
            <h3 className="text-xl font-bold text-teal-400 mb-3">No Documents Yet</h3>
            <p className="text-gray-400 mb-6">Create your first document to get started with collaborative editing.</p>
            <button
              onClick={handleCreateDocument}
              disabled={creating}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
            >
              Create First Document
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className={`p-5 bg-gray-900 rounded-xl border-2 cursor-pointer transition-all font-semibold hover:shadow-lg group ${
                  selectedDocumentId === doc.id 
                    ? 'border-teal-500 shadow-xl' 
                    : 'border-gray-800 hover:border-teal-700'
                }`}
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-teal-300 truncate">{doc.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Last updated: {formatDate(doc.updated_at)}
                    </p>
                    {doc.projects && (
                      <p className="text-xs text-teal-400 mt-1">
                        📁 {doc.projects.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id, doc.title);
                      }}
                      className="bg-red-600 hover:bg-red-800 text-white px-3 py-1 rounded-xl shadow transition"
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsList;
