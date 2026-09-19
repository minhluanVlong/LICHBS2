import React, { useState, useEffect, useMemo } from 'react';
import {
  RawPatientRow,
  Doctor,
  ScheduledPatient,
  SavedScheduleDay,
  VALID_ROOMS,
} from './types';
import { parseTextTable } from './utils/excelParser';
import { SAMPLE_REAL_DATA_TEXT } from './utils/sampleData';
import { schedulePatientsForDoctor } from './utils/scheduler';
import { getSavedSchedules, saveScheduleDay, deleteSavedSchedule } from './utils/storage';
import { Step1DataInput } from './components/Step1DataInput';
import { Step2DoctorSetup } from './components/Step2DoctorSetup';
import { Step3ClinicalFlags } from './components/Step3ClinicalFlags';
import { Step4ScheduleView } from './components/Step4ScheduleView';
import { SavedSchedulesModal } from './components/SavedSchedulesModal';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { FirebaseAuthStatus } from './components/FirebaseAuthStatus';
import { useAuth } from './context/AuthContext';
import {
  saveScheduleToFirestore,
  deleteScheduleFromFirestore,
  subscribeSavedSchedulesFromFirestore,
} from './services/scheduleFirestore';
import {
  CheckCircle2,
  Calendar,
  Users,
  Pill,
  Clock,
  Building2,
  BookOpen,
  Hospital,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const { user } = useAuth();

  // Trạng thái Bước quy trình
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Dữ liệu bệnh nhân gốc
  const [patients, setPatients] = useState<RawPatientRow[]>(() => {
    // Khởi tạo ngay với dữ liệu thực tế mẫu 15 bệnh nhân
    const initial = parseTextTable(SAMPLE_REAL_DATA_TEXT);
    return initial.patients;
  });

  // Ngày lập lịch
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-09-19'; // Ngày hiện tại theo metadata
  });

  // Giờ bắt đầu ca khám (mặc định 07:00)
  const [startTime, setStartTime] = useState<string>('07:00');

  // Danh sách bác sĩ và phân công 12 phòng
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: 'bs-1',
      name: 'BS 1: BS. Nguyễn Văn An',
      assignedRooms: ['HS1', 'HS2', 'P1', 'P2', 'KL', 'PM'],
    },
    {
      id: 'bs-2',
      name: 'BS 2: BS. Trần Thị Bình',
      assignedRooms: ['P3', 'P4', 'P5', 'LK', 'N1', 'N2'],
    },
  ]);

  // Chỉ định lâm sàng KS / PKD (KHÔNG TỰ SUY DIỄN - CHỈ NGƯỜI DÙNG TÍCH CHỌN)
  const [clinicalFlags, setClinicalFlags] = useState<
    Map<string, { isKS: boolean; isPKD: boolean; previousTime?: string }>
  >(new Map());

  // Kết quả sau khi chạy thuật toán sắp xếp lịch khám 5 phút
  const [scheduledPatients, setScheduledPatients] = useState<ScheduledPatient[]>([]);

  // Cơ sở dữ liệu lịch đã lưu
  const [savedHistory, setSavedHistory] = useState<SavedScheduleDay[]>(() => {
    return getSavedSchedules();
  });

  // Trạng thái Modal
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDoctorId, setPrintDoctorId] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quản lý biến động trong ngày (khung giờ trống đã giải phóng & nhật ký)
  const [freedSlots, setFreedSlots] = useState<any[]>([]);
  const [intradayActivities, setIntradayActivities] = useState<any[]>([]);

  // Lắng nghe dữ liệu thời gian thực từ Cloud Firestore khi người dùng đăng nhập
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeSavedSchedulesFromFirestore((firestoreList) => {
      if (firestoreList && firestoreList.length > 0) {
        setSavedHistory((prev) => {
          const map = new Map<string, SavedScheduleDay>();
          prev.forEach((p) => map.set(p.id, p));
          firestoreList.forEach((f) => map.set(f.id, f));
          return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleOpenPrintModal = (doctorId: string = 'all') => {
    setPrintDoctorId(doctorId);
    setIsPrintModalOpen(true);
  };

  // Hiển thị ngày và thứ
  const dateDisplayInfo = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const day = d.getDay();
    const dayNames = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const parts = selectedDate.split('-');
    const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    return {
      displayDate,
      dayOfWeek: dayNames[day],
    };
  }, [selectedDate]);

  // Kiểm tra ngày hôm nay đã được lưu vào cơ sở dữ liệu chưa
  const isSavedToday = useMemo(() => {
    return savedHistory.some((s) => s.id === selectedDate);
  }, [savedHistory, selectedDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Thuật toán chạy sắp xếp lịch khám (BƯỚC 4)
  const handleRunScheduler = () => {
    // Ánh xạ phòng -> Bác sĩ
    const roomToDoctorMap = new Map<string, Doctor>();
    doctors.forEach((doc) => {
      doc.assignedRooms.forEach((r) => roomToDoctorMap.set(r, doc));
    });

    // Gom bệnh nhân theo từng bác sĩ
    const patientsByDoctor = new Map<string, any[]>();
    doctors.forEach((doc) => patientsByDoctor.set(doc.id, []));

    patients.forEach((p) => {
      const doc = roomToDoctorMap.get(p.normalizedRoom);
      if (!doc) return;

      const flag = clinicalFlags.get(p.id);
      const isKS = flag ? flag.isKS : false;
      const isPKD = flag ? flag.isPKD : false;

      // Tìm giờ ngày trước từ bản ghi ngày trước nếu có
      let prevTime = flag?.previousTime;
      if (!prevTime && savedHistory.length > 0) {
        const lastSaved = savedHistory[0];
        const match = lastSaved.patients.find(
          (sp) =>
            sp.name.trim().toLowerCase() === p.name.trim().toLowerCase() &&
            sp.normalizedRoom.trim().toUpperCase() === p.normalizedRoom.trim().toUpperCase()
        );
        if (match) {
          prevTime = match.slotTime;
        }
      }

      const pWithDoc = {
        ...p,
        doctorId: doc.id,
        doctorName: doc.name,
        assignedDoctorName: doc.name,
        isKS,
        isPKD,
        previousTime: prevTime || '',
        matchedPreviousDay: Boolean(prevTime),
      };

      const list = patientsByDoctor.get(doc.id) || [];
      list.push(pWithDoc);
      patientsByDoctor.set(doc.id, list);
    });

    // Lập lịch độc lập song song cho từng Bác sĩ với chu kỳ 5 phút
    let allScheduled: ScheduledPatient[] = [];

    doctors.forEach((doc) => {
      const docPatients = patientsByDoctor.get(doc.id) || [];
      const scheduledForDoc = schedulePatientsForDoctor(doc, docPatients, startTime, 5);
      allScheduled = allScheduled.concat(scheduledForDoc);
    });

    // Sắp xếp tổng thể theo slotMinutes tăng dần để hiển thị bảng
    allScheduled.sort((a, b) => a.slotMinutes - b.slotMinutes);

    setScheduledPatients(allScheduled);
    setCurrentStep(4);
    showToast('Đã sắp xếp lịch khám 5 phút thành công cho tất cả Bác sĩ!');
  };

  // Lưu lịch ngày này vào cơ sở dữ liệu
  const handleSaveCurrentSchedule = () => {
    if (scheduledPatients.length === 0) return;

    const ksCount = scheduledPatients.filter((p) => p.isKS).length;
    const pkdCount = scheduledPatients.filter((p) => p.isPKD).length;

    const existing = savedHistory.find((h) => h.id === selectedDate);
    const createdAt = existing ? existing.createdAt : new Date().toISOString();

    const record: SavedScheduleDay = {
      id: selectedDate,
      displayDate: dateDisplayInfo.displayDate,
      dayOfWeek: dateDisplayInfo.dayOfWeek,
      createdAt,
      startTime,
      doctors,
      patients: scheduledPatients,
      totalPatients: scheduledPatients.length,
      totalKS: ksCount,
      totalPKD: pkdCount,
    };

    saveScheduleDay(record);
    setSavedHistory(getSavedSchedules());

    if (user) {
      saveScheduleToFirestore(record)
        .then(() => {
          showToast(`Đã lưu lịch ngày ${dateDisplayInfo.displayDate} và đồng bộ lên Cloud Firestore!`);
        })
        .catch((err) => {
          console.error('Lỗi đồng bộ Cloud Firestore:', err);
          showToast(`Đã lưu lịch tại chỗ (Lỗi đám mây: ${err.message || 'thất bại'})`);
        });
    } else {
      showToast(`Đã lưu thành công lịch ngày ${dateDisplayInfo.displayDate} vào cơ sở dữ liệu!`);
    }
  };

  // Cập nhật danh sách bệnh nhân sau khi xuất viện hoặc thêm bệnh nhân mới và tự động lưu vào LỊCH ĐÃ LƯU
  const handleUpdatePatients = (
    updatedList: ScheduledPatient[],
    toastMsg: string,
    updatedFreed?: any[]
  ) => {
    setScheduledPatients(updatedList);
    if (updatedFreed !== undefined) {
      setFreedSlots(updatedFreed);
    }
    showToast(toastMsg);

    // Tự động đồng bộ và lưu phiên bản cập nhật vào LỊCH ĐÃ LƯU
    const ksCount = updatedList.filter((p) => p.isKS).length;
    const pkdCount = updatedList.filter((p) => p.isPKD).length;

    const existing = savedHistory.find((h) => h.id === selectedDate);
    const createdAt = existing ? existing.createdAt : new Date().toISOString();

    const record: SavedScheduleDay = {
      id: selectedDate,
      displayDate: dateDisplayInfo.displayDate,
      dayOfWeek: dateDisplayInfo.dayOfWeek,
      createdAt,
      startTime,
      doctors,
      patients: updatedList,
      totalPatients: updatedList.length,
      totalKS: ksCount,
      totalPKD: pkdCount,
    };

    saveScheduleDay(record);
    setSavedHistory(getSavedSchedules());

    if (user) {
      saveScheduleToFirestore(record).catch((err) => {
        console.error('Lỗi tự động đồng bộ biến động lên Cloud Firestore:', err);
      });
    }
  };

  // Mở lịch đã lưu để xem chi tiết hoặc cập nhật biến động trong ngày
  const handleLoadScheduleForView = (schedule: SavedScheduleDay) => {
    setSelectedDate(schedule.id);
    if (schedule.startTime) setStartTime(schedule.startTime);
    setDoctors(schedule.doctors);
    setScheduledPatients(schedule.patients);
    setCurrentStep(4);
    setIsSavedModalOpen(false);
    showToast(
      `Đã mở lịch ngày ${schedule.displayDate}. Bạn có thể xem chi tiết, xuất viện hoặc thêm bệnh nhân mới!`
    );
  };

  const handleDeleteSavedSchedule = (id: string) => {
    const updated = deleteSavedSchedule(id);
    setSavedHistory(updated);

    if (user) {
      deleteScheduleFromFirestore(id).catch((err) => {
        console.error('Lỗi xóa trên Cloud Firestore:', err);
      });
    }
    showToast('Đã xóa bản ghi lịch đã chọn.');
  };

  const steps = [
    { number: 1, title: 'Đọc Dữ Liệu & Kiểm Tra Phòng', icon: Building2 },
    { number: 2, title: 'Phân Công Bác Sĩ', icon: Users },
    { number: 3, title: 'Chỉ Định KS & PKD', icon: Pill },
    { number: 4, title: 'Lịch Khám 5 Phút & Lưu Trữ', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main App Bar Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-950">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  ĐIỀU PHỐI LỊCH KHÁM BỆNH NỘI VIỆN
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Chu kỳ 5 phút
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Kiểm soát 12 phòng bệnh • Phân công cố định • Giữ giờ ngày trước • Chỉ định KS/PKD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-200">
                {dateDisplayInfo.displayDate} ({dateDisplayInfo.dayOfWeek})
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {patients.length} bệnh nhân • {doctors.length} bác sĩ
              </div>
            </div>

            {/* Trạng thái xác thực Firebase & Đồng bộ đám mây */}
            <FirebaseAuthStatus />

            <button
              id="btn-header-saved-schedules"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Xem cơ sở dữ liệu các ngày đã lưu"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Lịch Đã Lưu ({savedHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Stepper Navigation Bar */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto py-2.5 gap-2 scrollbar-none">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isPast = currentStep > step.number;

              return (
                <button
                  key={step.number}
                  onClick={() => {
                    // Cho phép quay lại bước trước hoặc di chuyển nếu hợp lệ
                    if (isPast) {
                      setCurrentStep(step.number as any);
                    }
                  }}
                  disabled={!isPast && !isActive}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : isPast
                      ? 'text-teal-300 hover:bg-slate-800/80 cursor-pointer'
                      : 'text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-indigo-900'
                        : isPast
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : step.number}
                  </span>
                  <span>{step.title}</span>
                  {step.number < 4 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentStep === 1 && (
          <Step1DataInput
            patients={patients}
            onUpdatePatients={(updated) => setPatients(updated)}
            onNextStep={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2DoctorSetup
            patients={patients}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            doctors={doctors}
            onUpdateDoctors={setDoctors}
            onNextStep={() => setCurrentStep(3)}
            onPrevStep={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3ClinicalFlags
            patients={patients}
            doctors={doctors}
            savedHistory={savedHistory}
            clinicalFlags={clinicalFlags}
            onUpdateFlags={setClinicalFlags}
            startTime={startTime}
            onStartTimeChange={setStartTime}
            onRunScheduler={handleRunScheduler}
            onPrevStep={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4ScheduleView
            scheduledPatients={scheduledPatients}
            doctors={doctors}
            selectedDate={selectedDate}
            displayDate={dateDisplayInfo.displayDate}
            dayOfWeek={dateDisplayInfo.dayOfWeek}
            startTime={startTime}
            onSaveCurrentSchedule={handleSaveCurrentSchedule}
            onOpenSavedModal={() => setIsSavedModalOpen(true)}
            onOpenPrintModal={handleOpenPrintModal}
            onPrevStep={() => setCurrentStep(3)}
            isSavedToday={isSavedToday}
            onUpdatePatients={handleUpdatePatients}
            freedSlots={freedSlots}
            setFreedSlots={setFreedSlots}
            activities={intradayActivities}
            setActivities={setIntradayActivities}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Hệ Thống Điều Phối Lịch Khám Bệnh Nội Viện Thông Minh • Chu kỳ khám 5 phút
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>12 Mã Phòng: HS1, HS2, P1..P5, LK, N1, N2, PM, KL</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SavedSchedulesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedSchedules={savedHistory}
        onDeleteSchedule={handleDeleteSavedSchedule}
        onLoadScheduleForView={handleLoadScheduleForView}
      />

      <PrintScheduleModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        patients={scheduledPatients}
        doctors={doctors}
        dateStr={dateDisplayInfo.displayDate}
        dayOfWeek={dateDisplayInfo.dayOfWeek}
        startTime={startTime}
        initialDoctorId={printDoctorId}
      />
    </div>
  );
}
