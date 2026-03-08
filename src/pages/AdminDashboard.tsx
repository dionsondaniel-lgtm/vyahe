import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import EmbeddedMap from "../components/EmbeddedMap";
import { FiCheck, FiX, FiMapPin, FiDollarSign, FiSettings, FiSave, FiHelpCircle, FiDownload, FiPackage, FiUsers, FiGrid, FiTruck, FiUser } from "react-icons/fi";
import AdminGuide from "../components/guides/AdminGuide";

type Tab = "overview" | "orders" | "riders" | "customers";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  
  // Settings State
  const [pricePerKm, setPricePerKm] = useState<number>(20);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenAdminGuide");
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem("hasSeenAdminGuide", "true");
    }

    fetchData();
    fetchSettings();

    const orderSub = supabase
      .channel("admin_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "VYAHE_orders" }, () => fetchOrders())
      .subscribe();

    const userSub = supabase
      .channel("admin_users")
      .on("postgres_changes", { event: "*", schema: "public", table: "vyahe_ridercustomer_users" }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(orderSub);
      supabase.removeChannel(userSub);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchUsers()]);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("VYAHE_orders")
      .select(`*, customer:vyahe_ridercustomer_users!orders_customer_id_fkey(*)`)
      .order("created_at", { ascending: false });
    if (!error) setOrders(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("vyahe_ridercustomer_users")
      .select("*");
    if (!error) setUsers(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("VYAHE_settings").select("*").single();
    if (data) setPricePerKm(data.price_per_km);
  };

  const updateSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("VYAHE_settings")
      .update({ price_per_km: pricePerKm })
      .eq("id", "global_settings");
    if (error) alert("Failed to update settings");
    else alert("Settings updated");
    setSavingSettings(false);
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    const { error } = await supabase
      .from("VYAHE_orders")
      .update({
        status: "approved",
        delivery_fee: deliveryFee,
        total_amount: selectedOrder.total_amount - selectedOrder.delivery_fee + deliveryFee,
      })
      .eq("id", selectedOrder.id);
    if (!error) { setSelectedOrder(null); fetchOrders(); }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!selectedOrder || !confirm("Cancel this order?")) return;
    const { error } = await supabase
      .from("VYAHE_orders")
      .update({ status: "cancelled" })
      .eq("id", selectedOrder.id);
    if (!error) { setSelectedOrder(null); fetchOrders(); }
  };

  // Derived Data for Overview
  const pendingOrders = orders.filter((o) => o.status === "pending_approval");
  const activeOrders = orders.filter((o) => ["approved", "assigned", "picked_up"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "completed");
  const riders = users.filter(u => u.role === "Rider");
  const customers = users.filter(u => u.role === "Customer");
  const onlineRiders = riders.filter(r => r.is_online).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      {/* Header & Settings */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Admin Portal</h2>
        
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-2 text-gray-600 dark:text-gray-300">
            <FiSettings /> <span className="text-sm font-medium">Fee/Km:</span>
          </div>
          <div className="relative">
             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
             <input 
               type="number" 
               value={pricePerKm} 
               onChange={(e) => setPricePerKm(Number(e.target.value))}
               className="w-16 pl-5 pr-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
             />
          </div>
          <button onClick={updateSettings} disabled={savingSettings} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
            <FiSave />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <a href="/supabase_setup.txt" download className="p-2 text-gray-600 hover:text-blue-600"><FiDownload /></a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: <FiGrid /> },
          { id: "orders", label: `Orders (${pendingOrders.length})`, icon: <FiPackage /> },
          { id: "riders", label: `Riders (${riders.length})`, icon: <FiTruck /> },
          { id: "customers", label: `Customers (${customers.length})`, icon: <FiUsers /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-3xl font-bold dark:text-white">{orders.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-gray-500 text-sm">Revenue (Est.)</p>
                <p className="text-3xl font-bold dark:text-white">₱{completedOrders.reduce((acc, o) => acc + o.total_amount, 0).toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                <p className="text-gray-500 text-sm">Active Riders</p>
                <p className="text-3xl font-bold dark:text-white">{onlineRiders} <span className="text-sm font-normal text-gray-400">/ {riders.length}</span></p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                <p className="text-gray-500 text-sm">Total Customers</p>
                <p className="text-3xl font-bold dark:text-white">{customers.length}</p>
              </div>
            </div>

            {/* Simple Visual Chart (CSS Based) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-6 dark:text-white">User Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1 dark:text-gray-300">
                    <span>Riders ({riders.length})</span>
                    <span>{Math.round((riders.length / (users.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div className="bg-purple-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${(riders.length / (users.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 dark:text-gray-300">
                    <span>Customers ({customers.length})</span>
                    <span>{Math.round((customers.length / (users.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${(customers.length / (users.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* List */}
            <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">Pending</h3>
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${
                    selectedOrder?.id === order.id
                      ? "border-blue-500 bg-white dark:bg-gray-800 ring-2 ring-blue-500/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-800 dark:text-white">#{order.id.slice(0, 6)}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">📍 {order.pickup_address}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">🏁 {order.delivery_address}</p>
                </div>
              ))}
              
              <h3 className="font-semibold text-gray-500 uppercase text-xs tracking-wider sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 mt-6">Active & Completed</h3>
              {orders.filter(o => o.status !== "pending_approval").map((order) => (
                <div key={order.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100">
                  <div className="flex justify-between">
                    <span className="font-medium dark:text-gray-200">{order.customer?.name}</span>
                    <span className="text-xs uppercase font-bold text-gray-500">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
                  <div className="h-64 relative z-0">
                    <EmbeddedMap
                      center={selectedOrder.pickup_lat ? [selectedOrder.pickup_lat, selectedOrder.pickup_lng!] : [14.5995, 120.9842]}
                      zoom={13}
                      markers={[
                        ...(selectedOrder.pickup_lat ? [{ lat: selectedOrder.pickup_lat!, lng: selectedOrder.pickup_lng!, popup: "Pickup" }] : []),
                        ...(selectedOrder.delivery_lat ? [{ lat: selectedOrder.delivery_lat!, lng: selectedOrder.delivery_lng!, popup: "Dropoff" }] : [])
                      ]}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold dark:text-white">Order Details</h3>
                      <div className="text-right">
                        <span className="block text-sm text-gray-500">Total Amount</span>
                        <span className="text-2xl font-bold text-blue-600">₱{selectedOrder.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 flex-1"></div>
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          </div>
                          <div className="space-y-4 flex-1">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Pickup From</p>
                              <p className="text-sm font-medium dark:text-gray-200">{selectedOrder.pickup_address}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Deliver To</p>
                              <p className="text-sm font-medium dark:text-gray-200">{selectedOrder.delivery_address}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                        <h4 className="text-sm font-semibold mb-3 dark:text-gray-300">Items</h4>
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <span className="dark:text-gray-400">{item.qty}x {item.name}</span>
                            <span className="font-medium dark:text-gray-200">₱{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedOrder.status === "pending_approval" && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Fee Calculation</label>
                        <div className="flex gap-4">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                            <input
                              type="number"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(Number(e.target.value))}
                              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-white"
                            />
                          </div>
                          <button onClick={handleReject} disabled={loading} className="px-6 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">Reject</button>
                          <button onClick={handleApprove} disabled={loading} className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all font-bold">
                            {loading ? "..." : "Approve Order"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl min-h-[400px]">
                  <p>Select a pending order to review</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIDERS TAB */}
        {activeTab === "riders" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {riders.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4 font-medium dark:text-white">{u.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.phone}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">--</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === "customers" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {customers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4 font-medium dark:text-white">{u.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.phone}</td>
                    <td className="p-4 text-gray-500 text-sm">--</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button onClick={() => setShowGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 z-40">
        <FiHelpCircle size={24} />
      </button>
      <AdminGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}