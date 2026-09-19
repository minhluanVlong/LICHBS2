import React, { useState, useEffect } from 'react';
import { ScheduledPatient, Doctor } from '../types';
import { Printer, X, FileText, Check, LayoutGrid, Sliders, User, Users, ChevronDown, Download } from 'lucide-react';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: ScheduledPatient[];
  doctors: Doctor[];
  dateStr: string;
  dayOfWeek: string;
  startTime: string;
  initialDoctorId?: string;
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  dateStr,
  dayOfWeek,
  startTime,
  initialDoctorId = 'all',
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId);
  // Chế độ in từng bác sĩ 1 trang riêng khi chọn Tất cả (Mặc định BẬT để đảm bảo ngắt trang tuyệt đối)
  const [isSeparateDoctorPages, setIsSeparateDoctorPages] = useState<boolean>(true);
  // Chế độ 5 cột chuẩn theo quy định: STT, HỌ VÀ TÊN, GIỜ Y LỆNH, GIƯỜNG PHÒNG, GHI CHÚ
  const [isFiveColumnMode, setIsFiveColumnMode] = useState<boolean>(true);
  // Tùy chọn kích cỡ chữ để vừa vặn 1 trang A4
  const [densityMode, setDensityMode] = useState<'auto' | 'compact' | 'normal' | 'large'>('auto');

  // Cập nhật bác sĩ khi mở lại modal từ ngoài
  useEffect(() => {
    if (isOpen) {
      setSelectedDoctorId(initialDoctorId || 'all');
    }
  }, [isOpen, initialDoctorId]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Tạo tên file PDF theo tên bác sĩ và ngày khám chuẩn
  const getPdfFileName = () => {
    const cleanDate = dateStr.replace(/[^a-zA-Z0-9]/g, '_');
    if (selectedDoctor) {
      const cleanDocName = selectedDoctor.name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      return `Lich_Kham_${cleanDocName}_${cleanDate}`;
    }
    if (isSeparateDoctorPages) {
      return `Lich_Kham_Tung_Bac_Si_${cleanDate}`;
    }
    return `Lich_Kham_Toan_Bo_Noi_Vien_${cleanDate}`;
  };

  const handlePrint = () => {
    const printableArea = document.getElementById('printable-a4-area');
    if (!printableArea) {
      window.print();
      return;
    }

    const pdfFileName = getPdfFileName();
    const originalDocumentTitle = document.title;
    // Đặt document.title tạm thời để trình duyệt tự động gán tên file khi lưu PDF
    document.title = pdfFileName;

    // Tạo iframe in độc lập nhằm bảo đảm dữ liệu xuất hiện 100%, không bị trang trắng
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      document.title = originalDocumentTitle;
      return;
    }

    // Sao chép toàn bộ styles để hiển thị đúng định dạng A4, phông chữ và bảng biểu
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>${pdfFileName}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm 8mm 10mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #isolated-print-content {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .print-page-break-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print-page-break-after {
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-slot-time {
              font-size: 14pt !important;
              font-weight: 900 !important;
              color: #000000 !important;
              letter-spacing: 0.04em !important;
            }
          </style>
        </head>
        <body>
          <div id="isolated-print-content">
            ${printableArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        window.print();
      } finally {
        setTimeout(() => {
          document.title = originalDocumentTitle;
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }
    }, 250);
  };

  const filteredPatients =
    selectedDoctorId === 'all'
      ? patients
      : patients.filter((p) => p.doctorId === selectedDoctorId);

  // Danh sách bác sĩ có bệnh nhân
  const activeDoctors = doctors.filter((d) =>
    patients.some((p) => p.doctorId === d.id)
  );

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

  // Hàm render nội dung 1 trang A4 cho một bác sĩ cụ thể hoặc danh sách tổng thể
  const renderDoctorSheet = (
    doc: Doctor | null,
    patientList: ScheduledPatient[],
    isLastPage: boolean = true
  ) => {
    const doctorPatients = doc
      ? patientList.filter((p) => p.doctorId === doc.id)
      : patientList;

    if (doctorPatients.length === 0) return null;

    const sheetDensity =
      doctorPatients.length > 25
        ? 'compact'
        : doctorPatients.length > 14
        ? 'normal'
        : 'large';

    const currentStyles = densityStyles;

    return (
      <div
        key={doc?.id || 'all'}
        className={`bg-white shadow-xl mx-auto w-full max-w-[210mm] min-h-[285mm] border border-slate-300 p-8 sm:p-10 flex flex-col justify-between mb-8 last:mb-0 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:min-h-0 ${
          !isLastPage ? 'print-page-break-after' : ''
        }`}
      >
        <div>
          {/* Header Bệnh Viện & Khoa Điều Trị theo đúng chuẩn Bộ Y tế & prompt */}
          <div className={`border-b-2 border-slate-900 ${currentStyles.headerMargin}`}>
            <div className="flex justify-between items-start text-xs text-slate-900 pb-2">
              <div className="text-center font-bold">
                <div className="text-xs uppercase tracking-wide">BỆNH VIỆN ĐKKV CHỢ LÁCH</div>
                <div className="text-xs uppercase font-extrabold text-slate-900 border-b border-slate-900 inline-block pb-0.5">
                  KHOA NỘI NHI NHIỄM
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase font-bold tracking-wide">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-xs font-semibold underline decoration-slate-600">
                  Độc lập - Tự do - Hạnh phúc
                </div>
              </div>
            </div>

            <div className="text-center mt-2 mb-2">
              <h1 className={`${currentStyles.titleSize} uppercase tracking-tight text-slate-950 font-black`}>
                BẢNG ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI TRÚ
              </h1>
              <p className="text-xs text-slate-700 mt-0.5 font-medium">
                Ngày: <strong className="text-slate-900">{dateStr}</strong> | Ca khám: <strong className="text-slate-900">Sáng</strong>
              </p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-300 text-xs text-slate-900 space-y-0.5">
              <div className="font-bold">
                BÁC SĨ PHỤ TRÁCH: <span className="font-extrabold uppercase">{doc ? doc.name : 'TOÀN BỘ BÁC SĨ TRONG PHIÊN KHÁM'}</span>
              </div>
              <div className="font-bold">
                BUỒNG PHỤ TRÁCH : <span className="font-mono font-semibold">{doc ? doc.assignedRooms.join(', ') : 'Tất cả buồng bệnh'}</span>
              </div>
            </div>
          </div>

          {/* BẢNG DANH SÁCH BỆNH NHÂN */}
          {isFiveColumnMode ? (
            /* CHẾ ĐỘ 5 CỘT QUY ĐỊNH: STT, HỌ VÀ TÊN, GIỜ Y LỆNH, GIƯỜNG PHÒNG, GHI CHÚ */
            <table className={`w-full text-left ${currentStyles.tableText} border-collapse border-2 border-slate-900`}>
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-black uppercase border-b-2 border-slate-900 text-center">
                  <th className={`${currentStyles.cellPadding} border border-slate-400 w-12 text-center`}>
                    STT
                  </th>
                  <th className={`${currentStyles.cellPadding} border border-slate-400 text-left`}>
                    HỌ VÀ TÊN
                  </th>
                  <th className={`${currentStyles.cellPadding} border border-slate-400 w-32 bg-slate-300 text-slate-950 tracking-wider text-center`}>
                    GIỜ Y LỆNH
                  </th>
                  <th className={`${currentStyles.cellPadding} border border-slate-400 w-32 text-center`}>
                    GIƯỜNG PHÒNG
                  </th>
                  <th className={`${currentStyles.cellPadding} border border-slate-400 w-52 text-left`}>
                    GHI CHÚ
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctorPatients.map((p, idx) => {
                  // Định dạng Giường phòng (kèm số giường nếu có dữ liệu ở cột SG)
                  const roomBedDisplay = p.sg && p.sg.trim()
                    ? `${p.normalizedRoom} (G.${p.sg.trim()})`
                    : p.normalizedRoom;

                  // Ghi rõ diện ưu tiên (KS Tiêm sáng, PKD Khí dung, Giữ giờ cũ, Mới nhập viện...)
                  const priorityNotes: string[] = [];
                  if (p.isKS && p.isPKD) {
                    priorityNotes.push('KS Tiêm sáng + PKD Khí dung');
                  } else if (p.isKS) {
                    priorityNotes.push('KS Tiêm sáng');
                  } else if (p.isPKD) {
                    priorityNotes.push('PKD Khí dung');
                  }

                  if (p.hasConflict) {
                    priorityNotes.push('Đã chỉnh do xung đột');
                  } else if (p.previousTime) {
                    priorityNotes.push('Giữ giờ cũ');
                  } else if (p.statusNote && p.statusNote.includes('Mới nhập viện')) {
                    priorityNotes.push('Mới nhập viện');
                  }

                  if (p.note && p.note.trim()) {
                    priorityNotes.push(p.note.trim());
                  }

                  const finalNote = priorityNotes.join(' • ');

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-400 ${
                        idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      {/* STT */}
                      <td className={`${currentStyles.cellPadding} border border-slate-400 text-center font-mono font-bold text-slate-700`}>
                        {idx + 1}
                      </td>

                      {/* HỌ VÀ TÊN (chữ in hoa) */}
                      <td className={`${currentStyles.cellPadding} border border-slate-400 font-extrabold text-slate-950 uppercase`}>
                        {p.name.toUpperCase()}
                      </td>

                      {/* GIỜ Y LỆNH: IN ĐẬM VÀ CỠ CHỮ LỚN HƠN CÁC CỘT KHÁC */}
                      <td className={`${currentStyles.cellPadding} border border-slate-400 text-center bg-slate-100/80`}>
                        <span className={`print-slot-time font-mono font-black ${currentStyles.slotText} text-slate-950 inline-block tracking-wider`}>
                          {p.slotTime}
                        </span>
                      </td>

                      {/* GIƯỜNG PHÒNG */}
                      <td className={`${currentStyles.cellPadding} border border-slate-400 text-center font-mono font-bold text-slate-900`}>
                        {roomBedDisplay}
                      </td>

                      {/* GHI CHÚ: Ghi rõ diện ưu tiên */}
                      <td className={`${currentStyles.cellPadding} border border-slate-400 text-slate-700 text-xs font-medium`}>
                        {finalNote}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* CHẾ ĐỘ ĐẦY ĐỦ 10 CỘT */
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
                {doctorPatients.map((p, idx) => (
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

        {/* PHẦN CHỮ KÝ VÀ CHÂN TRANG */}
        <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs text-slate-800 print-page-break-avoid">
          <div>
            <div className="font-bold uppercase tracking-wider">ĐIỀU PHỐI VIÊN</div>
            <div className="text-[10px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</div>
            <div className={currentStyles.signatureHeight}></div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wider">
              {doc ? `BS. ${doc.name.toUpperCase()}` : 'BÁC SĨ PHỤ TRÁCH'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">(Ký và xác nhận)</div>
            <div className={currentStyles.signatureHeight}></div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wider">LÃNH ĐẠO KHOA NỘI TRÚ</div>
            <div className="text-[10px] text-slate-500 mt-0.5">(Ký duyệt)</div>
            <div className={currentStyles.signatureHeight}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div
        id="print-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:h-auto print:block print:rounded-none"
      >
        {/* Modal Toolbar (Ẩn hoàn toàn khi in ra giấy/xuất PDF) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col gap-3 print:hidden shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">
                    In & Xuất PDF Lịch Khám{' '}
                    {selectedDoctor ? `— ${selectedDoctor.name}` : '(Toàn bộ Bác sĩ)'}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
                    Chuẩn 1 Trang A4
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Hỗ trợ <strong>In trực tiếp</strong> ra máy in hoặc <strong>Lưu file PDF</strong> (Tên file: <code className="text-teal-300 font-mono text-[11px]">{getPdfFileName()}.pdf</code>)
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Chọn Bác sĩ Dropdown */}
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-400 cursor-pointer"
                title="Chọn bác sĩ để xuất file PDF riêng"
              >
                <option value="all">Toàn bộ Bác sĩ ({patients.length} ca)</option>
                {doctors.map((d) => {
                  const count = patients.filter((p) => p.doctorId === d.id).length;
                  return (
                    <option key={d.id} value={d.id}>
                      BS: {d.name} ({count} ca)
                    </option>
                  );
                })}
              </select>

              {/* Tùy chọn Mỗi BS 1 trang khi chọn Tất cả */}
              {selectedDoctorId === 'all' && (
                <button
                  onClick={() => setIsSeparateDoctorPages(!isSeparateDoctorPages)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSeparateDoctorPages
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                  title="Mỗi bác sĩ sẽ được in trên 1 trang A4 riêng biệt"
                >
                  <Users className="w-3.5 h-3.5" />
                  {isSeparateDoctorPages ? '✓ Mỗi BS 1 Trang Riêng' : 'Gộp Chung 1 Bảng'}
                </button>
              )}

              {/* Chọn Cỡ Chữ */}
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

              {/* Chuyển đổi 5 cột chuẩn / 10 cột chi tiết */}
              <button
                onClick={() => setIsFiveColumnMode(!isFiveColumnMode)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isFiveColumnMode
                    ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
                title="Bật/tắt chế độ 5 cột chuẩn quy định (STT, HỌ VÀ TÊN, GIỜ Y LỆNH, GIƯỜNG PHÒNG, GHI CHÚ)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isFiveColumnMode ? '5 Cột Chuẩn A4' : 'Đầy Đủ 10 Cột'}
              </button>

              {/* HIỂN THỊ SONG SONG 2 CHỨC NĂNG: [IN LỊCH KHÁM] VÀ [XUẤT FILE PDF] */}
              {/* 1. Nút In Lịch Khám Trực Tiếp */}
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                title="Mở lệnh in trực tiếp ra máy in"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {selectedDoctor ? `In Lịch: ${selectedDoctor.name}` : 'In Lịch Khám'}
                </span>
              </button>

              {/* 2. Nút Xuất File PDF Theo Tên Bác Sĩ */}
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                title="Mở hộp thoại Lưu dưới dạng PDF với tên file chuẩn"
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedDoctor
                    ? `Xuất PDF: ${selectedDoctor.name}`
                    : isSeparateDoctorPages
                    ? 'Xuất PDF Tất Cả (Từng BS)'
                    : 'Xuất File PDF'}
                </span>
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

          {/* Dải Nút Chọn Nhanh Theo Từng Bác Sĩ (Doctor Quick Switcher) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-800 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Chọn Bác sĩ In / Xuất PDF:
            </span>
            <button
              onClick={() => setSelectedDoctorId('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                selectedDoctorId === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tất Cả Bác Sĩ ({patients.length})
            </button>
            {doctors.map((d) => {
              const count = patients.filter((p) => p.doctorId === d.id).length;
              const isSelected = selectedDoctorId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoctorId(d.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white font-bold shadow-sm ring-1 ring-rose-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{d.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Khung mô phỏng hiển thị trên Giấy A4 */}
        <div
          id="print-scroll-container"
          className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/90 text-slate-900 print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto print:block"
        >
          {/* Thông báo hướng dẫn trên màn hình */}
          <div className="max-w-[210mm] mx-auto mb-3 flex items-center justify-between text-xs text-slate-500 print:hidden">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {selectedDoctor ? (
                <span>
                  Đang xem lịch khám riêng của <strong>{selectedDoctor.name}</strong> ({filteredPatients.length} bệnh nhân)
                </span>
              ) : isSeparateDoctorPages ? (
                <span>
                  Chế độ in hàng loạt: <strong>{activeDoctors.length} bác sĩ</strong> (mỗi bác sĩ 1 trang A4 riêng)
                </span>
              ) : (
                <span>
                  Toàn bộ khoa: <strong>{filteredPatients.length}</strong> bệnh nhân
                </span>
              )}
            </span>
            <span>
              Tên file PDF khi lưu: <strong className="text-slate-800">{getPdfFileName()}.pdf</strong>
            </span>
          </div>

          {/* VÙNG IN TRANG A4 CHUẨN */}
          <div id="printable-a4-area">
            {selectedDoctorId !== 'all' ? (
              // In riêng 1 bác sĩ
              renderDoctorSheet(selectedDoctor || null, filteredPatients, true)
            ) : isSeparateDoctorPages ? (
              // In toàn bộ bác sĩ, mỗi bác sĩ 1 trang A4 riêng
              activeDoctors.map((doc, index) =>
                renderDoctorSheet(doc, patients, index === activeDoctors.length - 1)
              )
            ) : (
              // In danh sách tổng thể gộp
              renderDoctorSheet(null, filteredPatients, true)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
