// Configuration Supabase
const SUPABASE_URL = 'https://ciufbbkxwweixxcuvnqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdWZiYmt4d3dlaXh4Y3V2bnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzYwNDAsImV4cCI6MjA3ODE1MjA0MH0.D1x5rhyG0zX2pu3wIFcAnxw2-ducK8N4H4FmsWxzA50';

// Initialisation du client Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export pour utilisation dans d'autres fichiers
window.supabaseClient = supabase;
