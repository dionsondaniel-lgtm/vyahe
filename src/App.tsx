import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import { supabase } from "./supabaseClient";
import { UserProfile } from "./types";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure profile exists without blocking indefinitely
  const ensureUserProfile = async (authUser: any) => {
    try {
      // Use correct lowercase table name
      const { data, error } = await supabase
        .from("vyahe_ridercustomer_users")
        .select("id")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!data) {
        const { full_name, name, phone, role } = authUser.user_metadata || {};
        const userName = full_name || name || authUser.email?.split('@')[0];
        
        if (role) {
          await supabase
            .from("vyahe_ridercustomer_users")
            .insert([{
              id: authUser.id,
              name: userName,
              email: authUser.email,
              phone: phone || "",
              role: role,
              is_online: false
            }]);
        }
      }
    } catch (e) {
      console.warn("Profile check skipped due to error:", e);
    }
  };

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    const initAuth = async () => {
      try {
        // 1. Get Session from local storage (fast)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          // 2. If user exists, try to sync profile but don't block UI forever
          // We wrap the DB call in a timeout race too
          const profilePromise = ensureUserProfile(session.user);
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000)); // 3s max for profile check
          
          await Promise.race([profilePromise, timeoutPromise]);
          
          setUser(session.user as any);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user as any);
        // Run profile check in background
        ensureUserProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async (option?: string) => {
    if (user && user.role === "Rider" && option === "offline") {
      await supabase
        .from("vyahe_ridercustomer_users")
        .update({ is_online: false })
        .eq("id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAuthSuccess = async (u: any) => {
    setUser(u);
    await ensureUserProfile(u);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
          <p className="text-lg font-light tracking-widest">CONNECTING TO VYAHE...</p>
        </div>
        {/* Fail-safe button if it gets stuck */}
        <button 
          onClick={() => setLoading(false)}
          className="mt-8 text-xs text-gray-500 hover:text-white underline"
        >
          Taking too long? Skip loading
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" replace />} />
        <Route path="/login" element={!user ? <Login onLogin={handleAuthSuccess} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register onLogin={handleAuthSuccess} /> : <Navigate to="/dashboard" replace />} />
        
        <Route
          path="/dashboard/*"
          element={
            user ? (
              <Dashboard
                onLogout={handleLogout}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}