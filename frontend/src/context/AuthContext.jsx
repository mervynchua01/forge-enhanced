import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, first_name, last_name, email, role")
      .eq("id", userId)
      .single();

    if (error) {
      return null;
    }

    return {
      _id: data.id,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      role: data.role,
    };
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // If no users row exists yet (e.g. account predates migration), seed one now.
    const existing = await loadProfile(data.user.id);
    if (!existing) {
      const meta = data.user.user_metadata || {};
      await supabase.from("users").upsert({
        id: data.user.id,
        username: meta.username || data.user.email,
        first_name: meta.first_name || "",
        last_name: meta.last_name || "",
        email: data.user.email,
        role: "user",
      });
    }

    // onAuthStateChange handles setSession/setUser — no duplicate call needed here.
  };

  const signUp = async ({ email, password, username, firstName, lastName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from("users")
        .upsert({
          id: data.user.id,
          username,
          first_name: firstName,
          last_name: lastName,
          email,
          role: "user",
        });

      if (profileError) throw profileError;
    }

    if (data.session) {
      const profile = await loadProfile(data.user.id);
      setSession(data.session);
      setUser(profile);
      return profile;
    }

    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data?.session?.user) {
        const profile = await loadProfile(data.session.user.id);
        setSession(data.session);
        setUser(profile);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (nextSession?.user) {
          // Defer the profile query out of this callback: supabase-js fires
          // auth events while still holding its internal auth lock, and
          // supabase.from() needs that same lock to attach the access token.
          // Awaiting the query here deadlocks sign-in.
          setTimeout(() => {
            if (!mounted) return;
            loadProfile(nextSession.user.id).then((profile) => {
              if (mounted) setUser(profile);
            });
          }, 0);
        } else {
          setUser(null);
        }
      },
    );

    init();

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
