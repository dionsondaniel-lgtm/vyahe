import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CustomerDashboard from "./CustomerDashboard";
import RiderDashboard from "./RiderDashboard";
import AdminDashboard from "./AdminDashboard";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import TermsModal from "../components/TermsModal";
import CompleteProfileSetup from "../components/CompleteProfileSetup";
import { UserProfile } from "../types";
import { User } from "@supabase/supabase-js";

interface DashboardProps {
  onLogout: (option?: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Dashboard({ onLogout, darkMode, toggleDarkMode }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalType, setModalType] = useState<"terms" | "privacy" | "install" | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return onLogout();
      setAuthUser(user);

      // Use correct lowercase table name
      const { data, error } = await supabase
        .from("vyahe_ridercustomer_users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setShowProfileSetup(true);
          setLoadingProfile(false);
          return;
        }
        return onLogout();
      }

      setProfile(data as UserProfile);
      setLoadingProfile(false);
    };

    fetchProfile();
  }, [onLogout]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showProfileSetup && authUser) {
    return <CompleteProfileSetup user={authUser} onComplete={() => window.location.reload()} />;
  }

  if (!profile) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar
        role={profile.role}
        selectedPage={selectedPage}
        onSelectPage={setSelectedPage}
        onShowTerms={() => setModalType("terms")}
        onShowPrivacy={() => setModalType("privacy")}
        onShowInstall={() => setModalType("install")}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          user={profile}
          onLogout={onLogout}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          unreadCount={unreadCount}
          onBellClick={() => setUnreadCount(0)}
          onRefresh={() => window.location.reload()}
        />

        <main className="flex-1 overflow-y-auto p-0 md:p-6 relative">
          {profile.role === "Customer" && (
            <CustomerDashboard
              selectedPage={selectedPage}
              setUnreadCount={setUnreadCount}
            />
          )}

          {profile.role === "Rider" && (
            <RiderDashboard
              selectedPage={selectedPage}
              setUnreadCount={setUnreadCount}
            />
          )}

          {profile.role === "Admin" && (
            <AdminDashboard />
          )}
        </main>
      </div>

      {modalType && (
        <TermsModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
        />
      )}
    </div>
  );
}