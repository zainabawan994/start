import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('Connecting to Supabase at:', url);
const supabase = createClient(url, serviceKey);

async function check() {
  const { data: places, error: pErr } = await supabase.from('places').select('*').limit(1);
  console.log('Places query result:', { data: places, error: pErr?.message });

  const { data: reports, error: rErr } = await supabase.from('reports').select('*').limit(1);
  console.log('Reports query result:', { data: reports, error: rErr?.message });
}

check();
