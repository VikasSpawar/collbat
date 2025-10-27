import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { supabase } from "../../Services/SupabaseClient";

export function useAuth() {
  const context = useContext(AuthContext);

  // Function to get current JWT access token
  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  // Return existing context with added getToken helper
  return {
    ...context,
    getToken,
  };
}
