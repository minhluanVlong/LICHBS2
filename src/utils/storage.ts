import { SavedScheduleDay } from '../types';

const STORAGE_KEY = 'SMART_HOSPITAL_SCHEDULE_RECORDS_V1';

export function getSavedSchedules(): SavedScheduleDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Khởi tạo một bản ghi lịch mẫu của ngày trước để người dùng trải nghiệm ngay tính năng đối chiếu giờ
      const sample = createDefaultYesterdaySample();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
      return [sample];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Lỗi khi đọc lịch từ localStorage:', err);
    return [];
  }
}

export function saveScheduleDay(schedule: SavedScheduleDay): void {
  try {
    const existing = getSavedSchedules();
    // Thay thế nếu trùng id (ngày), hoặc thêm mới
    const filtered = existing.filter((s) => s.id !== schedule.id);
    const updated = [schedule, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Lỗi khi lưu lịch vào localStorage:', err);
  }
}

export function deleteSavedSchedule(id: string): SavedScheduleDay[] {
  try {
    const existing = getSavedSchedules();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Lỗi khi xóa lịch:', err);
    return [];
  }
}

/**
 * Tạo dữ liệu ngày trước mẫu để kiểm thử việc đối chiếu [HỌ TÊN + PHÒNG]
 */
function createDefaultYesterdaySample(): SavedScheduleDay {
  return {
    id: '2026-09-18',
    displayDate: '18/09/2026',
    dayOfWeek: 'Thứ Sáu',
    createdAt: new Date('2026-09-18T07:00:00').toISOString(),
    startTime: '07:00',
    totalPatients: 6,
    totalKS: 2,
    totalPKD: 2,
    doctors: [
      { id: 'bs1', name: 'BS. Nguyễn Văn An', assignedRooms: ['HS1', 'HS2', 'P1', 'P2'] },
      { id: 'bs2', name: 'BS. Trần Thị Bình', assignedRooms: ['P3', 'P4', 'P5', 'LK'] },
      { id: 'bs3', name: 'BS. Lê Hoàng Cường', assignedRooms: ['N1', 'N2', 'PM', 'KL'] },
    ],
    patients: [
      {
        id: 'sample-p1',
        stt: 1,
        name: 'NGUYỄN VĂN MINH',
        rawRoom: 'HS1',
        normalizedRoom: 'HS1',
        isValidRoom: true,
        sg: 'G01',
        doctorId: 'bs1',
        doctorName: 'BS. Nguyễn Văn An',
        assignedDoctorName: 'BS. Nguyễn Văn An',
        isKS: true,
        isPKD: false,
        previousTime: '07:00',
        slotTime: '07:00',
        slotMinutes: 420,
        priorityGroup: 'KS',
        statusNote: '✓ Giữ giờ ngày trước (07:00)',
        hasConflict: false,
      },
      {
        id: 'sample-p2',
        stt: 2,
        name: 'TRẦN THỊ MAI',
        rawRoom: 'HS1',
        normalizedRoom: 'HS1',
        isValidRoom: true,
        sg: 'G02',
        doctorId: 'bs1',
        doctorName: 'BS. Nguyễn Văn An',
        assignedDoctorName: 'BS. Nguyễn Văn An',
        isKS: false,
        isPKD: true,
        previousTime: '07:05',
        slotTime: '07:05',
        slotMinutes: 425,
        priorityGroup: 'PKD',
        statusNote: '✓ Giữ giờ ngày trước (07:05)',
        hasConflict: false,
      },
      {
        id: 'sample-p3',
        stt: 3,
        name: 'LÊ VĂN HÙNG',
        rawRoom: 'P1',
        normalizedRoom: 'P1',
        isValidRoom: true,
        sg: 'G03',
        doctorId: 'bs1',
        doctorName: 'BS. Nguyễn Văn An',
        assignedDoctorName: 'BS. Nguyễn Văn An',
        isKS: false,
        isPKD: false,
        previousTime: '07:10',
        slotTime: '07:10',
        slotMinutes: 430,
        priorityGroup: 'CON_LAI',
        statusNote: '✓ Giữ giờ ngày trước (07:10)',
        hasConflict: false,
      },
      {
        id: 'sample-p4',
        stt: 4,
        name: 'PHẠM THỊ HỒNG',
        rawRoom: 'P3',
        normalizedRoom: 'P3',
        isValidRoom: true,
        sg: 'G01',
        doctorId: 'bs2',
        doctorName: 'BS. Trần Thị Bình',
        assignedDoctorName: 'BS. Trần Thị Bình',
        isKS: true,
        isPKD: false,
        previousTime: '07:00',
        slotTime: '07:00',
        slotMinutes: 420,
        priorityGroup: 'KS',
        statusNote: '✓ Giữ giờ ngày trước (07:00)',
        hasConflict: false,
      },
      {
        id: 'sample-p5',
        stt: 5,
        name: 'VÕ VĂN ĐỨC',
        rawRoom: 'P4',
        normalizedRoom: 'P4',
        isValidRoom: true,
        sg: 'G02',
        doctorId: 'bs2',
        doctorName: 'BS. Trần Thị Bình',
        assignedDoctorName: 'BS. Trần Thị Bình',
        isKS: false,
        isPKD: true,
        previousTime: '07:05',
        slotTime: '07:05',
        slotMinutes: 425,
        priorityGroup: 'PKD',
        statusNote: '✓ Giữ giờ ngày trước (07:05)',
        hasConflict: false,
      },
      {
        id: 'sample-p6',
        stt: 6,
        name: 'HOÀNG THỊ THẢO',
        rawRoom: 'N1',
        normalizedRoom: 'N1',
        isValidRoom: true,
        sg: 'G01',
        doctorId: 'bs3',
        doctorName: 'BS. Lê Hoàng Cường',
        assignedDoctorName: 'BS. Lê Hoàng Cường',
        isKS: false,
        isPKD: false,
        previousTime: '07:00',
        slotTime: '07:00',
        slotMinutes: 420,
        priorityGroup: 'CON_LAI',
        statusNote: '✓ Giữ giờ ngày trước (07:00)',
        hasConflict: false,
      },
    ],
  };
}
