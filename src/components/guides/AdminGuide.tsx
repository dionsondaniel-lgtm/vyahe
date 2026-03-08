import React from "react";
import { FiX, FiCheckSquare, FiSettings, FiMap } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

interface GuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminGuide({ isOpen, onClose }: GuideProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Admin Guide</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiCheckSquare /> Review Orders
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Check the "Pending Approval" list. Review the order details, items, and locations.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiSettings /> Set Delivery Fee
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set a fair delivery fee based on the distance and complexity. You can also update the global "Price per KM" setting.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiCheckSquare /> Approve or Reject
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Approve" to make the order available to riders. If there's an issue, you can "Reject" the order.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiMap /> Monitor Activity
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Keep an eye on "Active Orders" to track the progress of deliveries and ensure smooth operations.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
              >
                Start Managing
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
