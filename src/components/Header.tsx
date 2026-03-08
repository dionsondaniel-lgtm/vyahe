import { FiBell, FiLogOut, FiRefreshCw, FiMoon, FiSun } from "react-icons/fi";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { UserProfile } from "../types";

interface HeaderProps {
  toggleDarkMode: () => void;
  darkMode: boolean;
  onLogout: (option?: string) => void;
  user: UserProfile;
  onBellClick: () => void;
  onRefresh: () => void;
  unreadCount: number;
}

export default function Header({
  toggleDarkMode,
  darkMode,
  onLogout,
  user,
  onBellClick,
  onRefresh,
  unreadCount,
}: HeaderProps) {
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const displayName = user?.name || "User";
  const role = user?.role || "Customer";

  const handleLogoutClick = () => {
    if (role === "Rider") setShowLogoutMenu(true);
    else onLogout();
  };

  const chooseOption = (option: string) => {
    setShowLogoutMenu(false);
    onLogout(option);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b dark:border-gray-700 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-4 md:hidden">
         {/* Mobile Logo Placeholder if needed */}
         <span className="font-bold text-xl text-blue-600">VYAHE</span>
      </div>

      <div className="hidden md:block">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Welcome back, <span className="text-blue-600 dark:text-blue-400">{displayName}</span>
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
          {role} Dashboard
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBellClick}
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800 animate-pulse" />
          )}
        </button>

        <button
          onClick={onRefresh}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
        >
          <FiRefreshCw size={20} />
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
        >
          {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>

        <div className="relative">
          <button
            onClick={handleLogoutClick}
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500"
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>

          {showLogoutMenu && role === "Rider" && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-700 p-2 animate-in fade-in zoom-in duration-200 origin-top-right">
              <button
                onClick={() => chooseOption("offline")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Go Offline & Logout
              </button>
              <button
                onClick={() => chooseOption("online")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Keep Online & Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
