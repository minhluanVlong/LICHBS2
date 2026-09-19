import React, { useState } from 'react';
import { ScheduledPatient, Doctor } from '../types';
import { Printer, X, FileText, Check, LayoutGrid, Sliders } from 'lucide-react';

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
  // Chế độ 4 cột chuẩn theo yêu cầu người dùng: STT, TÊN BỆNH NHÂN, GIỜ Y LỆNH, GHI CHÚ
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(true);
  // Tùy chọn kích cỡ chữ để vừa vặn 1 trang A4
  const [densityMode, setDensityMode] = useState<'auto' | 'compact' | 'normal' | 'large'>('auto');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const filteredPatients =
    selectedDoctorId === 'all'
      ? patients
      : patients.filter((p) => p.doctorId === selectedDoctorId);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Tính toán độ co giãn dòng tự động để đảm bảo trọn vẹn trong 1 trang A4
  const effectiveDensity: 'compact' | 'normal' | 'large' =
    densityMode === 'auto'
      ? filteredPatients.length > 25
        ? 'compact'
        : filteredPatients.length > 14
        ? 'normal'
        : 'large'
      : densityMode;

  // Cấu hình kích thước chữ và padding tương ứng
  const densityStyles = {
    compact: {
      tableText: 'text-[11px]',
      cellPadding: 'py-1 px-2.5',
      slotText: 'text-sm font-black',
      headerMargin: 'pb-2 mb-2',
      signatureHeight: 'h-10',
      titleSize: 'text-base font-extrabold',
    },
    normal: {
      tableText: 'text-xs',
      cellPadding: 'py-1.5 px-3',
      slotText: 'text-base font-black',
      headerMargin: 'pb-3 mb-3',
      signatureHeight: 'h-12',
      titleSize: 'text-lg font-extrabold',
    },
    large: {
      tableText: 'text-sm',
      cellPadding: 'py-2.5 px-4',
      slotText: 'text-lg font-black',
      headerMargin: 'pb-4 mb-4',
      signatureHeight: 'h-14',
      titleSize: 'text-xl font-extrabold',
    },
  }[effectiveDensity];

  return (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none">
        
        {/* Modal Toolbar (Ẩn hoàn toàn khi in ra giấy/xuất PDF) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Xem Trước Bản In & Xuất PDF Lịch Khám</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
                  Chuẩn 1 Trang A4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hiển thị chuẩn 4 cột: STT, Tên Bệnh Nhân, Giờ Y Lệnh, Ghi Chú
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chọn Bác sĩ */}
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-400 cursor-pointer"
              title="Chọn bác sĩ để in lịch khám buồng riêng"
            >
              <option value="all">Toàn bộ Bác sĩ ({patients.length} ca)</option>
              {doctors.map((d) => {
                const count = patients.filter((p) => p.doctorId === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    In riêng: {d.name} ({count} ca)
                  </option>
                );
              })}
            </select>

            {/* Chọn Cỡ Chữ (Độ vừa vặn 1 trang) */}
            <select
              value={densityMode}
              onChange={(e) => setDensityMode(e.target.value as any)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-400 cursor-pointer"
              title="Kích cỡ chữ để vừa vặn 1 trang A4"
            >
              <option value="auto">
                Cỡ chữ: Tự động vừa 1 trang ({effectiveDensity === 'compact' ? 'Nhỏ gọn' : effectiveDensity === 'normal' ? 'Chuẩn' : 'To rõ'})
              </option>
              <option value="compact">Cỡ chữ: Nhỏ gọn (25-35 ca)</option>
              <option value="normal">Cỡ chữ: Vừa vặn (15-25 ca)</option>
              <option value="large">Cỡ chữ: To rõ (&lt;15 ca)</option>
            </select>

            {/* Chuyển đổi 4 cột / 10 cột */}
            <button
              onClick={() => setIsSimpleMode(!isSimpleMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSimpleMode
                  ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
              title="Bật/tắt chế độ 4 cột (STT, Tên, Giờ Y Lệnh, Ghi Chú)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {isSimpleMode ? '4 Cột Chuẩn A4' : 'Đầy Đủ 10 Cột'}
            </button>

            {/* Nút In */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In Ngay / Xuất PDF
            </button>

            {/* Đóng */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khung mô phỏng hiển thị trên Giấy A4 */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/90 text-slate-900 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          
          {/* Thông báo hướng dẫn trên màn hình */}
          <div className="max-w-[210mm] mx-auto mb-3 flex items-center justify-between text-xs text-slate-500 print:hidden">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Khổ giấy A4 (210 × 297 mm) — Tổng cộng: <strong>{filteredPatients.length}</strong> bệnh nhân
            </span>
            <span>
              Mẹo: Chọn <strong>In riêng từng Bác sĩ</strong> để mỗi bác sĩ có 1 tờ A4 riêng khi đi buồng
            </span>
          </div>

          {/* VÙNG IN TRANG A4 CHUẨN */}
          <div
            id="printable-a4-area"
            className="bg-white shadow-xl mx-auto w-full max-w-[210mm] min-h-[285mm] border border-slate-300 p-8 sm:p-10 flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:min-h-0"
          >
            <div>
              {/* Header Bệnh Viện & Khoa Điều Trị */}
              <div className={`border-b-2 border-slate-900 ${densityStyles.headerMargin}`}>
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <div className="font-extrabold uppercase tracking-wider text-slate-800">
                      BỆNH VIỆN / KHOA ĐIỀU TRỊ NỘI TRÚ
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      HỆ THỐNG ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI VIỆN
                    </div>
                  </div>
                  <div className="text-right font-mono text-slate-600 text-[11px]">
                    <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                    <div>Chu kỳ: 5 phút/lượt khám</div>
                  </div>
                </div>

                <div className="text-center mt-3 mb-1">
                  <h1 className={`${densityStyles.titleSize} uppercase tracking-tight text-slate-950 font-black`}>
                    BẢNG ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI VIỆN
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Ngày khám: <strong className="text-slate-900">{dateStr}</strong> ({dayOfWeek}) — Bắt đầu:{' '}
                    <strong className="text-slate-900">{startTime}</strong>
                  </p>
                  {selectedDoctor ? (
                    <div className="inline-block mt-1 px-3 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-xs font-bold text-indigo-900">
                      BÁC SĨ PHỤ TRÁCH: {selectedDoctor.name.toUpperCase()} (Phòng: {selectedDoctor.assignedRooms.join(', ')})
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      (Danh sách tổng hợp toàn bộ các bác sĩ trong phiên khám)
                    </p>
                  )}
                </div>
              </div>

              {/* BẢNG DANH SÁCH BỆNH NHÂN */}
              {isSimpleMode ? (
                /* CHẾ ĐỘ 4 CỘT CHUẨN A4: STT, TÊN BỆNH NHÂN, GIỜ Y LỆNH, GHI CHÚ */
                <table className={`w-full text-left ${densityStyles.tableText} border-collapse border-2 border-slate-900`}>
                  <thead>
                    <tr className="bg-slate-200 text-slate-950 font-black uppercase border-b-2 border-slate-900 text-center">
                      <th className={`${densityStyles.cellPadding} border border-slate-400 w-12`}>
                        STT
                      </th>
                      <th className={`${densityStyles.cellPadding} border border-slate-400 text-left`}>
                        TÊN BỆNH NHÂN
                      </th>
                      <th className={`${densityStyles.cellPadding} border border-slate-400 w-32 bg-slate-300 text-slate-950 tracking-wider`}>
                        GIỜ Y LỆNH
                      </th>
                      <th className={`${densityStyles.cellPadding} border border-slate-400 w-48 text-center`}>
                        GHI CHÚ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-400 ${
                          idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                        }`}
                      >
                        {/* STT */}
                        <td className={`${densityStyles.cellPadding} border border-slate-400 text-center font-mono font-bold text-slate-700`}>
                          {idx + 1}
                        </td>

                        {/* TÊN BỆNH NHÂN (Kèm phòng phụ trách nhỏ gọn để bác sĩ đi buồng) */}
                        <td className={`${densityStyles.cellPadding} border border-slate-400 font-bold text-slate-950`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-950">{p.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                                P.{p.normalizedRoom}
                              </span>
                              {p.isKS && (
                                <span className="font-black text-[9px] px-1 py-0.2 bg-rose-100 text-rose-800 rounded border border-rose-300">
                                  KS
                                </span>
                              )}
                              {p.isPKD && (
                                <span className="font-black text-[9px] px-1 py-0.2 bg-teal-100 text-teal-800 rounded border border-teal-300">
                                  PKD
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* GIỜ Y LỆNH: Cỡ chữ to, in đậm (font-black), nổi bật rõ ràng */}
                        <td className={`${densityStyles.cellPadding} border border-slate-400 text-center bg-slate-100/80`}>
                          <span className={`print-slot-time font-mono font-black ${densityStyles.slotText} text-slate-950 inline-block tracking-wider`}>
                            {p.slotTime}
                          </span>
                        </td>

                        {/* CỘT GHI CHÚ: Để trống hoàn toàn theo yêu cầu */}
                        <td className={`${densityStyles.cellPadding} border border-slate-400 text-slate-400 text-[11px]`}>
                          {p.note || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* CHẾ ĐỘ ĐẦY ĐỦ 10 CỘT (Khi cần đối chiếu chi tiết) */
                <table className={`w-full text-left text-xs border-collapse border border-slate-400`}>
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-400">
                      <th className="py-2 px-2 border border-slate-300 text-center w-10">STT</th>
                      <th className="py-2 px-2.5 border border-slate-400 text-center w-28 bg-slate-200 text-slate-950 font-black uppercase text-xs tracking-wider">
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
                        <td className="py-1.5 px-3 border border-slate-300 text-[11px] text-slate-700">
                          {p.note || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PHẦN CHỮ KÝ VÀ CHÂN TRANG (Cố định vừa vặn trên 1 trang A4) */}
            <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs text-slate-800 print-page-break-avoid">
              <div>
                <div className="font-bold uppercase tracking-wider">ĐIỀU PHỐI VIÊN</div>
                <div className="text-[10px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className={densityStyles.signatureHeight}></div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wider">BÁC SĨ PHỤ TRÁCH</div>
                <div className="text-[10px] text-slate-500 mt-0.5">(Ký và xác nhận)</div>
                <div className={densityStyles.signatureHeight}></div>
              </div>
              <div>
                <div className="font-bold uppercase tracking-wider">LÃNH ĐẠO KHOA NỘI TRÚ</div>
                <div className="text-[10px] text-slate-500 mt-0.5">(Ký duyệt)</div>
                <div className={densityStyles.signatureHeight}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
