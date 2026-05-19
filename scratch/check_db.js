import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fabuhzarlzstcsaerfut.supabase.co';
const supabaseKey = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskSchema() {
    const { data, error } = await supabase.from('NMK_Task').select('*').limit(1);
    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Sample task from NMK_Task table:', data[0]);
        console.log('Task keys (columns):', Object.keys(data[0]));
    } else {
        console.log('No tasks found in NMK_Task table!');
    }
}

checkTaskSchema();
