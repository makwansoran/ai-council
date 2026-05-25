import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

let cachedService: SupabaseClient | null = null;
let cachedAnon: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient {
  if (!cachedService) {
    cachedService = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedService;
}

export function supabaseServerAnon(): SupabaseClient {
  if (!cachedAnon) {
    cachedAnon = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAnon;
}
