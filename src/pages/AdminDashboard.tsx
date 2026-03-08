import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import EmbeddedMap from "../components/EmbeddedMap";
import { FiCheck, FiX, FiSettings, FiSave, FiHelpCircle, FiPackage, FiUsers, FiGrid, FiTruck } from "react-icons/fi";
import AdminGuide from "../components/guides/AdminGuide";

type Tab = "overview" | "orders" | "riders" | "customers";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [pricePerKm, setPricePerKm] = useState<number>(20);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchData();
    const sub1 = supabase.channel("admin_orders").on("postgres_changes", { event: "*", schema: "public", table: "vyahe_orders" }, () => fetchOrders()).subscribe();
    const sub2 = supabase.channel("admin_users").on("postgres_changes", { event: "*", schema: "public", table: "vyahe_ridercustomer_users" }, () => fetchUsers()).subscribe();
    return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); };
  }, []);

  const fetchData = async () => { await Promise.all([fetchOrders(), fetchUsers(), fetchSettings()]); };

  const fetchOrders = async () => {
    const { data } = await supabase.from("vyahe_orders").select(`*, customer:vyahe_ridercustomer_users!vyahe_orders_customer_id_fkey(*)`).order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("vyahe_ridercustomer_users").select("*");
    setUsers(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("vyahe_settings").select("*").single();
    if (data) setPricePerKm(data.price_per_km);
  };

  const updateSettings = async () => {
    await supabase.from("vyahe_settings").update({ price_per_km: pricePerKm }).eq("id", "global_settings");
    alert("Settings updated");
  };

  const updateOrder = async (id: string, updates: any) => {
    await supabase.from("vyahe_orders").update(updates).eq("id", id);
    setSelectedOrder(null); fetchOrders();
  };

  const pending = orders.filter(o => o.status === "pending_approval");
  const riders = users.filter(u => u.role === "Rider");
  const customers = users.filter(u => u.role === "Customer");

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Admin</h2>
        <div className="flex gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded-xl border dark:border-gray-700">
           <span className="text-sm dark:text-gray-300 hidden sm:inline">Fee/Km:</span>
           <input type="number" value={pricePerKm} onChange={e => setPricePerKm(Number(e.target.value))} className="w-12 text-center border rounded dark:bg-gray-700 dark:text-white" />
           <button onClick={updateSettings} className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FiSave/></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[{id:"overview", icon:<FiGrid/>}, {id:"orders", icon:<FiPackage/>}, {id:"riders", icon:<FiTruck/>}, {id:"customers", icon:<FiUsers/>}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`flex items-center gap-2 px-4 py-2 rounded-full capitalize whitespace-nowrap ${activeTab===t.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 dark:text-gray-300"}`}>
            <span className="text-lg">{t.icon}</span> {t.id}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm"><p className="text-xs text-gray-500 font-bold uppercase">Orders</p><p className="text-2xl font-bold dark:text-white">{orders.length}</p></div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-green-500 shadow-sm"><p className="text-xs text-gray-500 font-bold uppercase">Revenue</p><p className="text-2xl font-bold dark:text-white">₱{orders.reduce((a,o)=>a+(o.status==='delivered'?o.delivery_fee:0),0)}</p></div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-purple-500 shadow-sm"><p className="text-xs text-gray-500 font-bold uppercase">Riders</p><p className="text-2xl font-bold dark:text-white">{riders.filter(r=>r.is_online).length} <span className="text-sm font-normal text-gray-400">/ {riders.length}</span></p></div>
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm"><p className="text-xs text-gray-500 font-bold uppercase">Customers</p><p className="text-2xl font-bold dark:text-white">{customers.length}</p></div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <h3 className="font-bold mb-4 dark:text-white">Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1 dark:text-gray-300"><span>Riders</span><span>{Math.round((riders.length/(users.length||1))*100)}%</span></div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3"><div className="bg-purple-500 h-3 rounded-full" style={{width: `${(riders.length/(users.length||1))*100}%`}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 dark:text-gray-300"><span>Customers</span><span>{Math.round((customers.length/(users.length||1))*100)}%</span></div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{width: `${(customers.length/(users.length||1))*100}%`}}></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders */}
      {activeTab === "orders" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3 max-h-[80vh] overflow-y-auto">
            {pending.map(o => (
              <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-4 rounded-xl border cursor-pointer ${selectedOrder?.id===o.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800 dark:border-gray-700"}`}>
                <div className="flex justify-between"><span className="font-bold dark:text-white">#{o.id.slice(0,6)}</span> <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PENDING</span></div>
                <p className="text-sm dark:text-gray-300 mt-1 truncate">{o.pickup_address}</p>
              </div>
            ))}
            <div className="border-t pt-2 dark:border-gray-700"><p className="text-xs font-bold text-gray-500">HISTORY</p></div>
            {orders.filter(o => o.status !== "pending_approval").map(o => (
              <div key={o.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 opacity-75">
                <div className="flex justify-between"><span className="font-bold dark:text-white">{o.customer?.name}</span> <span className="text-xs uppercase">{o.status}</span></div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden sticky top-4">
                <EmbeddedMap center={selectedOrder.pickup_lat ? [selectedOrder.pickup_lat, selectedOrder.pickup_lng!] : [14.5995, 120.9842]} zoom={13} className="h-64 w-full" />
                <div className="p-4">
                  <h3 className="text-xl font-bold dark:text-white mb-4">Order #{selectedOrder.id.slice(0,6)}</h3>
                  <div className="space-y-2 mb-4 text-sm dark:text-gray-300">
                    <p><strong>Pickup:</strong> {selectedOrder.pickup_address}</p>
                    <p><strong>Dropoff:</strong> {selectedOrder.delivery_address}</p>
                    <p><strong>Total:</strong> ₱{selectedOrder.total_amount}</p>
                  </div>
                  {selectedOrder.status === "pending_approval" && (
                    <div className="flex gap-2">
                      <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} className="border rounded px-3 w-24 dark:bg-gray-700 dark:text-white" />
                      <button onClick={()=>updateOrder(selectedOrder.id, {status:"cancelled"})} className="px-4 border rounded text-red-600"><FiX/></button>
                      <button onClick={()=>updateOrder(selectedOrder.id, {status:"approved", delivery_fee: deliveryFee, total_amount: selectedOrder.total_amount - selectedOrder.delivery_fee + deliveryFee})} className="flex-1 px-4 bg-blue-600 text-white rounded font-bold">Approve</button>
                    </div>
                  )}
                </div>
              </div>
            ) : <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">Select an order</div>}
          </div>
        </div>
      )}

      {/* Users */}
      {(activeTab === "riders" || activeTab === "customers") && (
        <div className="space-y-3">
          {(activeTab === "riders" ? riders : customers).map(u => (
            <div key={u.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.role==='Rider'?'bg-purple-500':'bg-blue-500'}`}>{u.name.charAt(0)}</div>
                <div><p className="font-bold dark:text-white">{u.name}</p><p className="text-xs text-gray-500">{u.phone}</p></div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${u.is_online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{u.is_online ? "ONLINE" : "OFFLINE"}</span>
            </div>
          ))}
        </div>
      )}
      
      <button onClick={() => setShowGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg z-40"><FiHelpCircle size={24}/></button>
      <AdminGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}