// Mapping tên nhân sự APEX chuẩn hóa (không dấu, đồng bộ 100% theo Supabase APEX_User)
export const CANONICAL_STAFF_NAMES = {
  'TAM PHAN': 'Tam Phan',
  'TÂM PHAN': 'Tam Phan',
  'LINH HUYNH': 'Linh Huynh',
  'TRUNG THE NGUYEN': 'Trung The Nguyen',
  'TRUNGTHENGUYEN': 'Trung The Nguyen',
  'TRUNG THẾ NGUYỄN': 'Trung The Nguyen',
  'KY PHAN': 'Ky Phan',
  'KỲ PHAN': 'Ky Phan',
  'NHAN NGUYEN': 'Nhan Nguyen',
  'NHÂN NGUYỄN': 'Nhan Nguyen',
  'JOHNNY': 'Nhan Nguyen',
  'JOHNNY NGUYEN': 'Nhan Nguyen',
  'NGAN TRAN': 'Ngan Tran',
  'NGÂN TRẦN': 'Ngan Tran',
  'ANNIE': 'Ngan Tran',
  'ANNIE TRAN': 'Ngan Tran',
  'KHIEM NGUYEN': 'Khiem Nguyen',
  'KHIÊM NGUYỄN': 'Khiem Nguyen',
  'CUONG PHAM': 'Cuong Pham',
  'CƯỜNG PHẠM': 'Cuong Pham',
  'LOC PHAM': 'Loc Pham',
  'LỘC PHẠM': 'Loc Pham',
  'NAM LE': 'Nam Le',
  'NAM LÊ': 'Nam Le',
  'KHANG TRINH': 'Khang Trinh',
  'KHANG TRỊNH': 'Khang Trinh',
  'TRUNG NGUYEN': 'Trung Nguyen',
  'TRUNG NGUYỄN': 'Trung Nguyen',
  'HOANG PHAM': 'Hoang Pham',
  'HOÀNG PHẠM': 'Hoang Pham',
  'NHAN PHAM': 'Nhan Pham',
  'NHÂN PHẠM': 'Nhan Pham',
  'DUC PHAM': 'Duc Pham',
  'ĐỨC PHẠM': 'Duc Pham',
  'DAT LE': 'Dat Le',
  'ĐẠT LÊ': 'Dat Le',
  'TIEN TRAN': 'Tien Tran',
  'TIẾN TRẦN': 'Tien Tran',
  'KHANH NGUYEN': 'Khanh Nguyen',
  'KHÁNH NGUYỄN': 'Khanh Nguyen',
  'NGUYEN LY': 'Nguyen Ly',
  'NGUYÊN LÝ': 'Nguyen Ly',
  'NEIL': 'Nguyen Ly',
  'NEIL LY': 'Nguyen Ly',
  'QUAN NGUYEN': 'Quan Nguyen',
  'QUÂN NGUYỄN': 'Quan Nguyen',
  'ANH NGUYEN': 'Anh Nguyen',
  'ÁNH NGUYỄN': 'Anh Nguyen',
  'SON LAM': 'Son Lam',
  'SƠN LÂM': 'Son Lam',
  'BAO PHAM': 'Bao Pham',
  'BẢO PHẠM': 'Bao Pham',
  'DUNG DO': 'Dung Do',
  'DŨNG ĐỖ': 'Dung Do',
  'VU DO': 'Vu Do',
  'VU DO NGUYEN': 'Vu Do',
  'VŨ ĐỖ': 'Vu Do',
  'VŨ ĐỖ NGUYỄN': 'Vu Do',
  'JASON LE': 'Jason Le',
  'KAMALA TRAN': 'Kamala Tran',
  'KAMALA': 'Kamala Tran'
};

/**
 * Xóa dấu tiếng Việt, giữ nguyên chữ hoa/thường
 */
export const removeVietnameseTones = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const toTitleCase = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Chuyển tên thô từ DB sang tên chuẩn không dấu theo đúng chuẩn Supabase APEX_User
 */
export const getCanonicalName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (CANONICAL_STAFF_NAMES[upper]) return CANONICAL_STAFF_NAMES[upper];

  // Tự động bỏ dấu tiếng Việt và chuẩn hóa Title Case theo chuẩn Supabase APEX_User
  const unaccented = removeVietnameseTones(trimmed);
  const unaccentedUpper = unaccented.toUpperCase();
  if (CANONICAL_STAFF_NAMES[unaccentedUpper]) return CANONICAL_STAFF_NAMES[unaccentedUpper];

  return toTitleCase(unaccented);
};

/**
 * Bỏ dấu tiếng Việt và đưa về chữ thường để so sánh an toàn
 */
export const normalizeVietnameseStr = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();
};

/**
 * So sánh 2 tên người dùng xem có phải cùng 1 người không
 * Hỗ trợ khớp cả tên gốc, tên có dấu tiếng Việt, và tên canonical
 */
export const isSameUser = (nameA, nameB) => {
  if (!nameA || !nameB) return false;
  const aRaw = nameA.trim().toLowerCase();
  const bRaw = nameB.trim().toLowerCase();
  if (aRaw === bRaw || aRaw.includes(bRaw) || bRaw.includes(aRaw)) return true;

  const aCanon = getCanonicalName(nameA).toLowerCase();
  const bCanon = getCanonicalName(nameB).toLowerCase();
  if (aCanon === bCanon || aCanon === bRaw || aRaw === bCanon) return true;

  const aNorm = normalizeVietnameseStr(nameA);
  const bNorm = normalizeVietnameseStr(nameB);
  if (aNorm === bNorm || aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  return false;
};

/**
 * Kiểm tra quyền xem toàn bộ team trên Dashboard (Hình 2: ADMIN / TEAM Switcher & ALL TEAMS Grid)
 * Chỉ có 3 tài khoản được phép:
 * 1. Nhân Nguyễn (Johnny) - johnny.nguyen@apexscengineering.com
 * 2. Vu Do - vu@apexscengineering.com, vu.donguyen@apexscengineering.com
 * 3. Kamala Tran - kamala.tran@apexscengineering.com
 */
export const canViewAllTeamsDashboard = (user) => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || user.full_name || '').toLowerCase().trim();

  // 1. Nhân Nguyễn (Johnny)
  if (
    email === 'johnny.nguyen@apexscengineering.com' ||
    name === 'johnny' ||
    name === 'nhân nguyễn' ||
    name === 'nhan nguyen' ||
    name.includes('johnny') ||
    name.includes('nhân nguyễn')
  ) {
    return true;
  }

  // 2. Vu Do
  if (
    email === 'vu@apexscengineering.com' ||
    email === 'vu.donguyen@apexscengineering.com' ||
    name === 'vu do' ||
    name === 'vũ đỗ' ||
    name === 'vu do nguyen' ||
    name === 'vũ đỗ nguyễn' ||
    name.includes('vũ đỗ') ||
    name.includes('vu do')
  ) {
    return true;
  }

  // 3. Kamala Tran
  if (
    email === 'kamala.tran@apexscengineering.com' ||
    name === 'kamala' ||
    name === 'kamala tran' ||
    name.includes('kamala')
  ) {
    return true;
  }

  return false;
};

