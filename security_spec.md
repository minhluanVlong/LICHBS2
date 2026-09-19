# Security Specification for Firestore Rules

## 1. Data Invariants
- `saved_schedules/{scheduleId}`: Mỗi bản ghi đại diện cho lịch điều phối khám bệnh nội trú theo ngày.
- Document ID `scheduleId` phải tuân thủ định dạng chuẩn (`^[a-zA-Z0-9_\\-]+$`, tối đa 128 ký tự).
- Mỗi lịch phải có `id`, `displayDate`, `dayOfWeek`, `createdAt`, `startTime`, `doctors`, `patients`.
- `doctors` và `patients` là danh sách giới hạn hợp lý (ví dụ: tối đa 20 bác sĩ, 500 bệnh nhân).
- Quản trị viên khởi tạo: `minhluan.ttytcl@gmail.com`.
- Các nhân viên y tế đã đăng nhập và xác thực email đều có quyền đọc và đồng bộ lịch khám.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read:** Attacker without login attempts to read `/saved_schedules/2026-09-19`. -> Must DENY.
2. **Unauthenticated Write:** Attacker attempts to create/overwrite `/saved_schedules/2026-09-19`. -> Must DENY.
3. **Unverified Email Write:** User with unverified email attempts to write a schedule. -> Must DENY.
4. **Id Poisoning:** Attacker attempts to create `/saved_schedules/<huge_1mb_path_with_slashes_or_symbols>`. -> Must DENY.
5. **Ghost Fields Injection:** Payload includes unauthorized fields like `{"maliciousAdminField": true}`. -> Must DENY.
6. **Missing Required Fields:** Payload omits `doctors` or `patients`. -> Must DENY.
7. **Type Poisoning (totalPatients):** `totalPatients` passed as string `"many"` instead of number. -> Must DENY.
8. **Unbounded Array Attack:** `patients` array contains 10,000 items attempting DoW attack. -> Must DENY.
9. **Arbitrary Collection Write:** Attacker writes to arbitrary collection `/hack/{docId}`. -> Must DENY by default catch-all rule.
10. **Tampered Document ID:** Document ID path does not match internal `id` or invalid syntax. -> Must DENY.
11. **Excessive String Length:** `displayDate` with 2KB string. -> Must DENY.
12. **Blanket Query Scraping:** Attacker attempts unrestricted collection query without auth. -> Must DENY.
