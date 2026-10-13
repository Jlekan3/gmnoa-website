
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// =========================================================
// SUPABASE CONFIGURATION
// =========================================================

const SUPABASE_URL =
    "https://lnctolzzigpsjsvhtxwe.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_O_JT8-AD_heentaVPRdXEQ_x9zCoDtt";


// =========================================================
// CREATE SUPABASE CLIENT
// =========================================================

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// =========================================================
// EXPORT CONFIG
// =========================================================

export {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
};




