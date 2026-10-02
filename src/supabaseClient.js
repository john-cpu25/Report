import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối Supabase mới (wluhkzkfknpbunxagvjw)
const supabaseUrl = 'https://wluhkzkfknpbunxagvjw.supabase.co'
const supabaseKey = 'sb_publishable_iQ89mBYJqfyHwSnaPgM6wA_iRzhdRD9'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
