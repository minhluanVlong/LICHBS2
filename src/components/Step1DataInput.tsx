import React, { useState, useRef } from 'react';
import { RawPatientRow, VALID_ROOMS } from '../types';
import { parseExcelFile, parseTextTable, ParseResult } from '../utils/excelParser';
import { normalizeRoom } from '../utils/roomUtils';
import { SAMPLE_REAL_DATA_TEXT, SAMPLE_INVALID_DATA_TEXT } from '../utils/sampleData';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Check,
  X,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface Step1DataInputProps {
  patients: RawPatientRow[];
  onUpdatePatients: (patients: RawPatientRow[]) => void;
  onNextStep: () => void;
}

export const Step1DataInput: React.FC<Step1DataInputProps> = ({
  patients,
  onUpdatePatients,
  onNextStep,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoomValue, setEditRoomValue] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPatients = patients.length;
  const validCount = patients.filter((p) => p.isValidRoom).length;
  const invalidCount = patients.filter((p) => !p.isValidRoom).length;
  const hasInvalidRoom = invalidCount > 0;
  const isAllValid = totalPatients > 0 && invalidCount === 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        const result: ParseResult = parseExcelFile(buffer);
        onUpdatePatients(result.patients);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        const result: ParseResult = parseExcelFile(buffer);
        onUpdatePatients(result.patients);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessPastedText = (text: string) => {
    if (!text.trim()) return;
    const result = parseTextTable(text);
    onUpdatePatients(result.patients);
  };

  const handleLoadSample = (type: 'valid' | 'invalid') => {
    const text = type === 'valid' ? SAMPLE_REAL_DATA_TEXT : SAMPLE_INVALID_DATA_TEXT;
    setPastedText(text);
    handleProcessPastedText(text);
  };

  const startEditRoom = (patient: RawPatientRow) => {
    setEditingId(patient.id);
    setEditRoomValue(patient.normalizedRoom || patient.rawRoom);
  };

  const saveEditRoom = (patientId: string) => {
    const roomCheck = normalizeRoom(editRoomValue);
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          rawRoom: editRoomValue,
          normalizedRoom: roomCheck.normalized,
          isValidRoom: roomCheck.isValid,
        };
      }
      return p;
    });
    onUpdatePatients(updated);
    setEditingId(null);
  };

  const filteredPatients = patients.filter((p) => {
    if (filterMode === 'valid') return p.isValidRoom;
    if (filterMode === 'invalid') return !p.isValidRoom;
    return true;
  });

  return (
    <div id="step-1-container" className="space-y-6">
      {/* 12 Valid Rooms Directory Header Banner */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Danh Mục 12 Mã Phòng Hợp Lệ Duy Nhất
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống chỉ chấp nhận đúng 12 mã phòng này (tự động chuẩn hóa viết hoa và xóa tiền tố thừa):
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 max-w-xl">
            {VALID_ROOMS.map((room) => (
              <span
                key={room}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700 rounded-md tracking-wider"
              >
                {room}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Input Selection Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              id="tab-upload-file"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              Tải File Excel (.xlsx, .xls, .csv)
            </button>
            <button
              id="tab-paste-text"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Dán Dữ Liệu Bảng (Copy từ Excel)
            </button>
          </div>

          {/* Sample dataset buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-sample-valid"
              onClick={() => handleLoadSample('valid')}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Tải 15 bệnh nhân mẫu chuẩn có phòng hợp lệ và đối chiếu ngày trước"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Tải Dữ Liệu Mẫu Chuẩn
            </button>
            <button
              id="btn-sample-invalid"
              onClick={() => handleLoadSample('invalid')}
              className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Thử nghiệm kiểm soát chặn khi có phòng P6, Phòng 10, ???"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Thử Nghiệm Lỗi Phòng
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <div
            id="drag-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Nhấp để chọn file Excel hoặc kéo thả file vào đây
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Hỗ trợ định dạng .xlsx, .xls, .csv. Các cột tự động nhận diện: STT, Họ và tên, Phòng, SG
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              id="paste-textarea"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Dán các cột trực tiếp từ file Excel vào đây:&#10;STT&#9;Họ và tên&#9;Phòng&#9;SG&#10;1&#9;NGUYỄN VĂN A&#9;HS1&#9;G01&#10;2&#9;TRẦN THỊ B&#9;P2&#9;G02"
              rows={5}
              className="w-full font-mono text-xs p-3.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-slate-50"
            />
            <div className="flex justify-end gap-2">
              <button
                id="btn-process-paste"
                onClick={() => handleProcessPastedText(pastedText)}
                disabled={!pastedText.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Xử Lý Danh Sách Đã Dán
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
            {totalPatients}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Bệnh Nhân
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalPatients}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-lg">
            {validCount}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phòng Hợp Lệ
            </div>
            <div className="text-2xl font-bold text-emerald-600">{validCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
              invalidCount > 0
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {invalidCount}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phòng Không Hợp Lệ
            </div>
            <div
              className={`text-2xl font-bold ${
                invalidCount > 0 ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {invalidCount}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Blocking Conditions Banner */}
      {totalPatients > 0 && (
        <div id="validation-status-banner">
          {hasInvalidRoom ? (
            <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    ⚠ Phát hiện phòng không hợp lệ – Chưa được phép sắp xếp lịch.
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Có {invalidCount} bệnh nhân mang mã phòng không thuộc 12 mã chuẩn (HS1, HS2, P1, P2, P3, P4, P5, LK, N1, N2, PM, KL). Bạn có thể bấm vào biểu tượng bút chì bên dưới bảng để sửa nhanh sang mã hợp lệ.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setFilterMode('invalid')}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Lọc xem {invalidCount} phòng lỗi
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    ✓ Dữ liệu phòng hợp lệ – Có thể tiếp tục.
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Toàn bộ {validCount} bệnh nhân đều có mã phòng chuẩn hóa hợp lệ trong danh mục 12 phòng.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  id="btn-next-step-1"
                  onClick={onNextStep}
                  className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                >
                  Tiếp Tục Sang Bước 2: Phân Bổ Bác Sĩ →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {totalPatients > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Bảng Đối Chiếu Kiểm Tra Dữ Liệu Phòng ({patients.length} bệnh nhân)
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Xem:</span>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Tất cả ({totalPatients})
              </button>
              <button
                onClick={() => setFilterMode('valid')}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  filterMode === 'valid'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200'
                }`}
              >
                Hợp lệ ({validCount})
              </button>
              <button
                onClick={() => setFilterMode('invalid')}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  filterMode === 'invalid'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white text-rose-700 border border-rose-200'
                }`}
              >
                Không hợp lệ ({invalidCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-14 text-center">STT</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-3 text-center">SG</th>
                  <th className="py-3 px-3">Phòng Gốc</th>
                  <th className="py-3 px-3">Phòng Chuẩn Hóa</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-center w-28">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPatients.map((p) => {
                  const isEditing = editingId === p.id;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !p.isValidRoom ? 'bg-rose-50/60' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-medium">
                        {p.stt}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {p.name || <span className="text-slate-400 italic">(Chưa có tên)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {p.sg || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {p.rawRoom || <span className="text-rose-400 italic">(Rỗng)</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editRoomValue}
                              onChange={(e) => setEditRoomValue(e.target.value)}
                              className="w-20 px-2 py-1 border border-blue-500 rounded text-xs font-mono uppercase bg-white focus:outline-none"
                              placeholder="Mã phòng"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditRoom(p.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Lưu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              p.isValidRoom
                                ? 'bg-slate-100 text-slate-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.normalizedRoom || '(Rỗng)'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.isValidRoom ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Hợp lệ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <AlertCircle className="w-3 h-3" />
                            Không hợp lệ
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {!isEditing && (
                          <button
                            onClick={() => startEditRoom(p)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="Sửa nhanh mã phòng"
                          >
                            <Edit3 className="w-3 h-3" />
                            Sửa phòng
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị {filteredPatients.length} / {totalPatients} bệnh nhân.
            </span>
            <span>
              Nguyên tắc: Dữ liệu thực tế, giữ nguyên họ tên, STT và cột SG.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Chưa có dữ liệu bệnh nhân</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Vui lòng tải lên file Excel danh sách nội viện hoặc nhấn nút <strong>"Tải Dữ Liệu Mẫu Chuẩn"</strong> ở góc trên để bắt đầu ngay.
          </p>
        </div>
      )}
    </div>
  );
};
