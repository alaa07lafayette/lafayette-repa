import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
    "Set them in Cloudflare Pages > Settings > Environment variables (and in a local .env for dev)."
  );
}

export const supabase = createClient(url, key);
