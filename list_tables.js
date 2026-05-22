import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fabuhzarlzstcsaerfut.supabase.co';
const supabaseKey = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // Let's run a raw RPC or query a known table to see if it works,
  // or retrieve schema info if possible, or just query common tables.
  const tables = ['NMK_Task', 'NMK_Project', 'NMK_User', 'NMK_Leave', 'NMK_Task_Temporary'];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${t}: Error or Not Found (${error.message})`);
    } else {
      console.log(`Table ${t}: Exists, count = ${count}`);
    }
  }
}

inspect();
