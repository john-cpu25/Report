import { supabase } from '../supabaseClient';

async function checkColumns() {
  const { data, error } = await supabase.from('NMK_Task').select('*').limit(1);
  if (data && data[0]) {
    console.log('NMK_Task columns:', Object.keys(data[0]));
  }
}

checkColumns();
