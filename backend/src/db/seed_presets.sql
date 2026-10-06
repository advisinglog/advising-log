INSERT OR IGNORE INTO advising_category_configs (id, value, label_th, label_en, sub_categories, is_active, created_at, updated_at) VALUES
('CAT001', 'scholarship_document', 'ทุนการศึกษา / ลงนามเอกสาร', 'Scholarship / Document Signing', '["Scholarship Renewal","Recommendation Letter","Certificate Request","Transcript Request"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT002', 'financial', 'ปัญหาทางการเงิน / ค่าธรรมเนียม', 'Financial Issues', '["Tuition Payment","Financial Aid","Emergency Fund","Work-Study"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT003', 'registration', 'การลงทะเบียนเรียนและแผนการเรียน', 'Registration', '["Course Registration","Add/Drop","Registration Hold","Section Change"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT004', 'student_status', 'สถานภาพนักศึกษา', 'Student Status', '["Enrollment Verification","Status Change","Readmission"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT005', 'academic_performance', 'ผลการเรียน / GPA / ภาวะวิทยาทัณฑ์', 'Academic Performance / GPA / Probation', '["GPA Recovery Plan","Probation Counseling","Course Planning","Academic Support"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT006', 'internship_career', 'ฝึกงาน / สหกิจศึกษา / อาชีพ', 'Internship / Cooperative Education / Career', '["Internship Search","Co-op Placement","Career Guidance","Recommendation"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT007', 'personal', 'ปัญหาส่วนตัว / การปรับตัว', 'Personal Issues', '["Stress / Wellbeing","Conflict Resolution","Accommodation","General Guidance"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('CAT008', 'withdrawal_leave', 'การลาพักการศึกษาหรือลาออก', 'Withdrawal / Leave of Absence', '["Temporary Leave","Permanent Withdrawal","Transfer Out"]', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');

INSERT OR IGNORE INTO document_type_configs (id, name, label_th, label_en, allowed_formats, max_size_mb, is_required, is_active, created_at, updated_at) VALUES
('DT001', 'Exit Petition Form (คำร้องขอลาออก)', 'แบบคำร้องขอลาออกจากการเป็นนักศึกษา', 'Exit Petition Form (Withdrawal Request)', '["PDF","JPG","PNG"]', 10, 1, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('DT002', 'Leave of Absence Request (คำร้องขอลาพักการศึกษา)', 'แบบคำร้องขอลาพักการศึกษา', 'Leave of Absence Request Form', '["PDF","JPG","PNG"]', 10, 1, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('DT003', 'Late Registration Petition (คำร้องขอลงทะเบียนล่าช้า)', 'แบบคำร้องขอลงทะเบียนเรียน / เพิ่ม-ถอนล่าช้า', 'Late Registration / Add-Drop Petition', '["PDF","JPG","PNG"]', 10, 0, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('DT004', 'Study Plan / Degree Audit Form (แผนการเรียน)', 'แบบฟอร์มแผนการเรียนและการตรวจสอบหลักสูตร', 'Study Plan & Degree Audit Form', '["PDF","JPG","PNG"]', 10, 0, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('DT005', 'Scholarship / Financial Aid Form (คำร้องขอรับทุน)', 'แบบคำร้องขอรับทุนการศึกษา / เงินกู้ยืมเพื่อการศึกษา', 'Scholarship & Financial Aid Endorsement Form', '["PDF","JPG","PNG"]', 10, 0, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('DT006', 'Supporting Evidence / Medical Note (เอกสารหลักฐาน/ใบรับรองแพทย์)', 'เอกสารหลักฐานประกอบ / ใบรับรองแพทย์', 'Supporting Evidence & Medical Certificate', '["PDF","JPG","PNG"]', 10, 0, 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
