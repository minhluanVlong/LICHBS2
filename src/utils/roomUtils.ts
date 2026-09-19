import { VALID_ROOMS, ValidRoomCode } from '../types';

/**
 * Danh mục 12 mã phòng hợp lệ duy nhất:
 * HS1, HS2, P1, P2, P3, P4, P5, LK, N1, N2, PM, KL
 */
export function normalizeRoom(rawRoomInput: string | null | undefined): {
  normalized: string;
  isValid: boolean;
  code?: ValidRoomCode;
} {
  if (!rawRoomInput) {
    return { normalized: '', isValid: false };
  }

  let cleaned = String(rawRoomInput).trim().toUpperCase();

  // Bỏ dấu tiếng Việt nếu có trong từ 'phòng'
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Xóa các tiền tố thừa: "PHONG", "PHONG.", "P.", "P ", "ROOM", "P-", "P:"
  cleaned = cleaned.replace(/^(PHONG|PHON|ROOM)[\s.:_-]*/i, '');

  // Xử lý trường hợp có khoảng trắng giữa chữ và số: "P 1" -> "P1", "HS 1" -> "HS1", "N 2" -> "N2"
  cleaned = cleaned.replace(/\s+/g, '');

  // Kiểm tra danh mục 12 mã phòng hợp lệ duy nhất
  const isMatch = (VALID_ROOMS as readonly string[]).includes(cleaned);

  if (isMatch) {
    return {
      normalized: cleaned,
      isValid: true,
      code: cleaned as ValidRoomCode,
    };
  }

  return {
    normalized: cleaned || String(rawRoomInput).trim(),
    isValid: false,
  };
}

/**
 * Sinh khóa nhận diện bệnh nhân đối chiếu qua các ngày
 * NGUYÊN TẮC: Bắt buộc dùng tổ hợp: [HỌ VÀ TÊN + PHÒNG]
 */
export function generatePatientCompositeKey(name: string, normalizedRoom: string): string {
  const normName = (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const normRoom = (normalizedRoom || '').trim().toUpperCase();
  return `${normName}___${normRoom}`;
}
