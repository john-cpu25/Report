import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ondwkhoelyfpzugwyqnd.supabase.co';
const supabaseKey = 'sb_publishable_lkCPpfLoeGVUIgIm0nFJkQ_ltk_pUeY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data: userData, error: userError } = await supabase
            .from('NMK_User')
            .select('*')
            .limit(1);
        
        if (userData && userData.length > 0) {
            console.log('NMK_User columns:', Object.keys(userData[0]));
            console.log('Sample User Data:', userData[0]);
        }

        const { data: leaveData, error: leaveError } = await supabase
            .from('NMK_Leave')
            .select('*')
            .limit(1);
        
        if (leaveData && leaveData.length > 0) {
            console.log('NMK_Leave columns:', Object.keys(leaveData[0]));
            console.log('Sample Leave Data:', leaveData[0]);
        } else {
            console.log('NMK_Leave is empty or error:', leaveError);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
