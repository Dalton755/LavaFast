import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!process.env.SUPABASE_URL || !supabaseServiceKey) {
  throw new Error(
    'Supabase backend não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseServiceKey
);

export default supabase;