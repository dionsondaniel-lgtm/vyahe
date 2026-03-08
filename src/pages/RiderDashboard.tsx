import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import { FiCheckCircle, FiNavigation, FiMessageSquare, FiHelpCircle, FiMap, FiArrowRight, FiDollarSign } from "react-icons/fi";
import Chat from "../components/Chat";
import RiderGuide from "../components/guides/RiderGuide";
import EmbeddedMap from "../components/EmbeddedMap";

interface RiderProps { selectedPage: string; onHeaderLogout?: any; setUnreadCount?: any; registerBell?: any; }

export default function RiderDashboard({ selectedPage }: RiderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [avail, setAvail] = useState<Order[]>([]);
  const [rider, setRider] = useState<UserProfile | null>(null);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [mapOrder, setMapOrder] = useState<Order | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    fetchProfile();
    const hasSeen = localStorage.getItem("hasSeenRiderGuide");
    if (!hasSeen) { setGuide(true); localStorage.setItem("hasSeenRiderGuide", "true"); }
  }, []);

  useEffect(() => {
    if (rider) {
      fetchOrders();
      const sub = supabase.channel("rider_view").on("postgres_changes", { event: "*", schema: "public", table: "vyahe_orders" }, () => fetchOrders()).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [rider]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("vyahe_ridercustomer_users").select("*").eq("id", user.id).single();
      setRider(data);
    }
  };

  const fetchOrders = async () => {
    if (!rider) return;
    const { data: myOrders } = await supabase.from("vyahe_orders").select(`*, customer:vyahe_ridercustomer_users!vyahe_orders_customer_id_fkey(*)`).eq("rider_id", rider.id).neq("status", "completed").order("created_at", { ascending: false });
    const { data: availOrders } = await supabase.from("vyahe_orders").select(`*, customer:vyahe_ridercustomer_users!vyahe_orders_customer_id_fkey(*)`).eq("status", "approved").order("created_at", { ascending: false });
    setOrders(myOrders || []); setAvail(availOrders || []);
  };

  const claim = async (id: string) => {
    if (!rider) return;
    await supabase.from("vyahe_orders").update({ rider_id: rider.id, status: "assigned", assigned_at: new Date().toISOString() }).eq("id", id);
    fetchOrders();
  };

  const update = async (id: string, status: string) => {
    const pl: any = { status }; if(status === "delivered") pl.delivered_at = new Date().toISOString();
    await supabase.from("vyahe_orders").update(pl).eq("id", id); fetchOrders();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-24">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-white">
          <p className="text-xs font-bold uppercase opacity-80">Today's Earnings</p>
          <p className="text-3xl font-extrabold flex items-center gap-1"><span className="text-xl opacity-75"><FiDollarSign/></span> {orders.filter(o=>o.status==='delivered').reduce((a,c)=>a+c.delivery_fee,0)}</p>
        </div>
        <div onClick={async()=>{ if(!rider)return; const s=!rider.is_online; await supabase.from("vyahe_ridercustomer_users").update({is_online:s}).eq("id",rider.id); setRider({...rider, is_online:s}); }} 
             className={`p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer ${rider?.is_online ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          <p className="text-xs font-bold uppercase tracking-wide">Status</p>
          <span className="text-lg font-bold">{rider?.is_online ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </div>

      {selectedPage === "dashboard" && (
        <div className="space-y-8">
          {orders.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex gap-2 items-center"><span className="text-green-500"><FiCheckCircle/></span> Current Deliveries</h3>
              {orders.map(o => (
                <div key={o.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
                  <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between"><span className="font-bold dark:text-white">{o.customer?.name}</span> <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded uppercase">{o.status}</span></div>
                  <div className="p-4 space-y-3">
                    <div className="pl-3 border-l-2 border-dashed space-y-2">
                      <div><p className="text-xs text-gray-400 uppercase">Pickup</p><p className="text-sm dark:text-gray-200">{o.pickup_address}</p></div>
                      <div><p className="text-xs text-gray-400 uppercase">Dropoff</p><p className="text-sm dark:text-gray-200">{o.delivery_address}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={()=>setMapOrder(o)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><span className="text-lg"><FiMap/></span> Map</button>
                        <button onClick={()=>setChatOrder(o)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><span className="text-lg"><FiMessageSquare/></span> Chat</button>
                    </div>
                    {o.status === "assigned" && <button onClick={()=>update(o.id,"picked_up")} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">Pickup <FiArrowRight/></button>}
                    {o.status === "picked_up" && <button onClick={()=>update(o.id,"delivered")} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">Complete <FiCheckCircle/></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex gap-2 items-center"><span className="text-blue-500"><FiNavigation/></span> Requests</h3>
            {avail.length === 0 ? <p className="text-center text-gray-400 py-8 border-2 border-dashed rounded-2xl">No orders available.</p> : avail.map(o => (
                <div key={o.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow border dark:border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">EARN ₱{o.delivery_fee}</div>
                    <p className="text-2xl font-bold dark:text-white mb-2">₱{o.total_amount}</p>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-4">
                        <p className="truncate">🟦 {o.pickup_address}</p>
                        <p className="truncate">🟥 {o.delivery_address}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={()=>setMapOrder(o)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl"><span className="text-xl"><FiMap/></span></button>
                        <button onClick={()=>claim(o.id)} className="flex-1 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl">Accept</button>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {chatOrder && rider && <Chat orderId={chatOrder.id} currentUser={rider} otherUser={{id: chatOrder.customer_id, name: chatOrder.customer?.name || "Customer"}} onClose={()=>setChatOrder(null)} />}
      
      {mapOrder && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
            <div className="p-4 flex justify-between items-center shadow z-10 bg-white dark:bg-gray-900">
                <h3 className="font-bold text-lg dark:text-white">Route</h3>
                <button onClick={()=>setMapOrder(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-bold">Close</button>
            </div>
            <div className="flex-1 relative">
                <EmbeddedMap center={mapOrder.pickup_lat?[mapOrder.pickup_lat,mapOrder.pickup_lng!]:[14.5995,120.9842]} zoom={13} markers={[...(mapOrder.pickup_lat?[{lat:mapOrder.pickup_lat,lng:mapOrder.pickup_lng!,popup:"Pickup"}]:[]), ...(mapOrder.delivery_lat?[{lat:mapOrder.delivery_lat,lng:mapOrder.delivery_lng!,popup:"Drop"}]:[])]} className="h-full w-full"/>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                <p className="text-xs font-bold text-gray-500 uppercase">Pickup</p><p className="mb-2 dark:text-white">{mapOrder.pickup_address}</p>
                <p className="text-xs font-bold text-gray-500 uppercase">Dropoff</p><p className="dark:text-white">{mapOrder.delivery_address}</p>
            </div>
        </div>
      )}

      <button onClick={()=>setGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl"><FiHelpCircle size={24}/></button>
      <RiderGuide isOpen={guide} onClose={()=>setGuide(false)} />
    </div>
  );
}