import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { User } from "@supabase/supabase-js";
import { motion } from "motion/react";

interface CompleteProfileProps { user: User; onComplete: () => void; }

export default function CompleteProfile({ user, onComplete }: CompleteProfileProps) {
  const [name, setName] = useState(user.user_metadata?.full_name || user.user_metadata?.name || "");
  const [phone, setPhone] = useState(user.user_metadata?.phone || "");
  const [role, setRole] = useState<"Customer" | "Rider" | "Admin">(user.user_metadata?.role || "Customer");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      if (role === "Admin" && secretCode !== "DDD") throw new Error("Invalid Admin Secret Code");
      if (role === "Rider" && secretCode !== "superman") throw new Error("Invalid Rider Secret Code");

      const { error: insertError } = await supabase
        .from("vyahe_ridercustomer_users")
        .insert([{ id: user.id, name, email: user.email, phone, role, is_online: false }]);

      if (insertError) throw insertError;
      await supabase.auth.updateUser({ data: { full_name: name, phone, role } });
      onComplete();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Complete Profile</h2>
        {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm text-gray-300 mb-1">Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white" /></div>
          <div><label className="block text-sm text-gray-300 mb-1">Phone</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white" /></div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Role</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-700">
              {(["Customer", "Rider", "Admin"] as const).map(r => <button key={r} type="button" onClick={()=>setRole(r)} className={`py-2 rounded-lg text-sm font-medium ${role===r?"bg-blue-600 text-white":"text-gray-400 hover:text-white"}`}>{r}</button>)}
            </div>
          </div>
          {(role === "Rider" || role === "Admin") && <div><label className="block text-sm text-yellow-400 mb-1">Secret Code</label><input type="password" value={secretCode} onChange={e=>setSecretCode(e.target.value)} className="w-full px-4 py-3 bg-gray-800/50 border border-yellow-500/50 rounded-xl text-white" /></div>}
          <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all">{loading?"Saving...":"Save Profile"}</button>
        </form>
      </motion.div>
    </div>
  );
}