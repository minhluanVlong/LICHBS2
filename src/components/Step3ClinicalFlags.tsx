import React, { useState, useMemo } from 'react';
import {
  PatientClinicalFlags,
  Doctor,
  RawPatientRow,
  SavedScheduleDay,
} from '../types';
import { generatePatientCompositeKey } from '../utils/roomUtils';
import {
  Pill,
  Wind,
  Clock,
  Search,
  Filter,
  ArrowLeft,
  Settings,
  Sparkles,
  HelpCircle,
  History,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Step3ClinicalFlagsProps {
  patients: RawPatientRow[];
  doctors: Doctor[];
  savedHistory: SavedScheduleDay[];
  clinicalFlags: Map<string, { isKS: boolean; isPKD: boolean; previousTime?: string }>;
  onUpdateFlags: (
    flags: Map<string, { isKS: boolean; isPKD: boolean; previousTime?: string }>
  ) => void;
  startTime: string;
  onStartTimeChange: (time: string) => void;
  onRunScheduler: () => void;
  onPrevStep: () => void;
}

export const Step3ClinicalFlags: React.FC<Step3ClinicalFlagsProps> = ({
  patients,
  doctors,
  savedHistory,
  clinicalFlags,
  onUpdateFlags,
  startTime,
  onStartTimeChange,
  onRunScheduler,
  onPrevStep,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [selectedHistoryDayId, setSelectedHistoryDayId] = useState<string>(
    savedHistory.length > 0 ? savedHistory[0].id : ''
  );

  // Ánh xạ phòng -> Bác sĩ phụ trách
  const roomToDoctorMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    doctors.forEach((doc) => {
      doc.assignedRooms.forEach((room) => {
        map.set(room, { id: doc.id, name: doc.name });
      });
    });
    return map;
  }, [doctors]);

  // Lấy dữ liệu ngày trước được chọn để đối chiếu
  const previousDayRecord = useMemo(() => {
    return savedHistory.find((h) => h.id === selectedHistoryDayId) || null;
  }, [savedHistory, selectedHistoryDayId]);

  // Tạo chỉ mục đối chiếu theo khóa bất di bất dịch: [HỌ VÀ TÊN + PHÒNG]
  const previousDayIndex = useMemo(() => {
    const index = new Map<
      string,
      { time: string; wasKS: boolean; wasPKD: boolean; docName: string }
    >();
    if (!previousDayRecord) return index;

    previousDayRecord.patients.forEach((p) => {
      const key = generatePatientCompositeKey(p.name, p.normalizedRoom);
      index.set(key, {
        time: p.slotTime,
        wasKS: p.isKS,
        wasPKD: p.isPKD,
        docName: p.assignedDoctorName,
      });
    });

    return index;
  }, [previousDayRecord]);

  // Kết hợp thông tin bệnh nhân + bác sĩ + kết quả đối chiếu ngày trước
  const fullPatientList: PatientClinicalFlags[] = useMemo(() => {
    return patients.map((p) => {
      const doc = roomToDoctorMap.get(p.normalizedRoom) || {
        id: 'unknown',
        name: 'Chưa phân công',
      };

      const compKey = generatePatientCompositeKey(p.name, p.normalizedRoom);
      const prev = previousDayIndex.get(compKey);

      const currentFlags = clinicalFlags.get(p.id);

      return {
        ...p,
        doctorId: doc.id,
        doctorName: doc.name,
        isKS: currentFlags ? currentFlags.isKS : false,
        isPKD: currentFlags ? currentFlags.isPKD : false,
        previousTime: prev ? prev.time : currentFlags?.previousTime,
        matchedPreviousDay: !!prev,
      };
    });
  }, [patients, roomToDoctorMap, previousDayIndex, clinicalFlags]);

  // Thống kê số lượng chỉ định
  const stats = useMemo(() => {
    let ksCount = 0;
    let pkdCount = 0;
    let matchedPrevCount = 0;

    fullPatientList.forEach((p) => {
      if (p.isKS) ksCount++;
      if (p.isPKD) pkdCount++;
      if (p.matchedPreviousDay) matchedPrevCount++;
    });

    return {
      total: fullPatientList.length,
      ksCount,
      pkdCount,
      conLaiCount: fullPatientList.length - (ksCount > 0 || pkdCount > 0 ? 1 : 0),
      matchedPrevCount,
    };
  }, [fullPatientList]);

  // Thao tác toggle KS / PKD (KHÔNG TỰ SUY DIỄN - CHỈ NGƯỜI DÙNG TÍCH CHỌN)
  const handleToggleKS = (patientId: string) => {
    const updated = new Map(clinicalFlags);
    const existing = updated.get(patientId) || { isKS: false, isPKD: false };
    const patientObj = fullPatientList.find((p) => p.id === patientId);

    updated.set(patientId, {
      ...existing,
      isKS: !existing.isKS,
      previousTime: patientObj?.previousTime,
    });
    onUpdateFlags(updated);
  };

  const handleTogglePKD = (patientId: string) => {
    const updated = new Map(clinicalFlags);
    const existing = updated.get(patientId) || { isKS: false, isPKD: false };
    const patientObj = fullPatientList.find((p) => p.id === patientId);

    updated.set(patientId, {
      ...existing,
      isPKD: !existing.isPKD,
      previousTime: patientObj?.previousTime,
    });
    onUpdateFlags(updated);
  };

  const handleClearAllFlags = () => {
    onUpdateFlags(new Map());
  };

  // Danh sách sau khi lọc
  const filteredPatients = fullPatientList.filter((p) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchRoom = p.normalizedRoom.toLowerCase().includes(q);
      if (!matchName && !matchRoom) return false;
    }
    if (doctorFilter !== 'all' && p.doctorId !== doctorFilter) {
      return false;
    }
    if (roomFilter !== 'all' && p.normalizedRoom !== roomFilter) {
      return false;
    }
    return true;
  });

  return (
    <div id="step-3-container" className="space-y-6">
      {/* Top Banner: Core Principles Notice & Previous Day Matching */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Đối Chiếu Bảo Lưu Giờ Ngày Trước & Xác Nhận Chỉ Định KS/PKD
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Khóa nhận diện bất di bất dịch:{' '}
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                [HỌ VÀ TÊN + PHÒNG]
              </span>
              . Tuyệt đối không tự suy diễn chỉ định KS/PKD. Bệnh nhân không tích chọn sẽ tự động xếp vào nhóm &ldquo;CÒN LẠI&rdquo;.
            </p>
          </div>

          {/* Reference History Day Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 shrink-0">
              Đối chiếu với ngày:
            </span>
            {savedHistory.length > 0 ? (
              <select
                value={selectedHistoryDayId}
                onChange={(e) => setSelectedHistoryDayId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {savedHistory.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.displayDate} ({day.dayOfWeek}) - {day.totalPatients} BN
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400 italic">Chưa có lịch lưu trước</span>
            )}
          </div>
        </div>

        {/* Indicator Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Tổng Bệnh Nhân</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </div>

          <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
            <div className="text-[11px] font-bold text-sky-800 uppercase flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-sky-600" />
              Trùng Khớp Ngày Trước
            </div>
            <div className="text-xl font-bold text-sky-700 mt-0.5">
              {stats.matchedPrevCount}{' '}
              <span className="text-xs font-normal text-sky-600">bệnh nhân</span>
            </div>
          </div>

          <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
            <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-rose-600" />
              Kháng Sinh (KS)
            </div>
            <div className="text-xl font-bold text-rose-700 mt-0.5">
              {stats.ksCount}{' '}
              <span className="text-xs font-normal text-rose-600">bệnh nhân</span>
            </div>
          </div>

          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <div className="text-[11px] font-bold text-teal-800 uppercase flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              Khí Dung (PKD)
            </div>
            <div className="text-xl font-bold text-teal-700 mt-0.5">
              {stats.pkdCount}{' '}
              <span className="text-xs font-normal text-teal-600">bệnh nhân</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Time Config & Scheduling Action Bar */}
      <div className="bg-indigo-900 text-white rounded-xl shadow-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-800 border border-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Cấu hình thông số lập lịch
            </div>
            <div className="flex items-center gap-3 mt-1">
              <label className="text-xs text-indigo-200">Giờ bắt đầu ca khám:</label>
              <input
                id="input-start-time"
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="bg-indigo-950 border border-indigo-700 text-white font-mono font-bold text-sm rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span className="text-xs text-teal-300 bg-indigo-800/80 px-2 py-0.5 rounded font-mono">
                Chu kỳ: đúng 5 phút/lượt
              </span>
            </div>
          </div>
        </div>

        <button
          id="btn-run-scheduler"
          onClick={onRunScheduler}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Settings className="w-5 h-5" />
          ⚙ SẮP XẾP LỊCH KHÁM (5 PHÚT)
        </button>
      </div>

      {/* Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls / Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm họ tên hoặc phòng..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              />
            </div>

            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả Bác sĩ</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none font-mono"
            >
              <option value="all">Tất cả Phòng</option>
              {Array.from(new Set(patients.map((p) => p.normalizedRoom))).map((room) => (
                <option key={room} value={room}>
                  Phòng {room}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllFlags}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-24 bg-rose-50 text-rose-900 border-r border-rose-200">
                  <span className="flex items-center justify-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-rose-600" />
                    Chọn KS
                  </span>
                </th>
                <th className="py-3 px-3 text-center w-24 bg-teal-50 text-teal-900 border-r border-teal-200">
                  <span className="flex items-center justify-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-teal-600" />
                    Chọn PKD
                  </span>
                </th>
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-3 text-center">Phòng</th>
                <th className="py-3 px-3">Bác Sĩ Phụ Trách</th>
                <th className="py-3 px-4">Giờ Ngày Trước (Đối Chiếu)</th>
                <th className="py-3 px-3 text-center">Phân Nhóm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPatients.map((p) => {
                const prev = previousDayIndex.get(
                  generatePatientCompositeKey(p.name, p.normalizedRoom)
                );

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      p.isKS
                        ? 'bg-rose-50/40'
                        : p.isPKD
                        ? 'bg-teal-50/40'
                        : ''
                    }`}
                  >
                    {/* Checkbox KS */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-rose-50/20">
                      <button
                        type="button"
                        onClick={() => handleToggleKS(p.id)}
                        className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                          p.isKS
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200'
                            : 'border-2 border-slate-300 hover:border-rose-400 bg-white'
                        }`}
                        title="Tích chọn Kháng sinh (KS)"
                      >
                        {p.isKS ? <CheckSquare className="w-4 h-4" /> : null}
                      </button>
                    </td>

                    {/* Checkbox PKD */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-teal-50/20">
                      <button
                        type="button"
                        onClick={() => handleTogglePKD(p.id)}
                        className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                          p.isPKD
                            ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-200'
                            : 'border-2 border-slate-300 hover:border-teal-400 bg-white'
                        }`}
                        title="Tích chọn Phun khí dung (PKD)"
                      >
                        {p.isPKD ? <CheckSquare className="w-4 h-4" /> : null}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-medium">
                      {p.stt}
                    </td>

                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.sg && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">
                            {p.sg}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded text-xs">
                        {p.normalizedRoom}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {p.doctorName}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      {p.previousTime ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {p.previousTime}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            (Khớp [Tên + Phòng])
                          </span>
                          {prev && (prev.wasKS || prev.wasPKD) && (
                            <span className="text-[10px] text-slate-400">
                              [Hôm qua: {prev.wasKS ? 'KS' : ''} {prev.wasPKD ? 'PKD' : ''}]
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Chưa có giờ ngày trước (Lên lịch mới)
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {p.isKS ? (
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                          KS (Ưu tiên 1)
                        </span>
                      ) : p.isPKD ? (
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-300">
                          PKD (Ưu tiên 2)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-600">
                          CÒN LẠI (Khám thường)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <span>
            Hiển thị {filteredPatients.length} / {patients.length} bệnh nhân.
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> KS: {stats.ksCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> PKD: {stats.pkdCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Còn lại:{' '}
              {stats.total - stats.ksCount - stats.pkdCount}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrevStep}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 2: Phân công Bác sĩ
        </button>

        <button
          onClick={onRunScheduler}
          className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          ⚙ SẮP XẾP LỊCH KHÁM NGAY
        </button>
      </div>
    </div>
  );
};
