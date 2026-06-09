import crypto from 'crypto';
import fs from 'fs';

const supabaseUrl = 'https://slswxupqnjxnqpfkknqu.supabase.co';
const supabaseKey = 'sb_publishable_-6l8WMlZCW3dMlUshBQzNw_9Lbd7JMC';

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function run() {
    console.log("Fetching users...");
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/NMK_User?select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) throw new Error("Fetch failed: " + res.statusText);
        const users = await res.json();
        
        let unencryptedList = "DANH SÁCH MẬT KHẨU CHƯA MÃ HÓA (GỬI CHO USER)\n------------------------------------------------\n";
        let encryptedList = "DANH SÁCH MẬT KHẨU ĐÃ MÃ HÓA (LƯU TRÊN SUPABASE)\n------------------------------------------------\n";
        let count = 0;

        for (const u of users) {
            if (!u.password || u.password.trim() === '') {
                const pwd = Math.random().toString(36).slice(-8); 
                const hashed = hashPassword(pwd);
                
                const updateRes = await fetch(`${supabaseUrl}/rest/v1/NMK_User?id=eq.${u.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ password: hashed })
                });

                if (!updateRes.ok) {
                    console.error(`Lỗi update cho ${u.email}:`, updateRes.statusText);
                } else {
                    unencryptedList += `Email: ${u.email}  |  Password: ${pwd}\n`;
                    encryptedList += `Email: ${u.email}  |  Hash: ${hashed}\n`;
                    count++;
                }
            }
        }
        console.log(`\nĐã tạo thành công mật khẩu cho ${count} user!`);
        fs.writeFileSync('generated_passwords.txt', unencryptedList + '\n\n' + encryptedList);
        console.log("Kết quả đã lưu vào file generated_passwords.txt");
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
