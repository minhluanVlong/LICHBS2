import { PatientClinicalFlags, ScheduledPatient, Doctor } from '../types';

/**
 * Chuyển đổi "HH:mm" thành số phút tính từ 00:00
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Chuyển đổi số phút tính từ 00:00 thành định dạng "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

/**
 * Tìm slot 5 phút trống gần nhất với targetMinutes, >= startMinutes
 */
function findNearestAvailableSlot(
  targetMinutes: number,
  startMinutes: number,
  occupiedSlots: Set<number>,
  stepMinutes: number = 5
): number {
  // Bắt đầu từ khoảng lệch 0, sau đó mở rộng -step, +step, -2*step, +2*step...
  let delta = 0;
  const maxDelta = 24 * 60; // Giới hạn tìm kiếm trong ngày

  while (delta <= maxDelta) {
    // Ưu tiên slot lùi trước (-delta) nếu >= startMinutes
    if (delta > 0) {
      const earlierSlot = targetMinutes - delta;
      if (earlierSlot >= startMinutes && !occupiedSlots.has(earlierSlot)) {
        return earlierSlot;
      }
    }

    // Sau đó thử slot tiến (+delta)
    const laterSlot = targetMinutes + delta;
    if (laterSlot >= startMinutes && !occupiedSlots.has(laterSlot)) {
      return laterSlot;
    }

    delta += stepMinutes;
  }

  // Fallback an toàn nếu cực kỳ đông bệnh nhân
  let fallbackSlot = startMinutes;
  while (occupiedSlots.has(fallbackSlot)) {
    fallbackSlot += stepMinutes;
  }
  return fallbackSlot;
}

/**
 * Tìm slot sớm nhất còn trống từ startMinutes
 */
function findEarliestAvailableSlot(
  startMinutes: number,
  occupiedSlots: Set<number>,
  stepMinutes: number = 5
): number {
  let slot = startMinutes;
  while (occupiedSlots.has(slot)) {
    slot += stepMinutes;
  }
  return slot;
}

/**
 * Thuật toán lập lịch 5 phút chính xác cho từng Bác sĩ:
 * 1. Phân nhóm ưu tiên: KS (1) > PKD (2) > CÒN LẠI (3)
 * 2. Kế thừa giờ ngày trước:
 *    - Cố gắng giữ nguyên giờ ngày trước
 *    - Nếu xung đột: ưu tiên cao hơn giữ giờ, người còn lại tìm mốc trống gần nhất (+/- 5, 10...)
 * 3. Lấp đầy vị trí còn lại theo thứ tự KS -> PKD -> CÒN LẠI
 */
