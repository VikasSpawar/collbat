import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AuthRoutes from './routes/AuthRoutes';
import MainRoutes from './routes/MainRoutes';
import { useAuth } from './features/auth/useAuth';

export default function App() {
  const { user } = useAuth();


  
  return (
    <Router>
      {user?.email ? <MainRoutes /> : <AuthRoutes />}
    </Router>
  );
}
