import { supabase } from './supabaseClient.js'

async function checkColumns() {
    const email = 'nhan.nguyen@rincovitch.com.au';
    const { data, error } = await supabase
        .from('NMK_User')
        .select('*')
        .eq('email', email)
        .single();

    if (data) {
        console.log('Columns found:', Object.keys(data));
        console.log('Data:', data);
    } else {
        console.log('Error or no data');
    }
}

checkColumns();
