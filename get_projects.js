import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fabuhzarlzstcsaerfut.supabase.co';
const supabaseKey = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase
    .from('NMK_Project')
    .select('id, name, key');
    
  if (error) {
    console.error('Error fetching projects:', error);
  } else {
    console.log('Projects list:', JSON.stringify(data, null, 2));
  }
}

inspect();
