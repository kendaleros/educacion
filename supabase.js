// Supabase Configuration
// IMPORTANTE: Reemplaza estos valores con los tuyos de Supabase
const SUPABASE_URL = 'https://fqcfbtjtilipyykaprxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxY2ZidGp0aWxpcHl5a2Fwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjA4NTcsImV4cCI6MjA5NzAzNjg1N30.KvPfBJF7hquXRsqQiTSFNxy-uendPE1is-ihZ0v2wQw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
