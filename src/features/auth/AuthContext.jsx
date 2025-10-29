import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '../../services/SupabaseClient';


export const AuthContext = createContext();

// Helper function to create headers based on a session object
const createHeaders = (session) => {
    return session?.access_token
        ? {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Accept': 'application/json',
          }
        : null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [headers, setHeaders] = useState(null); // Keep initial state as null

  useEffect(() => {
    // 1. Initial Session Check (on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setHeaders(createHeaders(session));
    });

    // 2. Auth State Change Listener (for login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // **Crucial: Update both user AND headers on any state change**
      setUser(session?.user || null);
      setHeaders(createHeaders(session)); 
    });
    
    // Cleanup the listener
    return () => listener.subscription.unsubscribe();
  }, []); // Empty dependency array means this runs once on mount

  // ... (Auth functions remain the same)
  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, headers }}>
      {children}
    </AuthContext.Provider>
  );
}