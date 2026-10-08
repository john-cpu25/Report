// Mapping tên nhân sự APEX chuẩn hóa (hỗ trợ hiển thị tiếng Việt có dấu đẹp mắt)
export const CANONICAL_STAFF_NAMES = {
  'TAM PHAN': 'Tâm Phan',
  'TÂM PHAN': 'Tâm Phan',
  'LINH HUYNH': 'Linh Huynh',
  'TRUNG THE NGUYEN': 'Trung Thế Nguyễn',
  'TRUNGTHENGUYEN': 'Trung Thế Nguyễn',
  'TRUNG THẾ NGUYỄN': 'Trung Thế Nguyễn',
  'KY PHAN': 'Kỳ Phan',
  'KỲ PHAN': 'Kỳ Phan',
  'NHAN NGUYEN': 'Nhân Nguyễn',
  'NHÂN NGUYỄN': 'Nhân Nguyễn',
  'JOHNNY': 'Nhân Nguyễn',
  'NGAN TRAN': 'Ngân Trần',
  'NGÂN TRẦN': 'Ngân Trần',
  'KHIEM NGUYEN': 'Khiêm Nguyễn',
  'KHIÊM NGUYỄN': 'Khiêm Nguyễn',
  'CUONG PHAM': 'Cường Phạm',
  'CƯỜNG PHẠM': 'Cường Phạm',
  'LOC PHAM': 'Loc Pham',
  'LỘC PHẠM': 'Loc Pham',
  'NAM LE': 'Nam Le',
  'NAM LÊ': 'Nam Le',
  'KHANG TRINH': 'Khang Trịnh',
  'KHANG TRỊNH': 'Khang Trịnh',
  'TRUNG NGUYEN': 'Trung Nguyễn',
  'TRUNG NGUYỄN': 'Trung Nguyễn',
  'HOANG PHAM': 'Hoàng Phạm',
  'HOÀNG PHẠM': 'Hoàng Phạm',
  'NHAN PHAM': 'Nhân Phạm',
  'NHÂN PHẠM': 'Nhân Phạm',
  'DUC PHAM': 'Đức Phạm',
  'ĐỨC PHẠM': 'Đức Phạm',
  'TIEN TRAN': 'Tiến Trần',
  'TIẾN TRẦN': 'Tiến Trần',
  'KHANH NGUYEN': 'Khánh Nguyễn',
  'KHÁNH NGUYỄN': 'Khánh Nguyễn',
  'NGUYEN LY': 'Nguyên Lý',
  'NGUYÊN LÝ': 'Nguyên Lý',
  'NEIL': 'Nguyên Lý',
  'QUAN NGUYEN': 'Quân Nguyễn',
  'QUÂN NGUYỄN': 'Quân Nguyễn',
  'ANH NGUYEN': 'Ánh Nguyễn',
  'ÁNH NGUYỄN': 'Ánh Nguyễn',
  'SON LAM': 'Sơn Lâm',
  'SƠN LÂM': 'Sơn Lâm',
  'BAO PHAM': 'Bảo Phạm',
  'BẢO PHẠM': 'Bảo Phạm',
  'DUNG DO': 'Dũng Đỗ',
  'DŨNG ĐỖ': 'Dũng Đỗ',
  'VU DO': 'Vũ Đỗ',
  'VU DO NGUYEN': 'Vũ Đỗ',
  'VŨ ĐỖ': 'Vũ Đỗ',
  'JASON LE': 'Jason Le',
  'KAMALA TRAN': 'Kamala Tran',
  'KAMALA': 'Kamala Tran'
};

/**
 * Chuyển tên thô từ DB sang tên chuẩn có dấu tiếng Việt
 */
export const getCanonicalName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  return CANONICAL_STAFF_NAMES[upper] || trimmed;
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
