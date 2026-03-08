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
  registerBell?: (callback: () => void) => void;
  setUnreadCount?: (count: number) => void;
}

const STATUS_STEPS = {
  pending_approval: { step: 1, label: "Waiting for Approval", color: "bg-yellow-500" },
  approved: { step: 2, label: "Finding Rider", color: "bg-blue-500" },
  assigned: { step: 3, label: "Rider Assigned", color: "bg-purple-500" },
  picked_up: { step: 4, label: "On the Way", color: "bg-indigo-500" },
  delivered: { step: 5, label: "Delivered", color: "bg-green-500" },
  completed: { step: 6, label: "Completed", color: "bg-gray-500" },
  cancelled: { step: 0, label: "Cancelled", color: "bg-red-500" },
};

// --- Autocomplete Input Component ---
interface AddressInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (lat: number, lng: number, display: string) => void;
  placeholder: string;
  iconColor: string;
}

function AddressInput({ label, value, onChange, onSelect, placeholder, iconColor }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Geocoding error", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white transition-colors"
          placeholder={placeholder}
          onFocus={() => value.length > 2 && setShowSuggestions(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <FiSearch />
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => {
                onSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
                setShowSuggestions(false);
              }}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-0"
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 ${iconColor}`}>
                  <FiMapPin />
                </div>
                <span className="text-gray-700 dark:text-gray-200">{item.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Main Dashboard ---
export default function CustomerDashboard({ selectedPage }: CustomerDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerKm, setPricePerKm] = useState(20);
  const [form, setForm] = useState({
    pickup: "",
    pickupLat: 0,
    pickupLng: 0,
    delivery: "",
    deliveryLat: 0,
    deliveryLng: 0,
    items: [{ name: "", qty: 1, price: 0 }],
    payment: "Cash",
  });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenCustomerGuide");
    if (!hasSeenGuide) { setShowGuide(true); localStorage.setItem("hasSeenCustomerGuide", "true"); }

    fetchUser();
    fetchOrders();
    fetchSettings();

    const subscription = supabase
      .channel("customer_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "VYAHE_orders" }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUser(user as any);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("VYAHE_settings").select("*").single();
    if (data) setPricePerKm(data.price_per_km);
  };

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("VYAHE_orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const itemsTotal = form.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    let deliveryFee = 50;
    if (form.pickupLat && form.deliveryLat) {
      const distance = calculateDistance(form.pickupLat, form.pickupLng, form.deliveryLat, form.deliveryLng);
      deliveryFee = Math.max(50, Math.round(distance * pricePerKm));
    }

    const { error } = await supabase.from("VYAHE_orders").insert([{
      customer_id: user.id,
      pickup_address: form.pickup,
      delivery_address: form.delivery,
      pickup_lat: form.pickupLat || null,
      pickup_lng: form.pickupLng || null,
      delivery_lat: form.deliveryLat || null,
      delivery_lng: form.deliveryLng || null,
      items: form.items,
      total_amount: itemsTotal + deliveryFee,
      delivery_fee: deliveryFee,
      payment_method: form.payment,
      status: "pending_approval",
    }]);

    if (error) alert(error.message);
    else {
      setForm({ 
        pickup: "", pickupLat: 0, pickupLng: 0,
        delivery: "", deliveryLat: 0, deliveryLng: 0,
        items: [{ name: "", qty: 1, price: 0 }], 
        payment: "Cash" 
      });
      fetchOrders();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-600 dark:text-gray-300">Loading orders...</div>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {selectedPage === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Orders List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-blue-500"><FiClock /></span> Active Orders
            </h2>
            <div className="space-y-4">
              {orders.filter(o => !["completed", "cancelled"].includes(o.status)).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active orders. Start a new delivery!</p>
              ) : (
                orders.filter(o => !["completed", "cancelled"].includes(o.status)).map(order => {
                  const statusInfo = STATUS_STEPS[order.status as keyof typeof STATUS_STEPS] || STATUS_STEPS.pending_approval;
                  return (
                    <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">₱{order.total_amount.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">📍 {order.delivery_address}</p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        {["assigned", "picked_up", "delivered"].includes(order.status) && (
                          <button onClick={() => setActiveChatOrder(order)} className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">
                            <FiMessageSquare /> Chat
                          </button>
                        )}
                        {["pending_approval"].includes(order.status) && (
                          <button onClick={() => {
                             if(confirm("Cancel order?")) supabase.from("VYAHE_orders").update({status: "cancelled"}).eq("id", order.id);
                          }} className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* New Delivery Form */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-6 border border-blue-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-purple-500"><FiPackage /></span> New Delivery
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pickup */}
              <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><span className="text-blue-500"><FiMapPin /></span> Pickup</h3>
                <AddressInput 
                  label="Address / Search"
                  value={form.pickup}
                  onChange={(val) => setForm(f => ({ ...f, pickup: val }))}
                  onSelect={(lat, lng, display) => setForm(f => ({ ...f, pickup: display, pickupLat: lat, pickupLng: lng }))}
                  placeholder="Search pickup location..."
                  iconColor="text-blue-500"
                />
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Or Pin on Map</label>
                  <LocationPicker 
                    onLocationSelect={(lat, lng) => setForm(prev => ({ ...prev, pickupLat: lat, pickupLng: lng }))}
                    initialLat={form.pickupLat || undefined}
                    initialLng={form.pickupLng || undefined}
                  />
                </div>
              </div>

              {/* Delivery */}
              <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><span className="text-purple-500"><FiMapPin /></span> Delivery</h3>
                <AddressInput 
                  label="Address / Search"
                  value={form.delivery}
                  onChange={(val) => setForm(f => ({ ...f, delivery: val }))}
                  onSelect={(lat, lng, display) => setForm(f => ({ ...f, delivery: display, deliveryLat: lat, deliveryLng: lng }))}
                  placeholder="Search delivery location..."
                  iconColor="text-purple-500"
                />
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Or Pin on Map</label>
                  <LocationPicker 
                    onLocationSelect={(lat, lng) => setForm(prev => ({ ...prev, deliveryLat: lat, deliveryLng: lng }))}
                    initialLat={form.deliveryLat || undefined}
                    initialLng={form.deliveryLng || undefined}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><span className="text-orange-500"><FiPackage /></span> Items</h3>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" placeholder="Item Name" className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-900" value={item.name} onChange={e => {
                      const newItems = [...form.items]; newItems[idx].name = e.target.value; setForm({...form, items: newItems});
                    }} />
                    <input type="number" placeholder="Qty" className="w-16 px-3 py-2 rounded-lg border dark:bg-gray-900" value={item.qty} onChange={e => {
                      const newItems = [...form.items]; newItems[idx].qty = parseInt(e.target.value); setForm({...form, items: newItems});
                    }} />
                    <input type="number" placeholder="Price" className="w-24 px-3 py-2 rounded-lg border dark:bg-gray-900" value={item.price} onChange={e => {
                      const newItems = [...form.items]; newItems[idx].price = parseFloat(e.target.value); setForm({...form, items: newItems});
                    }} />
                    {idx > 0 && <button type="button" onClick={() => {
                      const newItems = [...form.items]; newItems.splice(idx, 1); setForm({...form, items: newItems});
                    }} className="text-red-500"><FiTrash2 /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setForm({...form, items: [...form.items, {name: "", qty: 1, price: 0}]})} className="text-sm text-blue-600 flex items-center gap-1"><FiPlus /> Add Item</button>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Total Estimate</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    ₱{(form.items.reduce((a, i) => a + (i.price * i.qty), 0) + (form.pickupLat && form.deliveryLat ? Math.max(50, Math.round(calculateDistance(form.pickupLat, form.pickupLng, form.deliveryLat, form.deliveryLng) * pricePerKm)) : 50)).toFixed(2)}
                  </p>
                </div>
                <button type="submit" disabled={submitting} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">Place Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPage === "orders" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 dark:text-white">Order History</h2>
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="flex justify-between p-4 border-b dark:border-gray-700">
                <div>
                  <p className="font-bold dark:text-white">{order.delivery_address}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold dark:text-white">₱{order.total_amount.toFixed(2)}</p>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeChatOrder && user && (
        <Chat orderId={activeChatOrder.id} currentUser={user} otherUser={{ id: activeChatOrder.rider_id!, name: "Rider" }} onClose={() => setActiveChatOrder(null)} />
      )}

      <button onClick={() => setShowGuide(true)} className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg z-40"><FiHelpCircle size={24} /></button>
      <CustomerGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}