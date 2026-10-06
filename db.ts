import { createClient } from "@supabase/supabase-js";

// Server-only client (service role). Lives under /api, never bundled into the browser.
export const db = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
