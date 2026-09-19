import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SavedScheduleDay } from '../types';

const COLLECTION_PATH = 'saved_schedules';

/**
 * Đệ quy làm sạch đối tượng để đảm bảo tương thích 100% với Cloud Firestore:
 * - Loại bỏ toàn bộ các key có giá trị `undefined`
 * - Không cho phép bất kỳ giá trị `undefined` nào tồn tại trong Map hoặc Array
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result as T;
}

/**
 * Lưu hoặc cập nhật bản ghi lịch vào Cloud Firestore với dữ liệu được chuẩn hóa an toàn
 */
export async function saveScheduleToFirestore(schedule: SavedScheduleDay): Promise<void> {
  const docPath = `${COLLECTION_PATH}/${schedule.id}`;
  try {
    const docRef = doc(db, COLLECTION_PATH, schedule.id);

    // Chuẩn hóa toàn diện danh sách bệnh nhân để không có bất kỳ trường nào bị undefined
    const cleanedPatients = (schedule.patients || []).map((p, idx) => ({
      id: p.id ? String(p.id) : `p-${idx}`,
      stt: typeof p.stt === 'number' ? p.stt : idx + 1,
      name: p.name ? String(p.name) : '',
      rawRoom: p.rawRoom ? String(p.rawRoom) : '',
      normalizedRoom: p.normalizedRoom ? String(p.normalizedRoom) : '',
      isValidRoom: typeof p.isValidRoom === 'boolean' ? p.isValidRoom : true,
      sg: p.sg ? String(p.sg) : '',
      doctorId: p.doctorId ? String(p.doctorId) : '',
      doctorName: p.doctorName ? String(p.doctorName) : '',
      assignedDoctorName:
        p.assignedDoctorName ? String(p.assignedDoctorName) : p.doctorName ? String(p.doctorName) : '',
      isKS: Boolean(p.isKS),
      isPKD: Boolean(p.isPKD),
      previousTime: p.previousTime ? String(p.previousTime) : '',
      matchedPreviousDay: Boolean(p.matchedPreviousDay),
      slotTime: p.slotTime ? String(p.slotTime) : '07:00',
      slotMinutes: typeof p.slotMinutes === 'number' ? p.slotMinutes : 420,
      priorityGroup: p.priorityGroup || 'CON_LAI',
      statusNote: p.statusNote ? String(p.statusNote) : '',
      note: p.note ? String(p.note) : '',
      hasConflict: Boolean(p.hasConflict),
    }));

    // Chuẩn hóa danh sách bác sĩ
    const cleanedDoctors = (schedule.doctors || []).map((d) => ({
      id: d.id ? String(d.id) : '',
      name: d.name ? String(d.name) : '',
      assignedRooms: Array.isArray(d.assignedRooms) ? d.assignedRooms.map(String).filter(Boolean) : [],
    }));

    // Bảo tồn createdAt khi cập nhật bản ghi đã có trên Firestore để tuân thủ Security Rules
    let finalCreatedAt = schedule.createdAt || new Date().toISOString();
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data();
        if (existingData && existingData.createdAt) {
          finalCreatedAt = existingData.createdAt;
        }
      }
    } catch {
      // Nếu không đọc được bản ghi hiện tại, giữ giá trị schedule.createdAt hiện có
    }

    const rawPayload = {
      id: schedule.id,
      displayDate: schedule.displayDate || '',
      dayOfWeek: schedule.dayOfWeek || '',
      createdAt: finalCreatedAt,
      startTime: schedule.startTime || '07:00',
      doctors: cleanedDoctors,
      patients: cleanedPatients,
      totalPatients: schedule.totalPatients ?? cleanedPatients.length,
      totalKS: schedule.totalKS ?? cleanedPatients.filter((p) => p.isKS).length,
      totalPKD: schedule.totalPKD ?? cleanedPatients.filter((p) => p.isPKD).length,
      updatedAt: new Date().toISOString(),
    };

    // Làm sạch triệt để toàn bộ payload
    const safePayload = cleanForFirestore(rawPayload);

    await setDoc(docRef, safePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Xóa một bản ghi lịch khỏi Cloud Firestore
 */
export async function deleteScheduleFromFirestore(scheduleId: string): Promise<void> {
  const docPath = `${COLLECTION_PATH}/${scheduleId}`;
  try {
    const docRef = doc(db, COLLECTION_PATH, scheduleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Lấy toàn bộ danh sách lịch đã lưu từ Cloud Firestore
 */
export async function fetchSavedSchedulesFromFirestore(): Promise<SavedScheduleDay[]> {
  try {
    const colRef = collection(db, COLLECTION_PATH);
    const snap = await getDocs(colRef);
    const list: SavedScheduleDay[] = [];
    snap.forEach((d) => {
      list.push(d.data() as SavedScheduleDay);
    });
    // Sắp xếp theo ngày mới nhất lên đầu
    list.sort((a, b) => b.id.localeCompare(a.id));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
  }
}

/**
 * Lắng nghe thay đổi thời gian thực từ Cloud Firestore
 */
export function subscribeSavedSchedulesFromFirestore(
  onData: (schedules: SavedScheduleDay[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, COLLECTION_PATH);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: SavedScheduleDay[] = [];
      snap.forEach((d) => {
        list.push(d.data() as SavedScheduleDay);
      });
      list.sort((a, b) => b.id.localeCompare(a.id));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
      } catch (e) {
        if (onError && e instanceof Error) {
          onError(e);
        }
      }
    }
  );
}
