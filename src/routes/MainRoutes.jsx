import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// General Components
import NavBar from '../components/NavBar';
import { useAuth } from '../features/auth/useAuth';

// Pages
import Home from '../pages/Dashboard'; // Landing page (for non-authenticated users)
import Profile from '../pages/Profile';
import Dashboard from '../pages/Dashboard'; // The new Project Hub

// Feature Pages (Updated to accept :projectId)
import Chat from '../pages/Chat';
import DocumentsPage from '../pages/DocumentsPage';
import WhiteboardPage from '../pages/WhiteboardPage';
import VideoConferencePage from '../pages/VideoConferencePage';

// Assumption: You will need a top-level page for Kanban.
import KanbanPage from '../pages/KanbanPage'; 

export default function MainRoutes() {
  const { user } = useAuth();

  // Redirect unauthenticated users to the Login route (handled by AuthRoutes or external)
  if (!user) {
    // Note: If you want Home to be the public landing page, remove the Navigate,
    // but typically authenticated routes should redirect away from the login area.
    return <Navigate to="/login" replace />; 
  }

  // Authenticated User Routes
  return (
    <>
      {/* NavBar is placed here so it appears on all authenticated pages */}
      <NavBar /> 
      <Routes>
        
        {/* 1. Project Management Hub */}
        {/* The primary entry point for authenticated users */}
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Dashboard />} /> 
        
        {/* 2. Project-Scoped Feature Routes */}
        {/* Each feature now requires a project ID to operate */}
        <Route path="/project/:projectId/chat" element={<Chat />} />
        <Route path="/project/:projectId/video" element={<VideoConferencePage />} />
        <Route path="/project/:projectId/documents" element={<DocumentsPage />} />
        <Route path="/project/:projectId/whiteboard" element={<WhiteboardPage />} />
        <Route path="/project/:projectId/kanban" element={<KanbanPage />} /> {/* Assuming this page exists */}
        
        {/* 3. User & Utility Routes */}
        <Route path="/profile" element={<Profile />} />
        
        {/* Fallback for authenticated users: takes them to the Dashboard */}
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </>
  );
}