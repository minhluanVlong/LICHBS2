export const VALID_ROOMS = [
  'HS1',
  'HS2',
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'LK',
  'N1',
  'N2',
  'PM',
  'KL',
] as const;

export type ValidRoomCode = typeof VALID_ROOMS[number];

export interface RawPatientRow {
  id: string;
  stt: number;
  name: string;
  rawRoom: string;
  normalizedRoom: string;
  isValidRoom: boolean;
  sg: string; // Cột phụ, giữ nguyên giá trị, cho phép rỗng
}

export interface Doctor {
  id: string;
  name: string;
  assignedRooms: string[];
}

export interface PatientWithDoctor extends RawPatientRow {
  doctorId: string;
  doctorName: string;
}

export interface PatientClinicalFlags extends PatientWithDoctor {
  isKS: boolean; // Kháng sinh
  isPKD: boolean; // Phun khí dung
  previousTime?: string; // Giờ khám ngày trước (nếu tìm thấy qua tổ hợp [HỌ TÊN + PHÒNG])
  matchedPreviousDay?: boolean;
}

export interface ScheduledPatient extends PatientClinicalFlags {
  slotTime: string; // e.g. "07:00"
  slotMinutes: number; // minutes from 00:00
  priorityGroup: 'KS' | 'PKD' | 'CON_LAI';
  statusNote: string;
  note?: string; // Cột ghi chú (mặc định để trống theo yêu cầu người dùng)
  hasConflict: boolean;
  assignedDoctorName: string;
}

export interface SavedScheduleDay {
  id: string; // ISO date string (YYYY-MM-DD)
  displayDate: string; // DD/MM/YYYY
  dayOfWeek: string; // "Thứ Hai", "Thứ Ba", ... "Chủ Nhật"
  createdAt: string;
  startTime: string;
  doctors: Doctor[];
  patients: ScheduledPatient[];
  totalPatients: number;
  totalKS: number;
  totalPKD: number;
}
