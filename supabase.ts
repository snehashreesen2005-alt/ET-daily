import { createClient } from "@supabase/supabase-js";

// Browser client: anon key, read-only through the RLS policy on `editorials`.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export type Editorial = {
  id: string;
  publish_date: string;
  slot: number;
  headline: string;
  author: string;
  source_url: string;
  full_text: string;
  overview: string;
  takeaways: string[];
  implication: string;
};
