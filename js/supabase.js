// TODO: Replace with your Supabase project credentials
const SUPABASE_URL = "https://jtwmdyvuvfdgfizfsjyx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_h3yMFRV-WeXGOJRasvxJAQ__1-eXhsw";

// TODO: Add allowed email addresses
const ALLOWED_EMAILS = ["ethangl@gmail.com", "troy-email@gmail.com"];

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isAllowedEmail(email) {
  return ALLOWED_EMAILS.includes(email?.toLowerCase());
}
