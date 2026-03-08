import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Order, UserProfile } from "../types";
import { FiMapPin, FiPackage, FiClock, FiMessageSquare, FiTrash2, FiPlus, FiHelpCircle, FiSearch } from "react-icons/fi";
import Chat from "../components/Chat";
import LocationPicker from "../components/LocationPicker";
import { calculateDistance } from "../utils/distance";
import CustomerGuide from "../components/guides/CustomerGuide";

interface CustomerDashboardProps {
  selectedPage: string;
  registerBell?: any;
  setUnreadCount?: any;
}

const STATUS_STEPS = {
  pending_approval: { step: 1, label: "Waiting", color: "bg-yellow-500" },
  approved: { step: 2, label: "Finding Rider", color: "bg-blue-500" },
  assigned: { step: 3, label: "Rider Assigned", color: "bg-purple-500" },
  picked_up: { step: 4, label: "On Way", color: "bg-indigo-500" },
  delivered: { step: 5, label: "Delivered", color: "bg-green-500" },
  completed: { step: 6, label: "Done", color: "bg-gray-500" },
  cancelled: { step: 0, label: "Cancelled", color: "bg-red-500" },
};

function AddressInput({ label, value, onChange, onSelect, placeholder, iconColor }: any) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const clickOut = (e: any) => { if(ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const handleInput = async (e: any) => {
    const val = e.target.value; onChange(val);
    if(val.length > 2) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5&countrycodes=ph`);
            setSuggestions(await res.json()); setShow(true);
        } catch(e) {}
    } else { setSuggestions([]); setShow(false); }
  };

  return (
    <div className="relative space-y-2 z-50" ref={ref}>
      <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
      <div className="relative">
        <input type="text" value={value} onChange={handleInput} className="w-full pl-4 pr-10 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white" placeholder={placeholder} onFocus={() => value.length > 2 && setShow(true)} />
        <div className="absolute right-3 top-2 text-gray-400"><FiSearch /></div>
      </div>
      {show && suggestions.length > 0 && (
        <ul className="absolute z-[9999] w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((item: any) => (
            <li key={item.place_id} onClick={() => { onSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name); setShow(false); }} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 flex gap-2 items-start">
               <div className={`mt-1 ${iconColor}`}><FiMapPin /></div> <span className="dark:text-gray-200">{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CustomerDashboard({ selectedPage }: CustomerDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerKm, setPricePerKm] = useState(20);
  const [form, setForm] = useState({ pickup: "", pickupLat: 0, pickupLng: 0, delivery: "", deliveryLat: 0, deliveryLng: 0, items: [{ name: "", qty: 1, price: 0 }], payment: "Cash" });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeChat, setActiveChat] = useState<Order | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    fetchUser(); fetchOrders(); fetchSettings();
    const hasSeen = localStorage.getItem("hasSeenCustomerGuide");
    if (!hasSeen) { setGuide(true); localStorage.setItem("hasSeenCustomerGuide", "true"); }
    const sub = supabase.channel("cust_updates").on("postgres_changes", { event: "*", schema: "public", table: "vyahe_orders" }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchUser = async () => { const { data: { user } } = await supabase.auth.getUser(); if(user) setUser(user as any); };
  const fetchSettings = async () => { const { data } = await supabase.from("vyahe_settings").select("*").single(); if(data) setPricePerKm(data.price_per_km); };
  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return;
    const { data } = await supabase.from("vyahe_orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setOrders(data || []); setLoading(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault(); if(!user) return; setSubmitting(true);
    const itemsTotal = form.items.reduce((a, i) => a + (i.price * i.qty), 0);
    let fee = 50;
    if(form.pickupLat && form.deliveryLat) fee = Math.max(50, Math.round(calculateDistance(form.pickupLat, form.pickupLng, form.deliveryLat, form.deliveryLng) * pricePerKm));
    
    const { error } = await supabase.from("vyahe_orders").insert([{
      customer_id: user.id, pickup_address: form.pickup, delivery_address: form.delivery, pickup_lat: form.pickupLat, pickup_lng: form.pickupLng, delivery_lat: form.deliveryLat, delivery_lng: form.deliveryLng,
      items: form.items, total_amount: itemsTotal + fee, delivery_fee: fee, payment_method: form.payment, status: "pending_approval"
    }]);
    
    if(error) alert(error.message); else { setForm({ pickup: "", pickupLat: 0, pickupLng: 0, delivery: "", deliveryLat: 0, deliveryLng: 0, items: [{ name: "", qty: 1, price: 0 }], payment: "Cash" }); fetchOrders(); }
    setSubmitting(false);
  };

  if(loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {selectedPage === "dashboard" && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2"><span className="text-blue-500"><FiClock /></span> Active</h2>
            <div className="space-y-4">
              {orders.filter(o => !["completed", "cancelled"].includes(o.status)).length === 0 && <p className="text-gray-500">No active orders.</p>}
              {orders.filter(o => !["completed", "cancelled"].includes(o.status)).map(o => (
                <div key={o.id} className="border dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex justify-between mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-bold uppercase">{o.status.replace("_", " ")}</span>
                    <span className="font-bold dark:text-white">₱{o.total_amount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm dark:text-gray-300 truncate">📍 {o.delivery_address}</p>
                  <div className="flex gap-2 mt-3">
                    {["assigned", "picked_up", "delivered"].includes(o.status) && (
                      <button onClick={() => setActiveChat(o)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                        <FiMessageSquare /> Chat
                      </button>
                    )}
                    {o.status === "pending_approval" && <button onClick={() => supabase.from("vyahe_orders").update({status:"cancelled"}).eq("id", o.id)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm">Cancel</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-t-4 border-purple-500">
            <h2 className="text-xl font-bold mb-4 dark:text-white">New Delivery</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <AddressInput label="Pickup" value={form.pickup} onChange={(v:string)=>setForm(f=>({...f, pickup:v}))} onSelect={(lat:number,lng:number,d:string)=>setForm(f=>({...f, pickup:d, pickupLat:lat, pickupLng:lng}))} placeholder="Search pickup..." iconColor="text-blue-500" />
              <LocationPicker onLocationSelect={(lat,lng)=>setForm(f=>({...f, pickupLat:lat, pickupLng:lng}))} initialLat={form.pickupLat||undefined} initialLng={form.pickupLng||undefined} label="Or Pin on Map" />
              
              <AddressInput label="Delivery" value={form.delivery} onChange={(v:string)=>setForm(f=>({...f, delivery:v}))} onSelect={(lat:number,lng:number,d:string)=>setForm(f=>({...f, delivery:d, deliveryLat:lat, deliveryLng:lng}))} placeholder="Search delivery..." iconColor="text-purple-500" />
              <LocationPicker onLocationSelect={(lat,lng)=>setForm(f=>({...f, deliveryLat:lat, deliveryLng:lng}))} initialLat={form.deliveryLat||undefined} initialLng={form.deliveryLng||undefined} label="Or Pin on Map" />
              
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex justify-between mb-2"><label className="text-xs font-bold text-gray-500 uppercase">Items</label> <button type="button" onClick={()=>setForm({...form, items:[...form.items, {name:"",qty:1,price:0}]})} className="text-xs text-blue-600 font-bold">+ Add</button></div>
                {form.items.map((it, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Name" value={it.name} onChange={e=>{const n=[...form.items]; n[i].name=e.target.value; setForm({...form, items:n})}} />
                    <input className="w-12 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:text-white" type="number" placeholder="#" value={it.qty} onChange={e=>{const n=[...form.items]; n[i].qty=Number(e.target.value); setForm({...form, items:n})}} />
                    <input className="w-16 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:text-white" type="number" placeholder="₱" value={it.price} onChange={e=>{const n=[...form.items]; n[i].price=Number(e.target.value); setForm({...form, items:n})}} />
                    {i > 0 && <button type="button" onClick={()=>{const n=[...form.items]; n.splice(i,1); setForm({...form, items:n})}} className="text-red-500"><FiTrash2/></button>}
                  </div>
                ))}
              </div>
              <button disabled={submitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Place Order</button>
            </form>
          </div>
        </div>
      )}
      {selectedPage === "orders" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
          <h2 className="text-xl font-bold mb-4 dark:text-white">History</h2>
          {orders.map(o => (
            <div key={o.id} className="border-b py-3 dark:border-gray-700 flex justify-between">
              <div><p className="font-bold dark:text-white">{o.delivery_address}</p><p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p></div>
              <div className="text-right"><p className="font-bold text-blue-600">₱{o.total_amount}</p><span className="text-xs bg-gray-100 px-2 rounded">{o.status}</span></div>
            </div>
          ))}
        </div>
      )}
      {activeChat && user && <Chat orderId={activeChat.id} currentUser={user} otherUser={{id: activeChat.rider_id!, name:"Rider"}} onClose={()=>setActiveChat(null)} />}
      <button onClick={()=>setGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl z-40"><FiHelpCircle size={24}/></button>
      <CustomerGuide isOpen={guide} onClose={()=>setGuide(false)}/>
    </div>
  );
}