import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FiX, FiShield, FiFileText, FiSmartphone, FiShare, FiSettings } from "react-icons/fi";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy" | "install";
}

export default function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  if (!isOpen) return null;

  const content = {
    terms: {
      title: "Terms and Conditions",
      icon: <span className="text-blue-500"><FiFileText size={24} /></span>,
      body: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          <p><strong>1. Introduction</strong><br/>Welcome to VYAHE. By using our app, you agree to these terms.</p>
          <p><strong>2. Service Description</strong><br/>VYAHE connects customers with riders for delivery services. We are a platform, not a logistics provider.</p>
          <p><strong>3. User Responsibilities</strong><br/>You agree to provide accurate information and use the service legally. Prohibited items include illegal substances, weapons, and hazardous materials.</p>
          <p><strong>4. Payments</strong><br/>Payments are calculated based on distance and demand. Users agree to pay the total amount shown upon booking.</p>
          <p><strong>5. Cancellations</strong><br/>Cancellations are allowed before the rider picks up the item. Excessive cancellations may lead to account suspension.</p>
          <p><strong>6. Liability</strong><br/>VYAHE is not liable for lost or damaged items, though we will assist in resolving disputes.</p>
        </div>
      )
    },
    privacy: {
      title: "Privacy Policy",
      icon: <span className="text-green-500"><FiShield size={24} /></span>,
      body: (
        <div className="space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          <p><strong>1. Data Collection</strong><br/>We collect your name, phone number, email, and location data to facilitate deliveries.</p>
          <p><strong>2. Data Usage</strong><br/>Your data is used to match you with riders/customers and improve our service. We do not sell your data.</p>
          <p><strong>3. Location Tracking</strong><br/>Real-time location is tracked only during active deliveries for safety and transparency.</p>
          <p><strong>4. Data Security</strong><br/>We use industry-standard encryption to protect your personal information.</p>
          <p><strong>5. User Rights</strong><br/>You have the right to request deletion of your data by contacting support.</p>
        </div>
      )
    },
    install: {
      title: "Install VYAHE App",
      icon: <span className="text-purple-500"><FiSmartphone size={24} /></span>,
      body: (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4 text-blue-600">
              <FiSmartphone size={32} />
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Add VYAHE to your home screen for quick access and a full-screen experience.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-white text-sm">
              <span className="text-blue-500"><FiShare size={16} /></span> iOS (iPhone/iPad)
            </h4>
            <ol className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Tap the <strong>Share</strong> button in Safari's menu bar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold mb-2 flex items-center gap-2 dark:text-white text-sm">
              <span className="text-green-500"><FiSettings size={16} /></span> Android (Chrome)
            </h4>
            <ol className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>Tap the <strong>Three Dots</strong> menu in the browser.</li>
              <li>Tap <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</li>
              <li>Confirm by tapping <strong>Add</strong>.</li>
            </ol>
          </div>
        </div>
      )
    }
  };

  const { title, icon, body } = content[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                {icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
          
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {body}
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-lg shadow-gray-500/20"
            >
              {type === 'install' ? 'Got it' : 'I Understand'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}