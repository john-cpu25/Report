import { supabase } from './supabaseClient.js'

async function testUserLookup() {
    const email = 'nhan.nguyen@rincovitch.com.au';
    console.log(`\n--- KIỂM TRA QUYỀN TRUY CẬP TRONG SUPABASE ---`);
    console.log(`Đang kiểm tra user: ${email}`);
    
    try {
        const { data, error } = await supabase
            .from('NMK_User')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.error('❌ Lỗi:', error.message);
            if (error.message.includes('JSON object requested, multiple (or no) rows returned')) {
                console.log('💡 Gợi ý: Email này có thể chưa được đăng ký trong bảng NMK_User.');
            }
        } else {
            console.log('✅ Đã tìm thấy người dùng!');
            console.log('-----------------------------------');
            console.log(`Họ tên: ${data.full_name || 'N/A'}`);
            console.log(`Quyền: ${data.role}`);
            console.log(`Team: ${data.team}`);
            console.log('-----------------------------------');
            console.log('Hệ thống đã sẵn sàng cho Silent Login.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testUserLookup();
