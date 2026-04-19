const SUPABASE_URL = "https://chviulgpmqiywadrbzxt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_44X6pu3BNfHIGYDEVZO3Fg_KrHQypd0";

if (!window.supabase) {
    throw new Error("Supabase CDN did not load before supabase-config.js");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;