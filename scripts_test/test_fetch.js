import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://slswxupqnjxnqpfkknqu.supabase.co';
const supabaseKey = 'sb_publishable_-6l8WMlZCW3dMlUshBQzNw_9Lbd7JMC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase
    .from('NMK_Task_Temporary')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching temporary tasks:', error);
  } else {
    console.log('Sample temporary task structure:', JSON.stringify(data[0], null, 2));
  }
}

inspect();
