// Configuration Supabase avec export correct
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Vos clés Supabase (gardez-les sécurisées !)
const SUPABASE_URL = 'https://ciufbbkxwweixxcuvnqy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdWZiYmt4d3dlaXh4Y3V2bnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzYwNDAsImV4cCI6MjA3ODE1MjA0MH0.D1x5rhyG0zX2pu3wIFcAnxw2-ducK8N4H4FmsWxzA50'

// Création et export du client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Vérification
console.log('✅ Supabase client initialisé avec succès')
