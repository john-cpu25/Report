import { createClient } from '@supabase/supabase-js'

// Thông tin kết nối lấy từ hệ thống Core của Rincovitch
const supabaseUrl = 'https://ejyirnfxuezipogweybo.supabase.co'
const supabaseKey = 'sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G'

// Khởi tạo client dùng chung cho toàn bộ ứng dụng Web
export const supabase = createClient(supabaseUrl, supabaseKey)
