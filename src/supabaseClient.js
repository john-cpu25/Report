import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối lấy từ hệ thống Core của Rincovitch
const supabaseUrl = 'https://slswxupqnjxnqpfkknqu.supabase.co'
const supabaseKey = 'sb_publishable_-6l8WMlZCW3dMlUshBQzNw_9Lbd7JMC'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
