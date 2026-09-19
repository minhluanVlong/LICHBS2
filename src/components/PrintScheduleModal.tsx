import React, { useState } from 'react';
import { ScheduledPatient, Doctor } from '../types';
import { Printer, FileText, X, Check, Eye } from 'lucide-react';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: ScheduledPatient[];
  doctors: Doctor[];
  dateStr: string;
  dayOfWeek: string;
  startTime: string;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  dateStr,
  dayOfWeek,
  startTime,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const filteredPatients =
    selectedDoctorId === 'all'
      ? patients
      : patients.filter((p) => p.doctorId === selectedDoctorId);

  return (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold">Xem Trước Bản In & Xuất PDF Lịch Khám</h3>
              <p className="text-xs text-slate-400">
                Lịch khám nội viện chuẩn hóa theo chu kỳ 5 phút, giữ nguyên cột SG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">In tất cả Bác sĩ ({patients.length} ca)</option>
              {doctors.map((d) => {
                const count = patients.filter((p) => p.doctorId === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    In riêng: {d.name} ({count} ca)
                  </option>
                );
              })}
            </select>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              In Ngay / Lưu PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:m-0">
          {/* Official Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start text-xs">
              <div>
                <div className="font-bold uppercase tracking-wider text-slate-700">
                  BỆNH VIỆN / KHOA ĐIỀU TRỊ NỘI TRÚ
                </div>
                <div className="text-slate-500 mt-0.5">
                  HỆ THỐNG ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI VIỆN THÔNG MINH
                </div>
              </div>
              <div className="text-right font-mono text-slate-600">
                <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                <div className="text-[11px] text-slate-400">Chu kỳ khám: 5 phút/lượt</div>
              </div>
            </div>

            <div className="text-center mt-5">
              <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                BẢNG ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI VIỆN
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Ngày khám: <strong className="text-slate-900">{dateStr}</strong> ({dayOfWeek}) — Giờ bắt đầu: <strong className="text-slate-900">{startTime}</strong>
              </p>
              {selectedDoctorId !== 'all' && (
                <p className="text-xs font-bold text-indigo-700 mt-1">
                  BÁC SĨ PHỤ TRÁCH: {doctors.find((d) => d.id === selectedDoctorId)?.name}
                </p>
              )}
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-400">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-400">
                <th className="py-2 px-2 border border-slate-300 text-center w-10">STT</th>
                <th className="py-2.5 px-3 border border-slate-400 text-center w-28 bg-slate-200 text-slate-950 font-black uppercase text-xs tracking-wider">
                  GIỜ Y LỆNH
                </th>
                <th className="py-2 px-3 border border-slate-300">Bác sĩ</th>
                <th className="py-2 px-4 border border-slate-300">Họ và tên</th>
                <th className="py-2 px-2 border border-slate-300 text-center w-12">SG</th>
                <th className="py-2 px-2 border border-slate-300 text-center w-14">Phòng</th>
                <th className="py-2 px-2 border border-slate-300 text-center w-14">KS</th>
                <th className="py-2 px-2 border border-slate-300 text-center w-14">PKD</th>
                <th className="py-2 px-3 border border-slate-300 text-center w-20">Giờ trước</th>
                <th className="py-2 px-3 border border-slate-300 text-center w-36">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-300 ${
                    idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">
                    {idx + 1}
                  </td>
                  {/* Cột GIỜ Y LỆNH: Cỡ chữ to, in đậm (font-black), nổi bật rõ ràng khi in/xuất PDF */}
                  <td className="py-2 px-2.5 border border-slate-400 text-center bg-slate-50/70">
                    <span className="print-slot-time font-mono font-black text-base sm:text-lg text-slate-950 inline-block tracking-wider">
                      {p.slotTime}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 border border-slate-300 font-medium">
                    {p.assignedDoctorName}
                  </td>
                  <td className="py-1.5 px-4 border border-slate-300 font-bold">
                    {p.name}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">
                    {p.sg || '-'}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-bold">
                    {p.normalizedRoom}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {p.isKS ? 'KS' : '-'}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {p.isPKD ? 'PKD' : '-'}
                  </td>
                  <td className="py-1.5 px-3 border border-slate-300 text-center font-mono">
                    {p.previousTime || '-'}
                  </td>
                  {/* Cột Ghi chú: để trống cho việc ghi chú tay lâm sàng */}
                  <td className="py-1.5 px-3 border border-slate-300 text-[11px] text-slate-700">
                    {p.note || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="mt-8 pt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-700 break-inside-avoid">
            <div>
              <div className="font-bold">ĐIỀU PHỐI VIÊN</div>
              <div className="text-[11px] text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
            </div>
            <div>
              <div className="font-bold">BÁC SĨ PHỤ TRÁCH</div>
              <div className="text-[11px] text-slate-400 mt-0.5">(Ký và xác nhận)</div>
              <div className="h-16"></div>
            </div>
            <div>
              <div className="font-bold">LÃNH ĐẠO KHOA NỘI TRÚ</div>
              <div className="text-[11px] text-slate-400 mt-0.5">(Ký duyệt)</div>
              <div className="h-16"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
