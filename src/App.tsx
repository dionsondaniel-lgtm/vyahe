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

  // Safety check: if user logs in but table is empty, try to fill it
  const ensureUserProfile = async (user: any) => {
    if (!user) return;

    // Use correct table name
    const { data, error } = await supabase
      .from("vyahe_ridercustomer_users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      const { full_name, name, phone, role } = user.user_metadata || {};
      const userName = full_name || name;
      
      if (userName && role) {
        await supabase
          .from("vyahe_ridercustomer_users")
          .insert([{
            id: user.id,
            name: userName,
            email: user.email,
            phone: phone,
            role: role,
            is_online: false
          }]);
      }
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await ensureUserProfile(session.user);
          setUser(session.user as any);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await ensureUserProfile(session.user);
        setUser(session.user as any);
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
    await ensureUserProfile(u);
    setUser(u);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
          <p className="text-lg font-light tracking-widest">CONNECTING TO VYAHE...</p>
        </div>
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