import { createClient } from "@supabase/supabase-js";

/** Supabase CINS — chỉ đọc public (anon). Có thể ghi đè bằng env. */
const url =
  process.env.NEXT_PUBLIC_CINS_SUPABASE_URL?.trim() ||
  "https://ospzzzxcomrmhqrnkoiw.supabase.co";
const anonKey =
  process.env.NEXT_PUBLIC_CINS_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcHp6enhjb21ybWhxcm5rb2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjExNzEsImV4cCI6MjA5MTAzNzE3MX0.G1Eb7in7h6BvjM6bK7JufQZCp5V9P7Af1O3ff6riTPw";

export const cinsSupabase = createClient(url, anonKey);
