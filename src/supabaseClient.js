import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối Supabase Production mới (cvecpplwoduujrvoduku)
const supabaseUrl = 'https://cvecpplwoduujrvoduku.supabase.co'
const supabaseKey = 'sb_publishable_lxGJVSk8ESGalxlV9svi8g_lwPPYayD'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
