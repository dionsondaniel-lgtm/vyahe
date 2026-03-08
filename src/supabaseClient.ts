import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. Check for missing keys immediately
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_SUPABASE_URL")) {
  console.error("❌ Supabase keys are missing in .env.local! Check your terminal.");
  alert("Supabase is not configured. Please check your .env.local file.");
  throw new Error("Supabase Configuration Missing");
}

console.log("✅ Supabase Client Initialized with URL:", SUPABASE_URL);

// 2. Create client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // This ensures you stay logged in
    detectSessionInUrl: true,
  },
});