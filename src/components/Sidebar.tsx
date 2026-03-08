import { FiHome, FiList, FiTruck, FiUsers, FiDownloadCloud } from "react-icons/fi";

interface SidebarProps {
  role: string;
  selectedPage: string;
  onSelectPage: (page: string) => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
  onShowInstall: () => void;
}

export default function Sidebar({ role, onSelectPage, selectedPage, onShowTerms, onShowPrivacy, onShowInstall }: SidebarProps) {
  const menuItems = (() => {
    if (role === "Rider") {
      return [
        { key: "dashboard", label: "Dashboard", icon: <FiHome /> },
        { key: "deliveries", label: "Deliveries", icon: <FiTruck /> },
      ];
    }
    if (role === "Admin") {
      return [
        { key: "dashboard", label: "Overview", icon: <FiHome /> },
        { key: "orders", label: "Manage Orders", icon: <FiList /> },
        { key: "riders", label: "Riders", icon: <FiUsers /> },
      ];
    }
    // Customer
    return [
      { key: "dashboard", label: "Dashboard", icon: <FiHome /> },
      { key: "orders", label: "My Orders", icon: <FiList /> },
    ];
  })();

  return (
    <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 min-h-screen border-r dark:border-gray-700 flex-col shadow-lg z-20 sticky top-0">
      <div className="p-6 border-b dark:border-gray-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
          V
        </div>
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          VYAHE
        </span>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelectPage(item.key)}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 font-medium ${
              selectedPage === item.key
                ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t dark:border-gray-700 space-y-4">
        {/* Install Button */}
        <button 
          onClick={onShowInstall}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium text-sm"
        >
          <FiDownloadCloud size={18} /> Install App
        </button>

        <div className="text-xs text-center text-gray-400 space-y-2">
          <div className="flex justify-center gap-3">
            <button onClick={onShowTerms} className="hover:text-blue-500 transition-colors">Terms</button>
            <span>&bull;</span>
            <button onClick={onShowPrivacy} className="hover:text-blue-500 transition-colors">Privacy</button>
          </div>
          <p>&copy; 2026 VYAHE Inc.</p>
        </div>
      </div>
    </aside>
  );
}