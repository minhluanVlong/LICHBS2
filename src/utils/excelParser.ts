import * as XLSX from 'xlsx';
import { RawPatientRow, ScheduledPatient } from '../types';
import { normalizeRoom } from './roomUtils';

export interface ParseResult {
  patients: RawPatientRow[];
  totalPatients: number;
  validCount: number;
  invalidCount: number;
  hasInvalidRoom: boolean;
  warnings: string[];
}

/**
 * Chuẩn hóa tên cột để tìm kiếm linh hoạt
 */
function cleanColHeader(header: string): string {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tìm chỉ mục các cột tương ứng trong mảng tiêu đề
 */
function detectColumnIndices(headers: string[]): {
  sttIdx: number;
  nameIdx: number;
  roomIdx: number;
  sgIdx: number;
} {
  let sttIdx = -1;
  let nameIdx = -1;
  let roomIdx = -1;
  let sgIdx = -1;

  headers.forEach((h, idx) => {
    const cleaned = cleanColHeader(h);
    if (cleaned === 'stt' || cleaned === 'st' || cleaned === 'no') {
      sttIdx = idx;
    } else if (
      cleaned.includes('hovaten') ||
      cleaned.includes('hoten') ||
      cleaned.includes('tenbenhnhan') ||
      cleaned === 'ten' ||
      cleaned === 'name' ||
      cleaned === 'patient'
    ) {
      nameIdx = idx;
    } else if (
      cleaned.includes('phong') ||
      cleaned.includes('phon') ||
      cleaned === 'p' ||
      cleaned === 'room'
    ) {
      roomIdx = idx;
    } else if (cleaned === 'sg' || cleaned.includes('sogi')) {
      sgIdx = idx;
    }
  });

  return { sttIdx, nameIdx, roomIdx, sgIdx };
}

/**
 * Xử lý dữ liệu bảng (ma trận 2 chiều các cell)
 */
export function processRawRows(rows: (string | number | null | undefined)[][]): ParseResult {
  if (!rows || rows.length === 0) {
    return {
      patients: [],
      totalPatients: 0,
      validCount: 0,
      invalidCount: 0,
      hasInvalidRoom: false,
      warnings: ['Dữ liệu rỗng, vui lòng tải file hoặc dán danh sách bệnh nhân.'],
    };
  }

  // Tìm dòng tiêu đề
  let headerRowIndex = -1;
  let indices = { sttIdx: -1, nameIdx: -1, roomIdx: -1, sgIdx: -1 };

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const candidateHeaders = rows[r].map((cell) => String(cell || ''));
    const detected = detectColumnIndices(candidateHeaders);
    // Cần tối thiểu có cột Tên hoặc Phòng
    if (detected.nameIdx !== -1 || detected.roomIdx !== -1) {
      headerRowIndex = r;
      indices = detected;
      break;
    }
  }

  // Nếu không tìm thấy hàng tiêu đề rõ ràng, gán mặc định thứ tự thông thường:
  // Cột 0: STT, Cột 1: Họ tên, Cột 2: Phòng, Cột 3: SG (hoặc Cột 1: Phòng, Cột 2: SG, Cột 3: Họ tên)
  let startDataRow = 0;
  if (headerRowIndex !== -1) {
    startDataRow = headerRowIndex + 1;
  } else {
    // Thử đoán theo số cột
    indices = { sttIdx: 0, nameIdx: 1, roomIdx: 2, sgIdx: 3 };
  }

  // Trường hợp cột Tên hoặc Phòng chưa tìm ra
  if (indices.nameIdx === -1 && indices.roomIdx === -1) {
    indices = { sttIdx: 0, nameIdx: 1, roomIdx: 2, sgIdx: 3 };
  } else if (indices.nameIdx === -1) {
    indices.nameIdx = indices.roomIdx === 1 ? 2 : 1;
  } else if (indices.roomIdx === -1) {
    indices.roomIdx = indices.nameIdx === 1 ? 2 : 1;
  }

  const patients: RawPatientRow[] = [];
  const warnings: string[] = [];
  let autoStt = 1;

  for (let r = startDataRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Kiểm tra xem dòng có rỗng hoàn toàn không
    const hasAnyContent = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasAnyContent) continue;

    const rawSttVal = indices.sttIdx !== -1 ? row[indices.sttIdx] : null;
    let stt = parseInt(String(rawSttVal), 10);
    if (isNaN(stt)) {
      stt = autoStt;
    }
    autoStt++;

    const rawName = indices.nameIdx !== -1 && row[indices.nameIdx] !== undefined ? String(row[indices.nameIdx]).trim() : '';
    const rawRoom = indices.roomIdx !== -1 && row[indices.roomIdx] !== undefined ? String(row[indices.roomIdx]).trim() : '';
    const rawSg = indices.sgIdx !== -1 && row[indices.sgIdx] !== undefined ? String(row[indices.sgIdx]).trim() : '';

    // Nếu tên rỗng và phòng rỗng, bỏ qua dòng trống này
    if (!rawName && !rawRoom) continue;

    const roomCheck = normalizeRoom(rawRoom);

    const patientRow: RawPatientRow = {
      id: `p-${r}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      stt,
      name: rawName,
      rawRoom: rawRoom,
      normalizedRoom: roomCheck.normalized,
      isValidRoom: roomCheck.isValid,
      sg: rawSg,
    };

    if (!roomCheck.isValid) {
      warnings.push(`Dòng STT ${stt}: Bệnh nhân "${rawName || '(Không tên)'}" có mã phòng không hợp lệ "${rawRoom || '(Rỗng)'}".`);
    }

    patients.push(patientRow);
  }

  const validCount = patients.filter((p) => p.isValidRoom).length;
  const invalidCount = patients.filter((p) => !p.isValidRoom).length;

  return {
    patients,
    totalPatients: patients.length,
    validCount,
    invalidCount,
    hasInvalidRoom: invalidCount > 0,
    warnings,
  };
}

/**
 * Đọc file Excel (xlsx, xls, csv) qua Buffer hoặc ArrayBuffer
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
    header: 1,
    defval: '',
  });
  return processRawRows(rawRows);
}

/**
 * Phân tích văn bản dán trực tiếp từ Clipboard (Tab-separated hoặc Comma-separated)
 */
export function parseTextTable(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/);
  const rows: string[][] = lines.map((line) => {
    // Ưu tiên tab (copy từ Excel)
    if (line.includes('\t')) {
      return line.split('\t');
    }
    // Nếu có dấu phẩy hoặc chấm phẩy
    if (line.includes(';') && !line.includes(',')) {
      return line.split(';');
    }
    if (line.includes(',')) {
      // Tách theo dấu phẩy cơ bản
      return line.split(',');
    }
    // Mặc định cách nhau bởi 2 khoảng trắng trở lên
    return line.split(/\s{2,}/);
  });

  return processRawRows(rows);
}

/**
 * Xuất danh sách lịch khám ra định dạng Excel (.xlsx)
 * Định dạng: STT | Giờ khám | Bác sĩ | Họ tên | SG | Phòng | KS | PKD | Giờ ngày trước | Trạng thái
 */
export function exportScheduleToExcel(
  patients: ScheduledPatient[],
  dateStr: string = 'Lich_Kham_Noi_Vien'
): void {
  const headers = [
    'STT',
    'GIỜ Y LỆNH',
    'Bác sĩ',
    'Họ và tên',
    'SG',
    'Phòng',
    'Kháng sinh (KS)',
    'Phun khí dung (PKD)',
    'Giờ ngày trước',
    'Ghi chú',
  ];

  const dataRows = patients.map((p, idx) => [
    idx + 1,
    p.slotTime,
    p.assignedDoctorName,
    p.name,
    p.sg || '',
    p.normalizedRoom,
    p.isKS ? 'KS' : '',
    p.isPKD ? 'PKD' : '',
    p.previousTime || '',
    p.note || '', // Cột ghi chú để trống theo yêu cầu
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Cấu hình độ rộng các cột
  worksheet['!cols'] = [
    { wch: 6 }, // STT
    { wch: 15 }, // GIỜ Y LỆNH
    { wch: 22 }, // Bác sĩ
    { wch: 26 }, // Họ tên
    { wch: 8 }, // SG
    { wch: 10 }, // Phòng
    { wch: 14 }, // KS
    { wch: 16 }, // PKD
    { wch: 16 }, // Giờ trước
    { wch: 24 }, // Ghi chú (để trống)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch khám');

  const fileName = `Lich_Kham_${dateStr.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
