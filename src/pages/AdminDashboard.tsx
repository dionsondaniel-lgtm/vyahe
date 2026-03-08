import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import EmbeddedMap from "../components/EmbeddedMap";
import { FiCheck, FiX, FiMapPin, FiSettings, FiSave, FiHelpCircle, FiDownload, FiPackage, FiUsers, FiGrid, FiTruck, FiChevronRight } from "react-icons/fi";
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

    const orderSub = supabase.channel("admin_orders").on("postgres_changes", { event: "*", schema: "public", table: "VYAHE_orders" }, () => fetchOrders()).subscribe();
    const userSub = supabase.channel("admin_users").on("postgres_changes", { event: "*", schema: "public", table: "vyahe_ridercustomer_users" }, () => fetchUsers()).subscribe();

    return () => {
      supabase.removeChannel(orderSub);
      supabase.removeChannel(userSub);
    };
  }, []);

  const fetchData = async () => { await Promise.all([fetchOrders(), fetchUsers()]); };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("VYAHE_orders").select(`*, customer:vyahe_ridercustomer_users!orders_customer_id_fkey(*)`).order("created_at", { ascending: false });
    if (!error) setOrders(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("vyahe_ridercustomer_users").select("*");
    if (!error) setUsers(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("VYAHE_settings").select("*").single();
    if (data) setPricePerKm(data.price_per_km);
  };

  const updateSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from("VYAHE_settings").update({ price_per_km: pricePerKm }).eq("id", "global_settings");
    if (error) alert("Failed to update settings");
    else alert("Settings updated");
    setSavingSettings(false);
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    const { error } = await supabase.from("VYAHE_orders").update({
        status: "approved",
        delivery_fee: deliveryFee,
        total_amount: selectedOrder.total_amount - selectedOrder.delivery_fee + deliveryFee,
      }).eq("id", selectedOrder.id);
    if (!error) { setSelectedOrder(null); fetchOrders(); }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!selectedOrder || !confirm("Cancel this order?")) return;
    const { error } = await supabase.from("VYAHE_orders").update({ status: "cancelled" }).eq("id", selectedOrder.id);
    if (!error) { setSelectedOrder(null); fetchOrders(); }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending_approval");
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "completed");
  const riders = users.filter(u => u.role === "Rider");
  const customers = users.filter(u => u.role === "Customer");
  const onlineRiders = riders.filter(r => r.is_online).length;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full pb-24">
      {/* Header & Settings */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Admin Portal</h2>
          <button onClick={() => setShowGuide(true)} className="p-2 bg-blue-100 text-blue-600 rounded-full md:hidden"><FiHelpCircle size={20}/></button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <FiSettings /> <span className="text-sm font-medium">Fee/Km:</span>
          </div>
          <div className="relative">
             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
             <input type="number" value={pricePerKm} onChange={(e) => setPricePerKm(Number(e.target.value))}
               className="w-20 pl-5 pr-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          <button onClick={updateSettings} disabled={savingSettings} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
            <FiSave />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <a href="/supabase_setup.txt" download className="p-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 text-sm font-medium">
            <FiDownload /> <span className="hidden sm:inline">SQL</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "overview", label: "Overview", icon: <FiGrid /> },
          { id: "orders", label: `Orders (${pendingOrders.length})`, icon: <FiPackage /> },
          { id: "riders", label: `Riders (${riders.length})`, icon: <FiTruck /> },
          { id: "customers", label: `Customers (${customers.length})`, icon: <FiUsers /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Orders</p>
                <p className="text-2xl md:text-3xl font-bold dark:text-white mt-1">{orders.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Revenue</p>
                <p className="text-2xl md:text-3xl font-bold dark:text-white mt-1">₱{completedOrders.reduce((acc, o) => acc + o.total_amount, 0).toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Online Riders</p>
                <p className="text-2xl md:text-3xl font-bold dark:text-white mt-1">{onlineRiders} <span className="text-sm font-normal text-gray-400">/ {riders.length}</span></p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Customers</p>
                <p className="text-2xl md:text-3xl font-bold dark:text-white mt-1">{customers.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-6 dark:text-white">Platform Activity</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2 dark:text-gray-300">
                    <span className="flex items-center gap-2"><FiTruck /> Riders</span>
                    <span className="font-mono">{Math.round((riders.length / (users.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-purple-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${(riders.length / (users.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 dark:text-gray-300">
                    <span className="flex items-center gap-2"><FiUsers /> Customers</span>
                    <span className="font-mono">{Math.round((customers.length / (users.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${(customers.length / (users.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Order List */}
            <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-1">
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2">
                <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Pending Approval</h3>
              </div>
              {pendingOrders.map((order) => (
                <div key={order.id} onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${
                    selectedOrder?.id === order.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-800 dark:text-white">#{order.id.slice(0, 6)}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">PENDING</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Pickup</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{order.pickup_address}</p>
                    <p className="text-xs text-gray-500 uppercase font-semibold mt-2">Dropoff</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{order.delivery_address}</p>
                  </div>
                </div>
              ))}
              
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2 mt-6">
                <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Active & Recent</h3>
              </div>
              {orders.filter(o => o.status !== "pending_approval").map((order) => (
                <div key={order.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold dark:text-gray-200 block text-sm">{order.customer?.name}</span>
                      <span className="text-xs text-gray-500">#{order.id.slice(0, 6)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
                  <div className="h-56 md:h-72 w-full relative z-0">
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
                  <div className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold dark:text-white">Order Analysis</h3>
                        <p className="text-xs text-gray-500">ID: {selectedOrder.id}</p>
                      </div>
                      <div className="text-left md:text-right bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl">
                        <span className="block text-xs text-gray-500 uppercase font-bold">Total Estimate</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₱{selectedOrder.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900"></div>
                          <div className="w-0.5 h-10 bg-gray-200 dark:bg-gray-700"></div>
                          <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900"></div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Pickup Location</p>
                            <p className="text-sm dark:text-gray-200 leading-snug">{selectedOrder.pickup_address}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Delivery Location</p>
                            <p className="text-sm dark:text-gray-200 leading-snug">{selectedOrder.delivery_address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.status === "pending_approval" && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Delivery Fee</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₱</span>
                            <input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))}
                              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleReject} disabled={loading} className="flex-1 px-4 py-3 rounded-xl border border-red-200 text-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-colors">
                              <FiX size={20} />
                            </button>
                            <button onClick={handleApprove} disabled={loading} className="flex-[2] px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-all flex items-center justify-center gap-2">
                              <FiCheck /> Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl min-h-[400px] bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="opacity-20 mb-4"><FiPackage size={48} /></div>
                  <p>Select a pending order to review details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIDERS & CUSTOMERS TABS (Simplified Mobile View) */}
        {(activeTab === "riders" || activeTab === "customers") && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in duration-300">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-5 p-4 bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">User</div>
              <div>Contact</div>
              <div>Status</div>
              <div>Joined</div>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(activeTab === "riders" ? riders : customers).map(u => (
                <div key={u.id} className="p-4 md:grid md:grid-cols-5 md:items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Mobile Card View */}
                  <div className="md:col-span-2 flex items-center gap-3 mb-2 md:mb-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${u.role === 'Rider' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">{u.name}</p>
                      <p className="text-xs text-gray-500 md:hidden">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 md:mb-0 flex items-center gap-2 md:block">
                    <span className="md:hidden text-xs font-bold text-gray-400 uppercase w-16">Contact:</span>
                    {u.phone}
                  </div>
                  
                  <div className="mb-2 md:mb-0 flex items-center gap-2 md:block">
                    <span className="md:hidden text-xs font-bold text-gray-400 uppercase w-16">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      u.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.is_online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 flex items-center gap-2 md:block">
                    <span className="md:hidden text-xs font-bold text-gray-400 uppercase w-16">Joined:</span>
                    Pending
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button onClick={() => setShowGuide(true)} className="p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95">
          <FiHelpCircle size={24} />
        </button>
      </div>
      <AdminGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}