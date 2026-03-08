import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "motion/react";
import TermsModal from "../components/TermsModal";
import { Link, useNavigate } from "react-router-dom";

interface RegisterProps {
  onLogin: (user: any) => void;
}

export default function Register({ onLogin }: RegisterProps) {
  const navigate = useNavigate(); // Used for redirection
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Customer" | "Rider" | "Admin">("Customer");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalType, setModalType] = useState<"terms" | "privacy" | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Role Validation
      if (role === "Admin" && secretCode !== "DDD") throw new Error("Invalid Admin Secret Code");
      if (role === "Rider" && secretCode !== "superman") throw new Error("Invalid Rider Secret Code");

      // 2. Supabase Auth Sign Up
      // We attach metadata so it's available immediately on the user object
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone, role }
        }
      });

      if (authError) {
        // Specific handling for "User already registered"
        if (authError.message.includes("already registered")) {
          throw new Error("This email is already registered. Please log in instead.");
        }
        throw authError;
      }

      const user = data.user;
      if (!user) throw new Error("Registration failed.");

      // 3. Insert into Public Profile Table
      // Note: We use upsert just in case the Auth user existed but profile was missing
      const { error: dbError } = await supabase
        .from("vyahe_ridercustomer_users")
        .upsert([
          {
            id: user.id,
            name: name,
            email: email,
            phone: phone,
            role: role,
            is_online: false
          }
        ]);

      if (dbError) {
        console.error("DB Insert Error:", dbError);
        // If Auth succeeded but DB failed, we still proceed.
        // The Dashboard has a "CompleteProfileSetup" component that will catch this.
      }

      // 4. Success Handling
      // If session exists (Auto confirm off), log them in.
      if (data.session) {
        onLogin(user);
        navigate("/dashboard");
      } else {
        // Auto confirm on (requires email verification)
        alert("Registration successful! Please check your email to verify your account.");
        navigate("/login");
      }

    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg p-8 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-white text-center mb-6">Join VYAHE</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500" placeholder="09123456789" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-700">
              {(["Customer", "Rider", "Admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    role === r ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {(role === "Rider" || role === "Admin") && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="block text-sm font-medium text-yellow-400 mb-1">{role} Secret Code</label>
              <input type="password" value={secretCode} onChange={e => setSecretCode(e.target.value)} className="w-full px-4 py-3 bg-gray-800/50 border border-yellow-500/50 rounded-xl text-white focus:ring-2 focus:ring-yellow-500" placeholder="Enter code" />
            </motion.div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>

      {modalType && <TermsModal isOpen={!!modalType} onClose={() => setModalType(null)} type={modalType} />}
    </div>
  );
}