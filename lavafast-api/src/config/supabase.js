import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replaceAll(/\/+$/g, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase backend não configurado: faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.');
}

let parsed;
try { parsed = new URL(supabaseUrl); } catch {
  throw new Error('SUPABASE_URL inválida: informe o endereço HTTPS base do projeto.');
}
if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/') {
  throw new Error('SUPABASE_URL inválida: use somente https://<project-ref>.supabase.co, sem caminhos adicionais.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
export default supabase;
