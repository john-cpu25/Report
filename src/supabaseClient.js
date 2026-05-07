import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối lấy từ hệ thống Core của Rincovitch
const supabaseUrl = 'https://ondwkhoelyfpzugwyqnd.supabase.co'
const supabaseKey = 'sb_publishable_lkCPpfLoeGVUIgIm0nFJkQ_ltk_pUeY'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
