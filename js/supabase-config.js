/* ================================================
   SUPABASE CONFIG — True Life Peptides
   ================================================
   
   SETUP INSTRUCTIONS:
   1. Create a free Supabase project at https://supabase.com
   2. Go to Project Settings > API and copy your URL + anon key
   3. Replace the placeholders below with your real values
   4. Enable Phone Auth:
      - Go to Authentication > Providers > Phone
      - Toggle Phone ON
      - Configure Twilio:
        → Account SID, Auth Token, and Messaging Service SID
        → Get these from https://console.twilio.com
   5. (Optional) Set rate limits in Auth > Rate Limits
   
   REQUIRED ENVIRONMENT:
   - SUPABASE_URL: Your project URL (e.g. https://xxxx.supabase.co)
   - SUPABASE_ANON_KEY: Your project's anon/public key
   - Twilio credentials configured in Supabase dashboard
   ================================================ */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client (loaded via CDN in HTML)
let _supabaseClient = null;

function getSupabaseClient() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.error('[TLP Auth] Supabase SDK not loaded. Make sure the CDN script is included before this file.');
        return null;
    }
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('[TLP Auth] Supabase credentials not configured. Edit js/supabase-config.js with your project URL and anon key.');
        return null;
    }
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabaseClient;
}
