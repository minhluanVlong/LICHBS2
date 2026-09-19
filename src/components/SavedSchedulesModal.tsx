import React, { useState } from 'react';
import { SavedScheduleDay } from '../types';
import { exportScheduleToExcel } from '../utils/excelParser';
import {
  Calendar,
  Clock,
  Users,
  Download,
  Trash2,
  X,
  CheckCircle,
  FileSpreadsheet,
  Building2,
  AlertTriangle,
  Eye,
} from 'lucide-react';

interface SavedSchedulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSchedules: SavedScheduleDay[];
  onDeleteSchedule: (id: string) => void;
  onSelectAsReference?: (schedule: SavedScheduleDay) => void;
  onLoadScheduleForView?: (schedule: SavedScheduleDay) => void;
}

export const SavedSchedulesModal: React.FC<SavedSchedulesModalProps> = ({
  isOpen,
  onClose,
  savedSchedules,
  onDeleteSchedule,
  onSelectAsReference,
  onLoadScheduleForView,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      id="saved-schedules-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">📚 Cơ Sở Dữ Liệu Lịch Đã Lưu ({savedSchedules.length})</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các bản ghi lịch khám đã lưu trữ để làm căn cứ đối chiếu bảo lưu giờ cho các ngày tiếp theo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-4">
          {savedSchedules.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có lịch khám nào được lưu</p>
              <p className="text-xs text-slate-400 mt-1">
                Sau khi lập lịch ở Bước 4, hãy nhấn nút <strong>[💾 LƯU LỊCH NGÀY NÀY]</strong> để ghi nhớ vào hệ thống.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSchedules.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    deletingId === item.id ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {item.displayDate}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.dayOfWeek}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        (Bắt đầu: {item.startTime})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{item.totalPatients}</strong> bệnh nhân
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-700 font-medium">
                        KS: {item.totalKS}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-teal-700 font-medium">
                        PKD: {item.totalPKD}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{item.doctors.length} Bác sĩ</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-1 items-center">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      Phòng khám:{' '}
                      {item.doctors
                        .map((d) => `${d.name} [${d.assignedRooms.join(',')}]`)
                        .join(' | ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {deletingId === item.id ? (
                      /* Hộp xác nhận xóa ngay trên giao diện (không dùng confirm dialog bị chặn) */
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in duration-200">
                        <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Xác nhận xóa ngày {item.displayDate}?
                        </span>
                        <button
                          id={`btn-confirm-delete-${item.id}`}
                          onClick={() => {
                            onDeleteSchedule(item.id);
                            setDeletingId(null);
                          }}
                          className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Xóa
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        {onLoadScheduleForView && (
                          <button
                            onClick={() => onLoadScheduleForView(item)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Xem chi tiết, xuất viện & tiếp nhận bệnh nhân mới cho ngày này"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            Xem & Biến Động
                          </button>
                        )}

                        <button
                          onClick={() =>
                            exportScheduleToExcel(item.patients, item.displayDate.replace(/\//g, '_'))
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Xuất file Excel lịch của ngày này"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          Excel
                        </button>

                        <button
                          id={`btn-delete-schedule-${item.id}`}
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                          title="Nhấn để xóa bản ghi lịch ngày này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
