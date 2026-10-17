import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\\/+$/, '');

if (!/^https:\/\/[^/]+\\.supabase\\.co$/i.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL inválida: informe somente https://<project-ref>.supabase.co (sem /rest/v1, /auth/v1 ou /api).');
}

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase backend não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export default supabase;