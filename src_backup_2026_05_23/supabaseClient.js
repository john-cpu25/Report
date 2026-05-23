import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối lấy từ hệ thống Core của Rincovitch
const supabaseUrl = 'https://fabuhzarlzstcsaerfut.supabase.co'
const supabaseKey = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
