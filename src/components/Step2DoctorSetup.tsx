import React, { useState, useMemo, useEffect } from 'react';
import { Doctor, RawPatientRow, VALID_ROOMS } from '../types';
import {
  UserCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Users,
  Building2,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';

interface Step2DoctorSetupProps {
  patients: RawPatientRow[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  doctors: Doctor[];
  onUpdateDoctors: (doctors: Doctor[]) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const Step2DoctorSetup: React.FC<Step2DoctorSetupProps> = ({
  patients,
  selectedDate,
  onDateChange,
  doctors,
  onUpdateDoctors,
  onNextStep,
  onPrevStep,
}) => {
  // Xác định ngày trong tuần từ selectedDate (YYYY-MM-DD)
  const dayOfWeekInfo = useMemo(() => {
    if (!selectedDate) return { dayName: 'Thứ Bảy', isWeekend: true };
    const d = new Date(selectedDate + 'T00:00:00');
    const day = d.getDay(); // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy
    const dayNames = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const isWeekend = day === 0 || day === 6;
    return {
      dayName: dayNames[day],
      isWeekend,
    };
  }, [selectedDate]);

  // Quy tắc số lượng bác sĩ:
  // - Thứ Hai đến Thứ Sáu: 2 đến 4 bác sĩ.
  // - Thứ Bảy và Chủ Nhật: Cố định 2 bác sĩ.
  useEffect(() => {
    if (dayOfWeekInfo.isWeekend) {
      if (doctors.length !== 2) {
        if (doctors.length < 2) {
          onUpdateDoctors([
            ...doctors,
            { id: 'bs-2', name: 'BS 2: Bác sĩ Ca Trực B', assignedRooms: [] },
          ]);
        } else if (doctors.length > 2) {
          onUpdateDoctors(doctors.slice(0, 2));
        }
      }
    }
  }, [dayOfWeekInfo.isWeekend]);

  // Thống kê số lượng bệnh nhân thực tế theo từng mã phòng
  const patientCountByRoom = useMemo(() => {
    const map = new Map<string, number>();
    VALID_ROOMS.forEach((r) => map.set(r, 0));
    patients.forEach((p) => {
      if (p.isValidRoom && p.normalizedRoom) {
        const count = map.get(p.normalizedRoom) || 0;
        map.set(p.normalizedRoom, count + 1);
      }
    });
    return map;
  }, [patients]);

  // Danh sách các phòng thực tế đang có bệnh nhân
  const activeRoomsWithPatients = useMemo(() => {
    const active = new Set<string>();
    patients.forEach((p) => {
      if (p.isValidRoom && p.normalizedRoom) {
        active.add(p.normalizedRoom);
      }
    });
    return Array.from(active);
  }, [patients]);

  // Kiểm tra ràng buộc phân công
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // 1. Kiểm tra 1 phòng phân công cho 2 bác sĩ trở lên
    const roomAssignmentMap = new Map<string, string[]>();
    doctors.forEach((doc) => {
      doc.assignedRooms.forEach((room) => {
        const list = roomAssignmentMap.get(room) || [];
        list.push(doc.name || `Bác sĩ ID ${doc.id}`);
        roomAssignmentMap.set(room, list);
      });
    });

    const duplicateAssignedRooms: string[] = [];
    roomAssignmentMap.forEach((doctorList, room) => {
      if (doctorList.length > 1) {
        duplicateAssignedRooms.push(`Phòng ${room} đang được giao cho: ${doctorList.join(', ')}`);
      }
    });

    if (duplicateAssignedRooms.length > 0) {
      errors.push(
        `Phát hiện phòng bị phân công trùng lặp: ${duplicateAssignedRooms.join('; ')}`
      );
    }

    // 2. Kiểm tra phòng đang có bệnh nhân thực tế nhưng chưa được giao cho bác sĩ nào
    const allAssignedRooms = new Set<string>();
    doctors.forEach((doc) => {
      doc.assignedRooms.forEach((r) => allAssignedRooms.add(r));
    });

    const unassignedActiveRooms: string[] = [];
    activeRoomsWithPatients.forEach((room) => {
      if (!allAssignedRooms.has(room)) {
        const count = patientCountByRoom.get(room) || 0;
        unassignedActiveRooms.push(`Phòng ${room} (${count} bệnh nhân)`);
      }
    });

    if (unassignedActiveRooms.length > 0) {
      errors.push(
        `Phát hiện phòng có bệnh nhân thực tế nhưng CHƯA ĐƯỢC GIAO CHO BÁC SĨ NÀO: ${unassignedActiveRooms.join(
          ', '
        )}`
      );
    }

    // 3. Kiểm tra số lượng bác sĩ
    if (dayOfWeekInfo.isWeekend && doctors.length !== 2) {
      errors.push(
        `Cuối tuần (${dayOfWeekInfo.dayName}) quy định cố định 2 bác sĩ. Hiện có: ${doctors.length} bác sĩ.`
      );
    } else if (!dayOfWeekInfo.isWeekend && (doctors.length < 2 || doctors.length > 4)) {
      errors.push(
        `Từ Thứ Hai đến Thứ Sáu quy định từ 2 đến 4 bác sĩ. Hiện có: ${doctors.length} bác sĩ.`
      );
    }

    // 4. Tên bác sĩ không được để trống
    const emptyNameDoc = doctors.find((d) => !d.name.trim());
    if (emptyNameDoc) {
      errors.push('Tên bác sĩ không được để trống.');
    }

    return errors;
  }, [doctors, activeRoomsWithPatients, patientCountByRoom, dayOfWeekInfo]);

  const isValidAssignment = validationErrors.length === 0;

  // Thao tác chỉnh sửa bác sĩ
  const handleUpdateDoctorName = (id: string, name: string) => {
    const updated = doctors.map((d) => (d.id === id ? { ...d, name } : d));
    onUpdateDoctors(updated);
  };

  const handleToggleRoom = (doctorId: string, room: string) => {
    const updated = doctors.map((d) => {
      if (d.id === doctorId) {
        const has = d.assignedRooms.includes(room);
        const newRooms = has
          ? d.assignedRooms.filter((r) => r !== room)
          : [...d.assignedRooms, room];
        return { ...d, assignedRooms: newRooms };
      }
      return d;
    });
    onUpdateDoctors(updated);
  };

  const handleAddDoctor = () => {
    if (dayOfWeekInfo.isWeekend) return;
    if (doctors.length >= 4) return;
    const newIdx = doctors.length + 1;
    onUpdateDoctors([
      ...doctors,
      {
        id: `bs-${Date.now()}`,
        name: `BS ${newIdx}: Bác sĩ Phụ trách ${newIdx}`,
        assignedRooms: [],
      },
    ]);
  };

  const handleRemoveDoctor = (id: string) => {
    if (doctors.length <= 2) return;
    onUpdateDoctors(doctors.filter((d) => d.id !== id));
  };

  // Nút phân bổ nhanh các phòng có bệnh nhân chia đều cho các bác sĩ
  const handleAutoDistributeActiveRooms = () => {
    if (doctors.length === 0) return;
    const docCount = doctors.length;
    const updatedDoctors = doctors.map((d) => ({ ...d, assignedRooms: [] as string[] }));

    // Phân bổ tất cả 12 phòng tuần tự
    VALID_ROOMS.forEach((room, idx) => {
      const targetDocIdx = idx % docCount;
      updatedDoctors[targetDocIdx].assignedRooms.push(room);
    });

    onUpdateDoctors(updatedDoctors);
  };

  return (
    <div id="step-2-container" className="space-y-6">
      {/* Date and Rule Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ngày Khám Lập Lịch
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    dayOfWeekInfo.isWeekend
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {dayOfWeekInfo.dayName} {dayOfWeekInfo.isWeekend ? '(Cuối tuần: 2 Bác sĩ)' : '(Ngày thường: 2-4 Bác sĩ)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoDistributeActiveRooms}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
              title="Chia đều 12 phòng cho các bác sĩ hiện tại"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              Gợi Ý Chia Đều 12 Phòng
            </button>

            {!dayOfWeekInfo.isWeekend && doctors.length < 4 && (
              <button
                id="btn-add-doctor"
                onClick={handleAddDoctor}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Bác Sĩ ({doctors.length}/4)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Constraints Warning / Success Banner */}
      <div id="doctor-assignment-validation">
        {!isValidAssignment ? (
          <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              Ràng buộc phân công chưa thỏa mãn – Chưa thể chuyển sang Bước 3:
            </div>
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-1 pl-1">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="font-medium">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  ✓ Phân công phòng hợp lệ 100%
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Tất cả các phòng có bệnh nhân đều đã được phân bổ cho duy nhất 1 bác sĩ phụ trách.
                </p>
              </div>
            </div>
            <button
              id="btn-next-step-2"
              onClick={onNextStep}
              className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              Tiếp Tục Sang Bước 3: Xác Nhận KS & PKD →
            </button>
          </div>
        )}
      </div>

      {/* Doctor Cards and Room Allocation Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {doctors.map((doc, docIdx) => {
          // Tính tổng số bệnh nhân phụ trách
          const doctorPatientCount = doc.assignedRooms.reduce((acc, room) => {
            return acc + (patientCountByRoom.get(room) || 0);
          }, 0);

          return (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-indigo-200 transition-colors"
            >
              {/* Doctor Header & Name Input */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Bác Sĩ {docIdx + 1}
                  </label>
                  <input
                    type="text"
                    value={doc.name}
                    onChange={(e) => handleUpdateDoctorName(doc.id, e.target.value)}
                    placeholder="Nhập tên Bác sĩ..."
                    className="w-full text-sm font-bold text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {doctors.length > 2 && !dayOfWeekInfo.isWeekend && (
                  <button
                    onClick={() => handleRemoveDoctor(doc.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-4"
                    title="Xóa bác sĩ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Assigned Rooms Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Phòng phụ trách ({doc.assignedRooms.length} phòng)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                    {doctorPatientCount} bệnh nhân
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {VALID_ROOMS.map((room) => {
                    const isSelected = doc.assignedRooms.includes(room);
                    const patientCount = patientCountByRoom.get(room) || 0;
                    // Kiểm tra xem phòng này có đang được chọn bởi bác sĩ khác không
                    const isTakenByOther = doctors.some(
                      (other) => other.id !== doc.id && other.assignedRooms.includes(room)
                    );

                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => handleToggleRoom(doc.id, room)}
                        className={`p-2 rounded-lg text-xs font-mono font-bold text-center border transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-200'
                            : isTakenByOther
                            ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-pointer'
                            : patientCount > 0
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:border-indigo-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                        title={
                          isTakenByOther
                            ? `Phòng ${room} đã được chọn bởi bác sĩ khác (chọn lại sẽ báo lỗi trùng lặp)`
                            : `Phòng ${room} (${patientCount} bệnh nhân)`
                        }
                      >
                        <span className="text-xs">{room}</span>
                        <span
                          className={`text-[10px] font-sans font-normal mt-0.5 ${
                            isSelected
                              ? 'text-indigo-100'
                              : patientCount > 0
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {patientCount} BN
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Room Summary Tags */}
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-slate-400">Danh sách phòng:</span>
                {doc.assignedRooms.length === 0 ? (
                  <span className="text-rose-500 italic text-[11px]">Chưa chọn phòng nào</span>
                ) : (
                  doc.assignedRooms.map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded font-semibold"
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrevStep}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 1
        </button>

        <button
          onClick={onNextStep}
          disabled={!isValidAssignment}
          className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          Tiếp Tục Sang Bước 3
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
