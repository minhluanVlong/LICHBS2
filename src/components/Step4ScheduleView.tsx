import React, { useState, useMemo } from 'react';
import { ScheduledPatient, Doctor, SavedScheduleDay } from '../types';
import { exportScheduleToExcel } from '../utils/excelParser';
import {
  Save,
  BookOpen,
  FileSpreadsheet,
  Printer,
  FileText,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Pill,
  Wind,
  AlertTriangle,
  Users,
  LayoutGrid,
  Table as TableIcon,
  ArrowLeft,
} from 'lucide-react';

interface Step4ScheduleViewProps {
  scheduledPatients: ScheduledPatient[];
  doctors: Doctor[];
  selectedDate: string;
  displayDate: string;
  dayOfWeek: string;
  startTime: string;
  onSaveCurrentSchedule: () => void;
  onOpenSavedModal: () => void;
  onOpenPrintModal: () => void;
  onPrevStep: () => void;
  isSavedToday: boolean;
}

export const Step4ScheduleView: React.FC<Step4ScheduleViewProps> = ({
  scheduledPatients,
  doctors,
  selectedDate,
  displayDate,
  dayOfWeek,
  startTime,
  onSaveCurrentSchedule,
  onOpenSavedModal,
  onOpenPrintModal,
  onPrevStep,
  isSavedToday,
}) => {
  // Bộ lọc
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'KS' | 'PKD' | 'CON_LAI'>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Thống kê
  const stats = useMemo(() => {
    let ksCount = 0;
    let pkdCount = 0;
    let conLaiCount = 0;
    let conflictCount = 0;
    let preservedCount = 0;

    scheduledPatients.forEach((p) => {
      if (p.isKS) ksCount++;
      else if (p.isPKD) pkdCount++;
      else conLaiCount++;

      if (p.hasConflict) conflictCount++;
      if (p.previousTime && !p.hasConflict) preservedCount++;
    });

    return {
      total: scheduledPatients.length,
      ksCount,
      pkdCount,
      conLaiCount,
      conflictCount,
      preservedCount,
    };
  }, [scheduledPatients]);

  // Lọc danh sách theo các tiêu chí yêu cầu
  const filteredPatients = useMemo(() => {
    return scheduledPatients.filter((p) => {
      if (priorityFilter !== 'all' && p.priorityGroup !== priorityFilter) {
        return false;
      }
      if (doctorFilter !== 'all' && p.doctorId !== doctorFilter) {
        return false;
      }
      if (roomFilter !== 'all' && p.normalizedRoom !== roomFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchRoom = p.normalizedRoom.toLowerCase().includes(q);
        const matchDoc = p.assignedDoctorName.toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchDoc) return false;
      }
      return true;
    });
  }, [scheduledPatients, priorityFilter, doctorFilter, roomFilter, searchTerm]);

  // Nhóm bệnh nhân theo từng bác sĩ cho giao diện thẻ song song
  const patientsByDoctor = useMemo(() => {
    const map = new Map<string, ScheduledPatient[]>();
    doctors.forEach((d) => map.set(d.id, []));
    scheduledPatients.forEach((p) => {
      const list = map.get(p.doctorId) || [];
      list.push(p);
      map.set(p.doctorId, list);
    });
    return map;
  }, [doctors, scheduledPatients]);

  const handleExportExcel = () => {
    exportScheduleToExcel(scheduledPatients, `${selectedDate}_${startTime.replace(':', 'h')}`);
  };

  return (
    <div id="step-4-container" className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-400">
                LỊCH KHÁM CHU KỲ 5 PHÚT ĐÃ HOÀN TẤT
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Bảng Điều Phối Khám Bệnh Nội Viện — {displayDate} ({dayOfWeek})
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Khám song song độc lập giữa các Bác sĩ. Giờ bắt đầu: <strong className="text-white">{startTime}</strong>. Bước nhảy: đúng 5 phút/lượt.
            </p>
          </div>

          {/* Action Buttons as specified in prompt */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-save-schedule"
              onClick={onSaveCurrentSchedule}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                isSavedToday
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSavedToday ? '✓ ĐÃ LƯU LỊCH NGÀY NÀY' : '[💾 LƯU LỊCH NGÀY NÀY]'}
            </button>

            <button
              id="btn-open-saved"
              onClick={onOpenSavedModal}
              className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              [📚 LỊCH ĐÃ LƯU]
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="px-4 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              [📊 XUẤT EXCEL]
            </button>

            <button
              id="btn-print-schedule"
              onClick={onOpenPrintModal}
              className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              [🖨 IN LỊCH]
            </button>

            <button
              id="btn-export-pdf"
              onClick={onOpenPrintModal}
              className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              [📄 XUẤT PDF]
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <div className="text-slate-400 uppercase text-[10px] font-bold">Tổng số ca khám</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.total}</div>
          </div>

          <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-800/60">
            <div className="text-rose-300 uppercase text-[10px] font-bold flex items-center gap-1">
              <Pill className="w-3 h-3" />
              Kháng sinh (KS)
            </div>
            <div className="text-xl font-bold text-rose-300 mt-0.5">{stats.ksCount}</div>
          </div>

          <div className="bg-teal-950/40 p-3 rounded-xl border border-teal-800/60">
            <div className="text-teal-300 uppercase text-[10px] font-bold flex items-center gap-1">
              <Wind className="w-3 h-3" />
              Khí dung (PKD)
            </div>
            <div className="text-xl font-bold text-teal-300 mt-0.5">{stats.pkdCount}</div>
          </div>

          <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/60">
            <div className="text-indigo-300 uppercase text-[10px] font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Bảo lưu giờ trước
            </div>
            <div className="text-xl font-bold text-indigo-300 mt-0.5">{stats.preservedCount}</div>
          </div>

          <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800/60">
            <div className="text-amber-300 uppercase text-[10px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Điều chỉnh xung đột
            </div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{stats.conflictCount}</div>
          </div>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filters Required by User Prompt: Tất cả / KS / PKD / Còn lại */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Lọc theo nhóm:
            </span>
            <button
              onClick={() => setPriorityFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                priorityFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất Cả ({stats.total})
            </button>
            <button
              onClick={() => setPriorityFilter('KS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                priorityFilter === 'KS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Pill className="w-3 h-3" />
              KS ({stats.ksCount})
            </button>
            <button
              onClick={() => setPriorityFilter('PKD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                priorityFilter === 'PKD'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              <Wind className="w-3 h-3" />
              PKD ({stats.pkdCount})
            </button>
            <button
              onClick={() => setPriorityFilter('CON_LAI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                priorityFilter === 'CON_LAI'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Còn Lại ({stats.conLaiCount})
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 border border-slate-200 p-1 rounded-lg bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Bảng Tổng Thể
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Song Song Theo Bác Sĩ
            </button>
          </div>
        </div>

        {/* Secondary Filters: Theo từng Bác sĩ / Theo từng Phòng / Tìm kiếm */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên, phòng, bác sĩ..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Bác sĩ:</span>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả Bác sĩ ({doctors.length})</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Phòng:</span>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-mono"
            >
              <option value="all">Tất cả Phòng</option>
              {Array.from(new Set(scheduledPatients.map((p) => p.normalizedRoom))).map((r) => (
                <option key={r} value={r}>
                  Phòng {r}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || doctorFilter !== 'all' || roomFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDoctorFilter('all');
                setRoomFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 1. BẢNG KẾT QUẢ TỔNG THỂ (Format mandated by prompt) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3.5 px-3 text-center w-28 bg-slate-200/90 font-black text-slate-950 text-xs tracking-wider uppercase">
                    Giờ Y Lệnh
                  </th>
                  <th className="py-3 px-3">Bác Sĩ</th>
                  <th className="py-3 px-4">Họ Tên</th>
                  <th className="py-3 px-2 text-center w-12 font-mono">SG</th>
                  <th className="py-3 px-2 text-center w-16">Phòng</th>
                  <th className="py-3 px-2 text-center w-14">KS</th>
                  <th className="py-3 px-2 text-center w-14">PKD</th>
                  <th className="py-3 px-3 text-center w-24">Giờ Ngày Trước</th>
                  <th className="py-3 px-4 text-center w-36">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Không tìm thấy bệnh nhân nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p, idx) => {
                    const isConflict = p.hasConflict;
                    const isPreserved = p.previousTime && !isConflict;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-indigo-50/40 transition-colors ${
                          isConflict ? 'bg-amber-50/50' : idx % 2 === 1 ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Giờ Y Lệnh: Tô đậm (font-black), cỡ chữ to (text-base), rõ nét dễ nhìn */}
                        <td className="py-2.5 px-3 text-center bg-slate-100/70">
                          <span className="font-mono font-black text-base text-slate-950 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-xs inline-flex items-center justify-center gap-1.5 min-w-[70px] tracking-wider">
                            {p.slotTime}
                            {isConflict && (
                              <span
                                title="Đã điều chỉnh do trùng mốc giờ ngày trước"
                                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                              ></span>
                            )}
                          </span>
                        </td>

                        {/* Bác sĩ */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            {p.assignedDoctorName}
                          </span>
                        </td>

                        {/* Họ tên */}
                        <td className="py-2.5 px-4 font-bold text-slate-950">
                          {p.name}
                        </td>

                        {/* Cột SG (cột phụ, giữ nguyên giá trị) */}
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                          {p.sg || '-'}
                        </td>

                        {/* Phòng */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs">
                            {p.normalizedRoom}
                          </span>
                        </td>

                        {/* KS */}
                        <td className="py-2.5 px-2 text-center">
                          {p.isKS ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                              KS
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* PKD */}
                        <td className="py-2.5 px-2 text-center">
                          {p.isPKD ? (
                            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-200">
                              PKD
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Giờ ngày trước */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {p.previousTime ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">
                              {p.previousTime}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Cột Ghi Chú - Để trống hoàn toàn theo yêu cầu người dùng */}
                        <td className="py-2.5 px-4 text-center text-xs text-slate-400">
                          {p.note || ''}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              Hiển thị {filteredPatients.length} / {scheduledPatients.length} lượt khám theo thứ tự mốc giờ.
            </span>
            <span>
              Độ dài mỗi lượt: đúng 5 phút. Các bác sĩ khám song song độc lập.
            </span>
          </div>
        </div>
      ) : (
        /* Parallel Doctor Columns View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => {
            const list = patientsByDoctor.get(doc.id) || [];
            const firstTime = list.length > 0 ? list[0].slotTime : '--:--';
            const lastTime = list.length > 0 ? list[list.length - 1].slotTime : '--:--';

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Doctor Column Header */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">{doc.name}</h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Phòng: {doc.assignedRooms.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-400 text-slate-950 font-mono">
                      {list.length} ca
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {firstTime} - {lastTime}
                    </div>
                  </div>
                </div>

                {/* Slots List */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] flex-1">
                  {list.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      Bác sĩ không có bệnh nhân trong ca này
                    </div>
                  ) : (
                    list.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 ${
                          p.hasConflict ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-sm bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-slate-900 w-16 text-center shadow-xs tracking-wider">
                            {p.slotTime}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.sg && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({p.sg})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="font-mono font-semibold">P.{p.normalizedRoom}</span>
                              {p.previousTime && (
                                <>
                                  <span>•</span>
                                  <span className="text-[10px] text-slate-400">Giờ trước: {p.previousTime}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {p.isKS && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                              KS
                            </span>
                          )}
                          {p.isPKD && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                              PKD
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrevStep}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 3: Chỉ định KS/PKD
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Tải File Excel Lịch Khám
          </button>
          <button
            onClick={onOpenPrintModal}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            In Lịch Khám
          </button>
        </div>
      </div>
    </div>
  );
};
