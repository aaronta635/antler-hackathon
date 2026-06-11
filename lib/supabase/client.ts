import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (uses the public anon key). For client components:
// auth (magic link), reading public data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
