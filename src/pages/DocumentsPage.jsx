import React, { useState } from "react";
import DocumentsList from "../components/DocumentsList";
import DocumentEditor from "../components/DocumentEditor";
import { useAuth } from "../features/auth/useAuth";

const DocumentsPage = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const { user } = useAuth();

  return (
    <div className="h-screen  flex bg-gray-900 font-sans text-gray-100">
      {/* Sidebar */}
      <aside className="h-full w-80 min-w-[280px] max-w-[400px] border-r border-gray-900 bg-gray-800 shadow-2xl">
        <DocumentsList
          onSelectDocument={setSelectedDocumentId}
          selectedDocumentId={selectedDocumentId}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-900">
        {selectedDocumentId ? (
          user ? (
            <DocumentEditor
              roomName={`document-${selectedDocumentId}`}
              key={selectedDocumentId}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <p className="p-8 text-xl text-teal-400 font-bold rounded-xl bg-gray-800 shadow-lg">
                Please log in to edit documents.
              </p>
            </div>
          )
        ) : (
          <div className="  flex items-center justify-center bg-gradient-to-br from-teal-900 via-gray-900 to-indigo-900">
            {/* Welcome UI */}
            <div className="m-8 text-center max-w-lg px-8 py-10 bg-gray-900 rounded-2xl shadow-2xl border-2 border-teal-700">
              <div className="text-[4rem] mb-5">📝</div>
              <h3 className="text-3xl font-extrabold text-teal-400 mb-4 tracking-wide">
                Collaborative Documents
              </h3>
              <p className="text-gray-400 mb-7 leading-relaxed text-lg">
                Select a document from the sidebar or create a new document to experience seamless real-time collaboration with your team.
              </p>
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-teal-600 mb-3">
                <h4 className="font-semibold text-teal-300 mb-3 text-lg">✨ Features:</h4>
                <ul className="text-sm text-gray-300 space-y-3 text-left">
                  <li className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-4"></span>
                    Real-time collaborative editing
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-4"></span>
                    Live cursor tracking
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 bg-purple-500 rounded-full mr-4"></span>
                    Automatic conflict resolution
                  </li>
                  <li className="flex items-center">
                    <span className="w-3 h-3 bg-orange-500 rounded-full mr-4"></span>
                    Rich text formatting
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentsPage;
