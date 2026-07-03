import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface UserProfile {
  id: string;
  nama: string;
  email: string;
  role: "kepala_sekolah" | "tu" | "guru";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  mustChangePassword: boolean;
  clearMustChangePassword: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  mustChangePassword: false,
  clearMustChangePassword: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
        setMustChangePassword(
          !!session.user.user_metadata?.must_change_password,
        );
      } else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
        setMustChangePassword(
          !!session.user.user_metadata?.must_change_password,
        );
      } else {
        setUser(null);
        setMustChangePassword(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) setUser(data);
    setLoading(false);
  };

  const clearMustChangePassword = () => setMustChangePassword(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mustChangePassword,
        clearMustChangePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
