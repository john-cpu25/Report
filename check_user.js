import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Đọc file .env nếu có
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'nhan.nguyen@rincovitch.com.au';
    console.log(`Checking user: ${email}...`);
    
    const { data, error } = await supabase
        .from('NMK_User')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('User found in Supabase:', data[0]);
    } else {
        console.log('User NOT found in Supabase! This is the reason for Login failure.');
        console.log('Please add this email to NMK_User table in Supabase.');
    }
}

checkUser();