export function schedulePatientsForDoctor(
  doctor: Doctor,
  patientsOfDoctor: PatientClinicalFlags[],
  startTimeStr: string = '07:00',
  stepMinutes: number = 5
): ScheduledPatient[] {
  if (patientsOfDoctor.length === 0) {
    return [];
  }

  const startMinutes = timeToMinutes(startTimeStr);
  const occupiedSlots = new Set<number>();

  // Xác định nhóm ưu tiên cho mỗi bệnh nhân
  const getPriority = (p: PatientClinicalFlags): { group: 'KS' | 'PKD' | 'CON_LAI'; rank: number } => {
    if (p.isKS) return { group: 'KS', rank: 1 };
    if (p.isPKD) return { group: 'PKD', rank: 2 };
    return { group: 'CON_LAI', rank: 3 };
  };

  interface PatientSchedulingData {
    patient: PatientClinicalFlags;
    priorityGroup: 'KS' | 'PKD' | 'CON_LAI';
    priorityRank: number;
    assignedSlotMinutes?: number;
    statusNote: string;
    hasConflict: boolean;
  }

  const patientsData: PatientSchedulingData[] = patientsOfDoctor.map((p) => {
    const { group, rank } = getPriority(p);
    return {
      patient: p,
      priorityGroup: group,
      priorityRank: rank,
      statusNote: '',
      hasConflict: false,
    };
  });

  // Nhóm các bệnh nhân có giờ ngày trước theo target slot
  const previousTimeMap = new Map<number, PatientSchedulingData[]>();
  const patientsWithoutPreviousTime: PatientSchedulingData[] = [];

  for (const item of patientsData) {
    if (item.patient.previousTime) {
      let targetMin = timeToMinutes(item.patient.previousTime);
      // Chuẩn hóa về bội số của 5 phút
      targetMin = Math.round(targetMin / stepMinutes) * stepMinutes;
      if (targetMin < startMinutes) {
        targetMin = startMinutes;
      }

      const list = previousTimeMap.get(targetMin) || [];
      list.push(item);
      previousTimeMap.set(targetMin, list);
    } else {
      patientsWithoutPreviousTime.push(item);
    }
  }

  // Bước 2: Kế thừa & giải quyết xung đột
  const conflictedPatientsToPlace: PatientSchedulingData[] = [];

  for (const [slotMin, candidates] of previousTimeMap.entries()) {
    if (candidates.length === 1) {
      // 1 bệnh nhân duy nhất muốn slot này
      const winner = candidates[0];
      winner.assignedSlotMinutes = slotMin;
      winner.statusNote = `✓ Giữ giờ ngày trước (${minutesToTime(slotMin)})`;
      winner.hasConflict = false;
      occupiedSlots.add(slotMin);
    } else {
      // Có từ 2 bệnh nhân trùng giờ ngày trước -> XUNG ĐỘT
      // Sắp xếp: Ưu tiên cao hơn (rank 1 < rank 2 < rank 3) giữ giờ; nếu hòa rank giữ người theo STT
      candidates.sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
          return a.priorityRank - b.priorityRank;
        }
        return a.patient.stt - b.patient.stt;
      });

      const winner = candidates[0];
      winner.assignedSlotMinutes = slotMin;
      winner.statusNote = `✓ Giữ giờ ngày trước (${minutesToTime(slotMin)})`;
      winner.hasConflict = false;
      occupiedSlots.add(slotMin);

      // Những người còn lại phải điều chỉnh sang slot gần nhất
      for (let i = 1; i < candidates.length; i++) {
        candidates[i].hasConflict = true;
        conflictedPatientsToPlace.push(candidates[i]);
      }
    }
  }

  // Xếp slot gần nhất cho những người bị xung đột (ưu tiên người rank cao xử lý trước)
  conflictedPatientsToPlace.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    return a.patient.stt - b.patient.stt;
  });

  for (const item of conflictedPatientsToPlace) {
    const targetMin = timeToMinutes(item.patient.previousTime!);
    const nearestSlot = findNearestAvailableSlot(targetMin, startMinutes, occupiedSlots, stepMinutes);
    item.assignedSlotMinutes = nearestSlot;
    occupiedSlots.add(nearestSlot);
    item.statusNote = `⚠ Giờ đã được điều chỉnh do xung đột (ngày trước: ${item.patient.previousTime})`;
  }

  // Bước 3: Lấp đầy các bệnh nhân chưa có giờ ngày trước theo thứ tự KS -> PKD -> CÒN LẠI
  patientsWithoutPreviousTime.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    return a.patient.stt - b.patient.stt;
  });

  for (const item of patientsWithoutPreviousTime) {
    const earliestSlot = findEarliestAvailableSlot(startMinutes, occupiedSlots, stepMinutes);
    item.assignedSlotMinutes = earliestSlot;
    occupiedSlots.add(earliestSlot);

    if (item.priorityGroup === 'KS') {
      item.statusNote = 'Lên lịch mới (Kháng sinh KS - Ưu tiên 1)';
    } else if (item.priorityGroup === 'PKD') {
      item.statusNote = 'Lên lịch mới (Phun khí dung PKD - Ưu tiên 2)';
    } else {
      item.statusNote = 'Lên lịch mới (Khám thường)';
    }
  }

  // Tổng hợp kết quả và sắp xếp tăng dần theo mốc giờ khám (chronological order)
  const scheduled: ScheduledPatient[] = patientsData.map((d) => {
    const slotMin = d.assignedSlotMinutes!;
    return {
      ...d.patient,
      slotMinutes: slotMin,
      slotTime: minutesToTime(slotMin),
      priorityGroup: d.priorityGroup,
      statusNote: d.statusNote,
      note: '', // Cột ghi chú để trống theo yêu cầu
      hasConflict: d.hasConflict,
      assignedDoctorName: doctor.name,
      previousTime: d.patient.previousTime || '',
      matchedPreviousDay: Boolean(d.patient.matchedPreviousDay),
    };
  });

  scheduled.sort((a, b) => a.slotMinutes - b.slotMinutes);
  return scheduled;
}
