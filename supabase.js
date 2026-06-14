// Supabase Configuration
// IMPORTANTE: Reemplaza estos valores con los tuyos de Supabase
const SUPABASE_URL = 'https://fqcfbtjtilipyykaprxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxY2ZidGp0aWxpcHl5a2Fwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjI4NjQsImV4cCI6MjA2NTQ5ODg2NH0.eyJpc3MiOiJzdXBhYmFzZSJ9';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
