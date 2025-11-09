// Alternative si l'import ne fonctionne pas
let supabase;

async function initializeSupabase() {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(
        'https://ciufbbkxwweixxcuvnqy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdWZiYmt4d3dlaXh4Y3V2bnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzYwNDAsImV4cCI6MjA3ODE1MjA0MH0.D1x5rhyG0zX2pu3wIFcAnxw2-ducK8N4H4FmsWxzA50'
    );
}

// Appelez cette fonction au début
initializeSupabase();
