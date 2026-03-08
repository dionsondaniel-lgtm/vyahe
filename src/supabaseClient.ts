import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isUrlValid = (url: string) => {
  try { return Boolean(new URL(url)); } catch (e) { return false; }
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !isUrlValid(SUPABASE_URL)) {
  console.error("❌ Supabase Configuration Error: Invalid URL or Key in .env.local");
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co", 
  SUPABASE_ANON_KEY || "placeholder", 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }
  }
);