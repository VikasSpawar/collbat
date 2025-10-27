// Remote work collaboration suite/collbat/src/features/auth/AuthContext.jsx
import React, { createContext,  useEffect, useState } from 'react';
import { supabase } from '../../services/SupabaseClient';


export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [headers , setHeaders]=useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {

      setUser(session?.user || null);
      
      setHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Accept': 'application/json',
        })
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Auth functions
  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();
   
  // const getAuthHeaders = async () => {
  //     try {
  //   //  if ( !user || !user.token) {
  //   //       throw new Error('No active session or access token');
  //   //     }
  //       return {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${user?.token}`,
  //         'Accept': 'application/json',
  //       };
  //     } catch (error) {
  //       throw error;
  //     }
  //   };


  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, headers }}>
      {children}
    </AuthContext.Provider>
  );
}