const { execSync } = require('child_process');
const fs = require('fs');

console.log("=========================================");
console.log("🚀 BẮT ĐẦU QUÁ TRÌNH DEPLOY LÊN SUPABASE");
console.log("=========================================\n");

try {
  console.log("1️⃣  Đang đọc file credentials.json...");
  const data = fs.readFileSync('balmy-gearing-497414-e6-74cca9b3768a.json', 'utf8');
  
  // Parse và stringify lại để đảm bảo là một chuỗi chuẩn không có dấu xuống dòng thừa
  const minified = JSON.stringify(JSON.parse(data));

  console.log("2️⃣  Đang nạp Secret GCP_CREDENTIALS vào két sắt Supabase...");
  // Sử dụng biến môi trường để truyền chuỗi JSON, tránh lỗi nháy kép trên Windows
  execSync('npx supabase secrets set GCP_CREDENTIALS="%GCP_CREDENTIALS_VALUE%"', {
    env: { ...process.env, GCP_CREDENTIALS_VALUE: minified },
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
  
  console.log("✅ Nạp Secret thành công!\n");
  
  console.log("3️⃣  Đang đẩy Code Edge Function lên Server (Vui lòng chờ khoảng 30s-1p)...");
  execSync('npx supabase functions deploy upload-issue-attachment', { 
      stdio: 'inherit',
      shell: 'cmd.exe'
  });
  
  console.log("\n🎉 HOÀN TẤT! Tính năng Upload Google Drive đã sẵn sàng hoạt động trên Server.");
  console.log("=========================================");
} catch (error) {
  console.error("\n❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH DEPLOY:");
  console.error(error.message);
  console.log("\n⚠️ Lưu ý: Nếu bạn thấy lỗi 'project not linked', hãy chắc chắn bạn đã chạy lệnh 'npx supabase link' trước khi chạy script này.");
}
