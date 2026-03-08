import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import { FiCheckCircle, FiNavigation, FiMessageSquare, FiHelpCircle, FiMap, FiArrowRight, FiDollarSign } from "react-icons/fi";
import Chat from "../components/Chat";
import RiderGuide from "../components/guides/RiderGuide";
import EmbeddedMap from "../components/EmbeddedMap";

interface RiderDashboardProps {
  selectedPage: string;
  onHeaderLogout?: (callback: (option: string) => void) => void;
  registerBell?: (callback: () => void) => void;
  setUnreadCount?: (count: number) => void;
}

export default function RiderDashboard({ selectedPage }: RiderDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [rider, setRider] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [mapOrder, setMapOrder] = useState<Order | null>(null);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenRiderGuide");
    if (!hasSeenGuide) { setShowGuide(true); localStorage.setItem("hasSeenRiderGuide", "true"); }
    fetchRiderProfile();
  }, []);

  useEffect(() => {
    if (rider) {
      fetchOrders();
      const sub = supabase.channel("rider_orders").on("postgres_changes", { event: "*", schema: "public", table: "VYAHE_orders" }, () => fetchOrders()).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [rider]);

  const fetchRiderProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("vyahe_ridercustomer_users").select("*").eq("id", user.id).single();
      setRider(data);
    }
  };

  const fetchOrders = async () => {
    if (!rider) return;
    const { data: myOrders } = await supabase.from("VYAHE_orders").select(`*, customer:vyahe_ridercustomer_users!orders_customer_id_fkey(*)`).eq("rider_id", rider.id).neq("status", "completed").order("created_at", { ascending: false });
    const { data: avail } = await supabase.from("VYAHE_orders").select(`*, customer:vyahe_ridercustomer_users!orders_customer_id_fkey(*)`).eq("status", "approved").order("created_at", { ascending: false });
    setOrders(myOrders || []);
    setAvailableOrders(avail || []);
    setLoading(false);
  };

  const claimOrder = async (orderId: string) => {
    if (!rider) return;
    await supabase.from("VYAHE_orders").update({ rider_id: rider.id, status: "assigned", assigned_at: new Date().toISOString() }).eq("id", orderId);
    fetchOrders();
  };

  const updateStatus = async (orderId: string, status: string) => {
    const updateData: any = { status };
    if (status === "delivered") updateData.delivered_at = new Date().toISOString();
    await supabase.from("VYAHE_orders").update(updateData).eq("id", orderId);
    fetchOrders();
  };

  // Calculate earnings from local state
  const todaysEarnings = orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + curr.delivery_fee, 0);

  if (loading) return <div className="p-8 text-center text-gray-600 dark:text-gray-300">Loading...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-white">
          <p className="text-xs opacity-80 uppercase font-bold tracking-wide">Today's Earnings</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xl opacity-75"><FiDollarSign /></span>
            <span className="text-3xl font-extrabold">{todaysEarnings.toFixed(0)}</span>
          </div>
        </div>
        <div className={`p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center cursor-pointer transition-colors ${rider?.is_online ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          onClick={async () => {
            if (!rider) return;
            const newState = !rider.is_online;
            await supabase.from("vyahe_ridercustomer_users").update({ is_online: newState }).eq("id", rider.id);
            setRider({ ...rider, is_online: newState });
          }}
        >
          <p className="text-xs uppercase font-bold tracking-wide mb-1">Status</p>
          <span className="text-lg font-bold">{rider?.is_online ? "YOU ARE ONLINE" : "GO ONLINE"}</span>
        </div>
      </div>

      {selectedPage === "dashboard" && (
        <div className="space-y-8">
          {/* Section: Active Deliveries */}
          {orders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="text-green-500"><FiCheckCircle /></span> Current Deliveries
              </h3>
              {orders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
                    <span className="font-bold text-gray-800 dark:text-white text-lg">{order.customer?.name}</span>
                    <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 rounded-full uppercase tracking-wider">{order.status}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2 relative pl-4 border-l-2 border-dashed border-gray-300 dark:border-gray-600 ml-1">
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Pickup</p>
                        <p className="text-sm font-medium dark:text-gray-200">{order.pickup_address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Dropoff</p>
                        <p className="text-sm font-medium dark:text-gray-200">{order.delivery_address}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setMapOrder(order)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 transition">
                        <FiMap /> Map
                      </button>
                      <button onClick={() => setActiveChatOrder(order)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition">
                        <FiMessageSquare /> Chat
                      </button>
                    </div>

                    {/* Action Slide Button */}
                    <div className="pt-2">
                      {order.status === "assigned" && (
                        <button onClick={() => updateStatus(order.id, "picked_up")} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                          Confirm Pickup <FiArrowRight />
                        </button>
                      )}
                      {order.status === "picked_up" && (
                        <button onClick={() => updateStatus(order.id, "delivered")} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                          Complete Delivery <FiCheckCircle />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section: Available Orders */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-blue-500"><FiNavigation /></span> New Requests
            </h3>
            {availableOrders.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-400">Searching for nearby orders...</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:border-blue-400 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">EARN ₱{order.delivery_fee}</div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">₱{order.total_amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Cash Payment</p>
                  </div>
                  <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      <p className="line-clamp-1">{order.pickup_address}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                      <p className="line-clamp-1">{order.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setMapOrder(order)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300"><FiMap /></button>
                    <button onClick={() => claimOrder(order.id)} className="flex-1 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition">Accept Order</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeChatOrder && rider && <Chat orderId={activeChatOrder.id} currentUser={rider} otherUser={{ id: activeChatOrder.customer_id, name: activeChatOrder.customer?.name || "Customer" }} onClose={() => setActiveChatOrder(null)} />}

      {/* Full Screen Map Modal */}
      {mapOrder && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="p-4 shadow flex justify-between items-center z-10 bg-white dark:bg-gray-900">
            <h3 className="font-bold text-lg dark:text-white">Location Details</h3>
            <button onClick={() => setMapOrder(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-bold">Close</button>
          </div>
          <div className="flex-1 relative">
            <EmbeddedMap
              center={mapOrder.pickup_lat ? [mapOrder.pickup_lat, mapOrder.pickup_lng!] : [14.5995, 120.9842]}
              zoom={13}
              markers={[
                ...(mapOrder.pickup_lat ? [{ lat: mapOrder.pickup_lat!, lng: mapOrder.pickup_lng!, popup: "Pickup" }] : []),
                ...(mapOrder.delivery_lat ? [{ lat: mapOrder.delivery_lat!, lng: mapOrder.delivery_lng!, popup: "Dropoff" }] : [])
              ]}
              className="h-full w-full"
            />
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
            <p className="text-sm font-bold text-gray-500 uppercase">Pickup</p>
            <p className="mb-2 dark:text-white">{mapOrder.pickup_address}</p>
            <p className="text-sm font-bold text-gray-500 uppercase">Dropoff</p>
            <p className="dark:text-white">{mapOrder.delivery_address}</p>
          </div>
        </div>
      )}

      <button onClick={() => setShowGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg z-40"><FiHelpCircle size={24} /></button>
      <RiderGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}