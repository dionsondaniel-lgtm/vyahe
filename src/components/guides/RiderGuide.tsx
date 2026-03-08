import React from "react";
import { FiX, FiMapPin, FiCheckCircle, FiDollarSign } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";

interface GuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RiderGuide({ isOpen, onClose }: GuideProps) {
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
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Rider Guide</h2>
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
                    <FiCheckCircle /> Accept Orders
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Browse available orders in the "Available" tab. Tap "Accept" to assign the delivery to yourself.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiMapPin /> Navigate
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the map to find the pickup and delivery locations. Tap "View Map" for detailed directions.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiCheckCircle /> Update Status
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Keep the customer informed by updating the status: "Picked Up" when you have the item, and "Delivered" when completed.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2">
                    <FiDollarSign /> Collect Payment
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Collect the total amount (Item Price + Delivery Fee) from the customer upon delivery if the payment method is Cash.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
              >
                Start Riding
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
