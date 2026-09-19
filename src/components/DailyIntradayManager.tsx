import React, { useState, useMemo } from 'react';
import { Doctor, ScheduledPatient, VALID_ROOMS } from '../types';
import {
  UserMinus,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Search,
  RotateCcw,
  Check,
  ChevronRight,
  History,
  Building2,
  Syringe,
  Wind,
} from 'lucide-react';

interface FreedSlot {
  doctorId: string;
  doctorName: string;
  time: string;
  minutes: number;
  freedFromPatientName: string;
  freedAt: string;
}

interface IntradayActivity {
  id: string;
  time: string;
  type: 'discharge' | 'add';
  title: string;
  description: string;
}

interface DailyIntradayManagerProps {
  scheduledPatients: ScheduledPatient[];
  doctors: Doctor[];
  startTime: string;
  onUpdatePatients: (
    updatedList: ScheduledPatient[],
    toastMsg: string,
    freedSlotsUpdate?: FreedSlot[]
  ) => void;
  freedSlots: FreedSlot[];
  setFreedSlots: React.Dispatch<React.SetStateAction<FreedSlot[]>>;
  activities: IntradayActivity[];
  setActivities: React.Dispatch<React.SetStateAction<IntradayActivity[]>>;
  onClose?: () => void;
}

export const DailyIntradayManager: React.FC<DailyIntradayManagerProps> = ({
  scheduledPatients,
  doctors,
  startTime,
  onUpdatePatients,
  freedSlots,
  setFreedSlots,
  activities,
  setActivities,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'discharge' | 'freed_slots'>('add');

  // State cho Bổ sung bệnh nhân mới
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newSg, setNewSg] = useState('');
  const [isKS, setIsKS] = useState(false);
  const [isPKD, setIsPKD] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State cho Xóa bệnh nhân xuất viện
  const [dischargeSearch, setDischargeSearch] = useState('');
  const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<ScheduledPatient | null>(null);
  const [dischargeFeedback, setDischargeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Chuẩn hóa mã phòng và kiểm tra hợp lệ
  const normalizedNewRoom = useMemo(() => {
    let cleaned = newRoom.trim().toUpperCase();
    cleaned = cleaned.replace(/^(PHÒNG|PHONG|P\.|P\s+)/i, 'P');
    cleaned = cleaned.replace(/\s+/g, '');
    return cleaned;
  }, [newRoom]);

  const isValidRoom = useMemo(() => {
    return VALID_ROOMS.includes(normalizedNewRoom as any);
  }, [normalizedNewRoom]);

  // Tìm bác sĩ phụ trách buồng phòng này
  const assignedDoctor = useMemo(() => {
    if (!isValidRoom) return null;
    return doctors.find((d) => d.assignedRooms.includes(normalizedNewRoom)) || null;
  }, [isValidRoom, normalizedNewRoom, doctors]);

  // Dự đoán khung giờ y lệnh thông minh cho bệnh nhân mới này
  const predictedSlot = useMemo(() => {
    if (!assignedDoctor) return null;

    // 1. Kiểm tra xem Bác sĩ này có khung giờ trống do xuất viện không
    const doctorFreedSlots = freedSlots
      .filter((s) => s.doctorId === assignedDoctor.id)
      .sort((a, b) => a.minutes - b.minutes);

    if (doctorFreedSlots.length > 0) {
      const earliestFreed = doctorFreedSlots[0];
      return {
        type: 'freed_slot' as const,
        time: earliestFreed.time,
        minutes: earliestFreed.minutes,
        freedFrom: earliestFreed.freedFromPatientName,
      };
    }

    // 2. Nếu không có khung giờ trống, xếp nối tiếp ca cuối cùng (+5 phút)
    const docPatients = scheduledPatients.filter((p) => p.doctorId === assignedDoctor.id);
    if (docPatients.length === 0) {
      const [h, m] = startTime.split(':').map(Number);
      return {
        type: 'sequential' as const,
        time: startTime,
        minutes: h * 60 + m,
        freedFrom: null,
      };
    }

    const maxMinutes = Math.max(...docPatients.map((p) => p.slotMinutes));
    const nextMinutes = maxMinutes + 5;
    const nextH = Math.floor(nextMinutes / 60);
    const nextM = nextMinutes % 60;
    const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;

    return {
      type: 'sequential' as const,
      time: nextTime,
      minutes: nextMinutes,
      freedFrom: null,
    };
  }, [assignedDoctor, freedSlots, scheduledPatients, startTime]);

  // Xử lý thông minh khi người dùng dán hoặc gõ chuỗi kết hợp (ví dụ: NGUYỄN VĂN A - P1)
  const handleNameInputChange = (val: string) => {
    setNewName(val);
    setAddFeedback(null);

    // Kiểm tra mẫu dạng "NGUYỄN VĂN A - P1" hoặc "NGUYỄN VĂN A, P1"
    const regex = /^(.*?)\s*[-–—,]\s*(HS1|HS2|P1|P2|P3|P4|P5|LK|N1|N2|PM|KL)(?:\s*[-–—,]\s*(.*))?$/i;
    const match = val.match(regex);
    if (match) {
      const extractedName = match[1].trim();
      const extractedRoom = match[2].trim().toUpperCase();
      const extractedSg = match[3]?.trim();

      if (extractedName) setNewName(extractedName);
      if (extractedRoom) setNewRoom(extractedRoom);
      if (extractedSg) setNewSg(extractedSg);
    }
  };

  // 1. HÀNH ĐỘNG: BỔ SUNG BỆNH NHÂN MỚI (TÁI SẮP XẾP THÔNG MINH)
  const handleAddNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFeedback(null);

    const trimmedName = newName.trim().toUpperCase();
    if (!trimmedName) {
      setAddFeedback({ type: 'error', message: 'Vui lòng nhập Họ và tên bệnh nhân.' });
      return;
    }

    if (!isValidRoom) {
      setAddFeedback({
        type: 'error',
        message: `Mã phòng "${newRoom}" không hợp lệ! Hệ thống chỉ chấp nhận đúng 12 mã: ${VALID_ROOMS.join(', ')}.`,
      });
      return;
    }

    if (!assignedDoctor) {
      setAddFeedback({
        type: 'error',
        message: `Phòng "${normalizedNewRoom}" chưa được phân công cho Bác sĩ nào trong danh sách phiên khám hôm nay!`,
      });
      return;
    }

    if (!predictedSlot) {
      setAddFeedback({ type: 'error', message: 'Không thể xác định khung giờ khám cho Bác sĩ này.' });
      return;
    }

    // Tạo bệnh nhân mới
    let noteText = 'Mới nhập viện';
    if (predictedSlot.type === 'freed_slot') {
      noteText = `Mới nhập viện (Lấp khung giờ trống ${predictedSlot.time})`;
    } else {
      noteText = `Mới nhập viện (Xếp nối tiếp ${predictedSlot.time})`;
    }

    const newPatientRecord: ScheduledPatient = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stt: scheduledPatients.length + 1,
      name: trimmedName,
      rawRoom: normalizedNewRoom,
      normalizedRoom: normalizedNewRoom,
      isValidRoom: true,
      sg: newSg.trim(),
      doctorId: assignedDoctor.id,
      doctorName: assignedDoctor.name,
      assignedDoctorName: assignedDoctor.name,
      isKS: isKS,
      isPKD: isPKD,
      previousTime: '',
      matchedPreviousDay: false,
      slotTime: predictedSlot.time,
      slotMinutes: predictedSlot.minutes,
      priorityGroup: isKS ? 'KS' : isPKD ? 'PKD' : 'CON_LAI',
      statusNote: noteText,
      note: '',
      hasConflict: false,
    };

    // Cập nhật danh sách: Giữ nguyên 100% bệnh nhân cũ, thêm bệnh nhân mới, sắp xếp lại theo giờ
    const updatedList = [...scheduledPatients, newPatientRecord].sort((a, b) => {
      if (a.slotMinutes !== b.slotMinutes) return a.slotMinutes - b.slotMinutes;
      return a.stt - b.stt;
    });

    // Nếu đã dùng khung giờ trống, xóa khung giờ đó khỏi danh sách giải phóng
    let updatedFreed = freedSlots;
    if (predictedSlot.type === 'freed_slot') {
      const idx = freedSlots.findIndex(
        (s) => s.doctorId === assignedDoctor.id && s.time === predictedSlot.time
      );
      if (idx !== -1) {
        updatedFreed = [...freedSlots.slice(0, idx), ...freedSlots.slice(idx + 1)];
        setFreedSlots(updatedFreed);
      }
    }

    // Ghi nhật ký hoạt động
    const act: IntradayActivity = {
      id: `act-${Date.now()}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'add',
      title: `Tiếp nhận BN mới: ${trimmedName}`,
      description: `Phòng ${normalizedNewRoom} ➔ Gán vào ${assignedDoctor.name}. Giờ y lệnh: ${predictedSlot.time} (${
        predictedSlot.type === 'freed_slot' ? 'Lấp giờ trống' : 'Xếp nối tiếp'
      })`,
    };
    setActivities((prev) => [act, ...prev]);

    // Gọi cập nhật và lưu ngay vào LỊCH ĐÃ LƯU
    onUpdatePatients(
      updatedList,
      `✓ Đã thêm BN ${trimmedName} (${normalizedNewRoom}) - Giờ khám: ${predictedSlot.time}. Tự động đồng bộ vào LỊCH ĐÃ LƯU!`,
      updatedFreed
    );

    // Reset form
    setNewName('');
    setNewRoom('');
    setNewSg('');
    setIsKS(false);
    setIsPKD(false);
    setAddFeedback({
      type: 'success',
      message: `✓ Đã tiếp nhận và xếp giờ ${predictedSlot.time} cho bệnh nhân ${trimmedName} (${assignedDoctor.name}) thành công!`,
    });
  };

  // 2. HÀNH ĐỘNG: XÓA BỆNH NHÂN XUẤT VIỆN (GIẢI PHÓNG KHUNG GIỜ)
  const handleConfirmDischarge = (patient: ScheduledPatient) => {
    setDischargeFeedback(null);

    // Xóa bệnh nhân khỏi danh sách
    const updatedList = scheduledPatients.filter((p) => p.id !== patient.id);

    // Thêm khung giờ vào danh sách giải phóng của Bác sĩ đó
    const newFreedSlot: FreedSlot = {
      doctorId: patient.doctorId,
      doctorName: patient.assignedDoctorName,
      time: patient.slotTime,
      minutes: patient.slotMinutes,
      freedFromPatientName: patient.name,
      freedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedFreed = [...freedSlots, newFreedSlot];
    setFreedSlots(updatedFreed);

    // Ghi nhật ký
    const act: IntradayActivity = {
      id: `act-${Date.now()}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'discharge',
      title: `Xuất viện: ${patient.name}`,
      description: `Phòng ${patient.normalizedRoom} (${patient.assignedDoctorName}). Đã giải phóng khung giờ ${patient.slotTime}.`,
    };
    setActivities((prev) => [act, ...prev]);

    // Gọi cập nhật và lưu ngay vào LỊCH ĐÃ LƯU
    onUpdatePatients(
      updatedList,
      `✓ Đã xuất viện BN ${patient.name}. Khung giờ ${patient.slotTime} của ${patient.assignedDoctorName} đã được giải phóng!`,
      updatedFreed
    );

    setSelectedPatientForDischarge(null);
    setDischargeSearch('');
    setDischargeFeedback({
      type: 'success',
      message: `✓ Đã cho xuất viện ${patient.name} (Phòng ${patient.normalizedRoom}). Khung giờ ${patient.slotTime} sẵn sàng đón bệnh nhân mới!`,
    });
  };

  // Bộ lọc tìm kiếm bệnh nhân xuất viện theo tên hoặc STT
  const dischargeCandidates = useMemo(() => {
    if (!dischargeSearch.trim()) return scheduledPatients.slice(0, 8);
    const q = dischargeSearch.trim().toLowerCase();
    return scheduledPatients.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchRoom = p.normalizedRoom.toLowerCase().includes(q);
      const matchStt = p.stt.toString() === q;
      const matchTime = p.slotTime.includes(q);
      return matchName || matchRoom || matchStt || matchTime;
    });
  }, [dischargeSearch, scheduledPatients]);

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-xl overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base tracking-tight text-white">
                QUẢN LÝ BIẾN ĐỘNG TRONG NGÀY
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tự động đồng bộ Lịch Đã Lưu
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Xử lý Xuất viện (giải phóng giờ) & Tiếp nhận BN mới (tái sắp xếp thông minh giữ nguyên giờ cũ)
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Tiếp Nhận BN Mới
          </button>

          <button
            onClick={() => setActiveTab('discharge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discharge'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5" />
            Xóa BN Xuất Viện
          </button>

          <button
            onClick={() => setActiveTab('freed_slots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'freed_slots'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Giờ Trống ({freedSlots.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-5">
        {/* ======================= TAB 1: BỔ SUNG BỆNH NHÂN MỚI ======================= */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Quy tắc tái sắp xếp thông minh:</span> Giữ nguyên 100% mốc giờ của tất cả các bệnh nhân cũ đang điều trị. Bệnh nhân mới được ưu tiên lấp vào khung giờ trống vừa được giải phóng do xuất viện, hoặc xếp nối tiếp ngay phía sau ca cuối cùng (+5 phút).
              </div>
            </div>

            {addFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  addFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {addFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{addFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleAddNewPatient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Họ và tên */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Họ và Tên Bệnh Nhân *</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      (Hỗ trợ dán "NGUYỄN VĂN A - P1")
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NGUYỄN VĂN AN hoặc NGUYỄN VĂN A - P1"
                    value={newName}
                    onChange={(e) => handleNameInputChange(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 uppercase"
                  />
                </div>

                {/* Phòng bệnh (12 mã hợp lệ) */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Mã Phòng *</span>
                    <span className="text-[10px] text-slate-500 font-mono">12 mã chuẩn</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="VD: P1, HS1, LK..."
                      value={newRoom}
                      onChange={(e) => {
                        setNewRoom(e.target.value);
                        setAddFeedback(null);
                      }}
                      className={`w-full text-xs font-mono font-bold uppercase border rounded-xl px-3 py-2.5 focus:outline-none ${
                        newRoom
                          ? isValidRoom
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950'
                            : 'border-rose-500 bg-rose-50/20 text-rose-900'
                          : 'border-slate-300'
                      }`}
                    />
                    {newRoom && (
                      <span className="absolute right-2.5 top-2.5 text-xs">
                        {isValidRoom ? (
                          <span className="text-emerald-600 font-bold">✓ Hợp lệ</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✕ Sai mã</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Số giường SG (tùy chọn) */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    <span>Số Giường (SG)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: G01"
                    value={newSg}
                    onChange={(e) => setNewSg(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Diện ưu tiên KS & PKD */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Diện Ưu Tiên</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <label className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isKS}
                        onChange={(e) => setIsKS(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>KS</span>
                    </label>

                    <label className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPKD}
                        onChange={(e) => setIsPKD(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>PKD</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Thông tin dự đoán tự động phân công và khung giờ khám */}
              {newRoom && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Bác sĩ tiếp nhận buồng:</span>
                    {assignedDoctor ? (
                      <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {assignedDoctor.name} (Phụ trách: {assignedDoctor.assignedRooms.join(', ')})
                      </span>
                    ) : isValidRoom ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Chưa phân công BS cho phòng {normalizedNewRoom}
                      </span>
                    ) : (
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Chỉ chấp nhận: {VALID_ROOMS.join(', ')}
                      </span>
                    )}
                  </div>

                  {predictedSlot && assignedDoctor && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Giờ Y Lệnh dự kiến:</span>
                      <span className="font-mono font-black text-sm text-slate-950 bg-white border border-slate-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {predictedSlot.time}
                      </span>
                      {predictedSlot.type === 'freed_slot' ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          ✓ Lấp khung giờ trống của BN {predictedSlot.freedFrom}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          ✓ Nối tiếp ca cuối cùng (+5 phút)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Nút hành động thêm */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!newName.trim() || !isValidRoom || !assignedDoctor}
                  className="px-5 py-2.5 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  + Thêm Bệnh Nhân & Tái Sắp Xếp Thông Minh
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================= TAB 2: XÓA BỆNH NHÂN XUẤT VIỆN ======================= */}
        {activeTab === 'discharge' && (
          <div className="space-y-4">
            <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-950 flex items-start gap-2.5">
              <UserMinus className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Cơ chế giải phóng khung giờ:</span> Khi bệnh nhân xuất viện, hệ thống sẽ xóa bệnh nhân khỏi danh sách ca khám và giải phóng khung giờ đó của Bác sĩ phụ trách. Giờ trống này sẽ được ưu tiên dành cho bệnh nhân mới nhập viện sau đó.
              </div>
            </div>

            {dischargeFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  dischargeFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dischargeFeedback.message}</span>
              </div>
            )}

            {/* Ô tìm kiếm bệnh nhân xuất viện theo tên hoặc STT */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Nhập tên bệnh nhân hoặc STT để xuất viện nhanh..."
                value={dischargeSearch}
                onChange={(e) => setDischargeSearch(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Danh sách ứng viên xuất viện */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="bg-slate-50 px-3.5 py-2 text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                <span>Danh sách Bệnh nhân ({dischargeCandidates.length})</span>
                <span className="font-normal text-slate-400">Nhấn nút "Xuất viện" để giải phóng giờ</span>
              </div>

              {dischargeCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Không tìm thấy bệnh nhân nào khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {dischargeCandidates.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-400 w-6 text-center">
                          #{p.stt}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="font-mono text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                              P.{p.normalizedRoom} {p.sg ? `(G.${p.sg})` : ''}
                            </span>
                            {p.isKS && (
                              <span className="text-[10px] font-black px-1 py-0.2 bg-rose-100 text-rose-800 rounded">
                                KS
                              </span>
                            )}
                            {p.isPKD && (
                              <span className="text-[10px] font-black px-1 py-0.2 bg-teal-100 text-teal-800 rounded">
                                PKD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {p.assignedDoctorName} — Khung giờ đang chiếm:{' '}
                            <strong className="font-mono text-slate-900">{p.slotTime}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Nút xác nhận xuất viện */}
                      {selectedPatientForDischarge?.id === p.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-700">Xác nhận xuất viện?</span>
                          <button
                            onClick={() => handleConfirmDischarge(p)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Đồng Ý
                          </button>
                          <button
                            onClick={() => setSelectedPatientForDischarge(null)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedPatientForDischarge(p)}
                          className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Giải phóng khung giờ của bệnh nhân này"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Xuất Viện
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB 3: DANH SÁCH GIỜ TRỐNG ĐÃ GIẢI PHÓNG ======================= */}
        {activeTab === 'freed_slots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                Hiện có <strong>{freedSlots.length}</strong> khung giờ trống đã được giải phóng do xuất viện.
              </span>
              <span className="text-[11px] text-slate-400">
                Sẽ tự động được lấp khi thêm bệnh nhân mới vào Bác sĩ đó
              </span>
            </div>

            {freedSlots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Chưa có khung giờ trống nào. Khi bạn bấm "Xuất viện" cho bệnh nhân, khung giờ đó sẽ xuất hiện tại đây.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {freedSlots.map((slot, index) => (
                  <div
                    key={`${slot.doctorId}-${slot.time}-${index}`}
                    className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-base text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                        {slot.time}
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100/60 px-2 py-0.5 rounded-full">
                        Giải phóng lúc {slot.freedAt}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">{slot.doctorName}</div>
                    <div className="text-[11px] text-slate-500">
                      Từ BN ra viện: <strong>{slot.freedFromPatientName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lịch sử hoạt động biến động gần đây */}
            {activities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nhật ký biến động trong phiên hôm nay:</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2"
                    >
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                        {act.time}
                      </span>
                      <div className="flex-1">
                        <span
                          className={`font-bold mr-1.5 ${
                            act.type === 'discharge' ? 'text-rose-700' : 'text-indigo-700'
                          }`}
                        >
                          [{act.type === 'discharge' ? 'XUẤT VIỆN' : 'TIẾP NHẬN'}]
                        </span>
                        <span className="font-semibold text-slate-800">{act.title}</span>
                        <span className="text-slate-500 block text-[11px] mt-0.5">
                          {act.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
