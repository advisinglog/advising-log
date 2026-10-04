-- AdvisingLog Default Seed Data for Cloudflare D1

-- 1. Users
INSERT OR IGNORE INTO users (id, code, name, email, role, department, phone, is_active, has_ai_access, created_at) VALUES
('STU001', '6631503001', 'Somchai Jaidee', 'somchai.j@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5601', 1, 0, '2024-06-01'),
('STU002', '6631503002', 'Ploy Srisuk', 'ploy.s@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5602', 1, 0, '2024-06-01'),
('STU003', '6631503003', 'Nattapong Wongchai', 'nattapong.w@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5603', 1, 0, '2024-06-01'),
('STU004', '6631503004', 'Kannika Thongkam', 'kannika.t@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5604', 1, 0, '2024-06-01'),
('STU005', '6631503005', 'Arthit Phanit', 'arthit.p@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5605', 1, 0, '2024-06-01'),
('STU006', '6631503006', 'Siriporn Meechai', 'siriporn.m@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5606', 1, 0, '2024-06-01'),
('STU007', '6631503007', 'Tanawat Rungroj', 'tanawat.r@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5607', 1, 0, '2024-06-01'),
('STU008', '6631503008', 'Pimchanok Saetang', 'pimchanok.s@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5608', 1, 0, '2024-06-01'),
('STU009', '6631503009', 'Kittipat Somboon', 'kittipat.s@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5609', 1, 0, '2024-06-01'),
('STU010', '6631503010', 'Waraporn Chantara', 'waraporn.c@student.mfu.ac.th', 'student', 'School of Applied Digital Technology (ADT)', '081-234-5610', 1, 0, '2024-06-01'),
('ADV001', 'EMP-1001', 'Dr. Prasit Kanchanawat', 'prasit.k@mfu.ac.th', 'advisor', 'School of Applied Digital Technology (ADT)', '053-916-001', 1, 1, '2020-01-15'),
('ADV002', 'EMP-1002', 'Dr. Wipawan Buathong', 'wipawan.b@mfu.ac.th', 'advisor', 'School of Applied Digital Technology (ADT)', '053-916-002', 1, 0, '2019-08-01'),
('ADV003', 'EMP-1003', 'Dr. Chaiwat Namsai', 'chaiwat.n@mfu.ac.th', 'advisor', 'School of Applied Digital Technology (ADT)', '053-916-003', 1, 0, '2021-01-10'),
('QA001', 'EMP-2001', 'Assoc. Prof. Rattana Pongsakorn', 'rattana.p@mfu.ac.th', 'qa_chair', 'School of Applied Digital Technology (ADT)', '053-916-010', 1, 1, '2018-01-01'),
('ADM001', 'EMP-3001', 'Supattra Kaewmanee', 'supattra.k@mfu.ac.th', 'admin', 'Academic Affairs', '053-916-020', 1, 1, '2019-03-01'),
('ADM_SUPER', 'ADM-SUPER', 'System Super Admin', 'se.advisinglog@gmail.com', 'super_admin', 'Academic & System Affairs', '053-916-000', 1, 1, '2018-01-01');

-- 2. Student-Advisor Assignments
INSERT OR IGNORE INTO student_advisor_assignments (id, student_id, advisor_id, assigned_at, is_active) VALUES
('R001', 'STU001', 'ADV001', '2024-06-15', 1),
('R002', 'STU002', 'ADV001', '2024-06-15', 1),
('R003', 'STU003', 'ADV001', '2024-06-15', 1),
('R004', 'STU004', 'ADV002', '2024-06-15', 1),
('R005', 'STU005', 'ADV002', '2024-06-15', 1),
('R006', 'STU006', 'ADV002', '2024-06-15', 1),
('R007', 'STU007', 'ADV003', '2024-06-15', 1),
('R008', 'STU008', 'ADV003', '2024-06-15', 1),
('R009', 'STU009', 'ADV003', '2024-06-15', 1),
('R010', 'STU010', 'ADV001', '2024-06-15', 1);

-- 3. Advising Requests
INSERT OR IGNORE INTO advising_requests (id, student_id, advisor_id, category, sub_category, details, preferred_date, preferred_time, attachments, pdpa_consent, status, created_at, updated_at) VALUES
('REQ001', 'STU001', 'ADV001', 'academic_performance', 'GPA Improvement', 'I received a warning letter about my GPA dropping below 2.00 this semester. I need guidance on course selection for next semester to recover.', '2026-09-10', '10:00', '["gpa_report.pdf"]', 1, 'scheduled', '2026-08-28', '2026-08-30'),
('REQ002', 'STU002', 'ADV001', 'scholarship_document', 'Signature Request', 'I need my advisor to sign a scholarship renewal form. The deadline is September 20.', '2026-09-05', '14:00', '["scholarship_form.pdf"]', 1, 'completed', '2026-08-20', '2026-09-01'),
('REQ003', 'STU003', 'ADV001', 'personal', 'Stress & Academic Balance', 'I have been feeling overwhelmed and want to discuss my academic workload and personal situation.', '2026-09-12', '11:00', '[]', 1, 'requested', '2026-09-01', '2026-09-01'),
('REQ004', 'STU004', 'ADV002', 'internship_career', 'Summer Placement', 'I want to discuss internship opportunities for the upcoming summer semester and get recommendation letters.', '2026-09-08', '13:00', '["resume.pdf"]', 1, 'pending', '2026-08-25', '2026-08-26'),
('REQ005', 'STU005', 'ADV002', 'registration', 'Registration Hold', 'I need help resolving a registration hold on my account. I cannot register for next semester courses.', '2026-09-03', '09:00', '[]', 1, 'completed', '2026-08-18', '2026-08-28'),
('REQ006', 'STU006', 'ADV002', 'withdrawal_leave', 'Leave Counseling', 'I am considering taking a leave of absence due to family circumstances. I need to understand the process and implications.', '2026-09-15', '10:00', '[]', 1, 'scheduled', '2026-09-02', '2026-09-03'),
('REQ007', 'STU007', 'ADV003', 'financial', 'Emergency Aid', 'I am having difficulty paying tuition fees. I would like to discuss financial aid options and payment plans.', '2026-09-06', '14:00', '[]', 1, 'completed', '2026-08-22', '2026-09-01');

-- 4. Appointments
INSERT OR IGNORE INTO appointments (id, request_id, student_id, advisor_id, scheduled_date, scheduled_time, location, status, student_confirmed, student_declined, student_decline_reason, created_at) VALUES
('APT001', 'REQ001', 'STU001', 'ADV001', '2026-09-10', '10:00', 'Room S2-301', 'scheduled', 0, 0, NULL, '2026-08-30'),
('APT002', 'REQ002', 'STU002', 'ADV001', '2026-09-01', '14:00', 'Room S2-301', 'completed', 1, 0, NULL, '2026-08-25'),
('APT003', 'REQ005', 'STU005', 'ADV002', '2026-08-28', '09:30', 'Room S2-205', 'completed', 1, 0, NULL, '2026-08-20'),
('APT004', 'REQ006', 'STU006', 'ADV002', '2026-09-15', '10:00', 'Room S2-205', 'scheduled', 0, 0, NULL, '2026-09-03'),
('APT005', 'REQ007', 'STU007', 'ADV003', '2026-09-01', '14:00', 'Room S2-108', 'completed', 1, 0, NULL, '2026-08-25');

-- 5. Advising Sessions
INSERT OR IGNORE INTO advising_sessions (id, request_id, appointment_id, student_id, advisor_id, session_date, summary, problem, advice, actions_taken, outcome, created_at) VALUES
('SES001', 'REQ002', 'APT002', 'STU002', 'ADV001', '2026-09-01', 'Scholarship renewal form signed and returned. Discussed maintaining GPA requirements for scholarship retention.', 'Student needed advisor signature on scholarship renewal form before deadline.', 'Maintain GPA above 3.00. Consider taking lighter course load next semester if needed.', 'Signed scholarship renewal form. Reviewed student transcript.', 'Form signed. Student will submit to scholarship office.', '2026-09-01'),
('SES002', 'REQ005', 'APT003', 'STU005', 'ADV002', '2026-08-28', 'Registration hold resolved. Issue was due to missing health checkup form. Assisted student with proper documentation.', 'Student had a registration hold preventing course enrollment.', 'Submit health checkup form to student affairs. Check registration system after 24 hours.', 'Called Student Affairs to expedite hold removal. Helped student fill out health form.', 'Hold removed within 24 hours. Student successfully registered.', '2026-08-28'),
('SES003', 'REQ007', 'APT005', 'STU007', 'ADV003', '2026-09-01', 'Discussed financial aid options. Student is eligible for emergency fund and work-study program.', 'Student facing difficulty paying tuition fees for current semester.', 'Apply for emergency financial aid fund. Consider university work-study program for additional income.', 'Provided emergency fund application form. Referred to Financial Office for payment plan options.', 'Student will apply for emergency fund. Referral sent to Financial Office.', '2026-09-01');

-- 6. Follow-ups
INSERT OR IGNORE INTO follow_ups (id, session_id, request_id, student_id, advisor_id, task, due_date, status, completed_at, created_at) VALUES
('FOL001', 'SES001', 'REQ002', 'STU002', 'ADV001', 'Submit signed scholarship form to the Student Affairs Office (Room E-102)', '2026-09-15', 'completed', '2026-09-05', '2026-09-01'),
('FOL002', 'SES001', 'REQ002', 'STU002', 'ADV001', 'Send confirmation of scholarship renewal receipt to advisor', '2026-09-25', 'pending', NULL, '2026-09-01'),
('FOL003', 'SES002', 'REQ005', 'STU005', 'ADV002', 'Verify course registration is complete and all required courses are enrolled', '2026-09-05', 'completed', '2026-08-30', '2026-08-28'),
('FOL004', 'SES003', 'REQ007', 'STU007', 'ADV003', 'Complete emergency financial aid application and submit supporting documents', '2026-09-18', 'in_progress', NULL, '2026-09-01'),
('FOL005', 'SES003', 'REQ007', 'STU007', 'ADV003', 'Follow up with Financial Office regarding installment payment plan approval', '2026-09-22', 'pending', NULL, '2026-09-01'),
('FOL006', NULL, 'REQ001', 'STU001', 'ADV001', 'Attend study skill workshop on time management (organized by ADT school)', '2026-09-20', 'pending', NULL, '2026-08-30'),
('FOL007', NULL, 'REQ004', 'STU004', 'ADV002', 'Update resume with recent project portfolio and send draft to advisor', '2026-09-16', 'in_progress', NULL, '2026-08-26');

-- 7. Follow-up Progress
INSERT OR IGNORE INTO follow_up_progress (id, follow_up_id, student_id, progress, notes, status, created_at) VALUES
('FUP001', 'FOL001', 'STU002', 100, 'Submitted on Sep 5. Received acknowledgment receipt from officer Khun Malee.', 'reviewed', '2026-09-05'),
('FUP002', 'FOL004', 'STU007', 60, 'Completed online form. Waiting for parent income tax certificate.', 'in_progress', '2026-09-08'),
('FUP003', 'FOL007', 'STU004', 75, 'Resume updated with capstone project. Adding GitHub link.', 'in_progress', '2026-09-09');

-- 8. Exit Cases
INSERT OR IGNORE INTO exit_cases (id, student_id, advisor_id, exit_type, reason_code, reason_category, details, documents, advisor_assessment, status, pdpa_consent, voice_survey_completed, created_at, updated_at) VALUES
('EXT001', 'STU006', 'ADV002', 'leave_of_absence', 'family_obligation', 'personal', 'Need to take care of elderly parents in Chiang Mai after sudden illness.', '["medical_leave_proof.pdf"]', 'Student has solid GPA 3.40. Strongly recommend approving temporary leave of absence for 1 semester with planned re-entry.', 'advisor_reviewed', 1, 1, '2026-09-02', '2026-09-04'),
('EXT002', 'STU009', 'ADV003', 'withdrawal', 'academic_foundation', 'academic', 'Struggling with core programming foundation courses. Found interest in communication arts.', '["transcript.pdf"]', 'Student has made considered choice to transition to Mass Communication. Foundation gap in Java programming was primary hurdle.', 'submitted', 1, 0, '2026-09-03', '2026-09-03');

-- 9. Audit Logs
INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, user_role, action, description, target_id, timestamp, ip_address) VALUES
('LOG001', 'ADM001', 'Supattra Kaewmanee', 'admin', 'system_initialized', 'Database tables and initial system seed loaded successfully', 'SYSTEM', '2026-09-20 08:00:00', '127.0.0.1');

-- 10. Advising Categories
INSERT OR IGNORE INTO advising_category_configs (id, value, label_th, label_en, sub_categories, is_active, created_at, updated_at) VALUES
('CAT001', 'academic_performance', 'ผลการเรียนและพัฒนาการทางการศึกษา', 'Academic Performance & Progress', '["gpa_improvement","study_plan","probation_support","honors_guidance"]', 1, '2024-06-01', '2024-06-01'),
('CAT002', 'course_enrollment', 'การลงทะเบียนเรียนและแผนการเรียน', 'Course Enrollment & Study Plan', '["course_prerequisites","overload_request","schedule_conflict","general_education"]', 1, '2024-06-01', '2024-06-01'),
('CAT003', 'scholarship_financial', 'ทุนการศึกษาและภาระค่าใช้จ่าย', 'Scholarships & Financial Support', '["scholarship_renewal","emergency_fund","student_loan","tuition_installment"]', 1, '2024-06-01', '2024-06-01'),
('CAT004', 'career_internship', 'การฝึกงานและการเตรียมพร้อมสู่อาชีพ', 'Internship & Career Readiness', '["summer_internship","coop_program","portfolio_review","industry_mentorship"]', 1, '2024-06-01', '2024-06-01'),
('CAT005', 'wellbeing_adjustment', 'การปรับตัวและสุขภาวะในการใช้ชีวิต', 'Adjustment & Student Well-being', '["university_life","stress_management","living_support","peer_relations"]', 1, '2024-06-01', '2024-06-01'),
('CAT006', 'withdrawal_leave', 'การลาพักการศึกษาหรือลาออก', 'Leave of Absence / Withdrawal', '["temporary_leave","major_transfer","university_withdrawal","academic_restart"]', 1, '2024-06-01', '2024-06-01'),
('CAT007', 'other', 'เรื่องอื่นๆ', 'Other Inquiries', '["general_inquiry","special_request"]', 1, '2024-06-01', '2024-06-01');

-- 11. Document Types
INSERT OR IGNORE INTO document_type_configs (id, name, label_th, label_en, allowed_formats, max_size_mb, is_required, is_active, created_at, updated_at) VALUES
('DT001', 'transcript', 'ใบรายงานผลการศึกษา (Transcript)', 'Official / Unofficial Transcript', '["PDF","PNG","JPG"]', 10, 0, 1, '2024-06-01', '2024-06-01'),
('DT002', 'scholarship_form', 'แบบฟอร์มขอรับ/ต่ออายุทุนการศึกษา', 'Scholarship Application/Renewal Form', '["PDF","DOCX"]', 15, 0, 1, '2024-06-01', '2024-06-01'),
('DT003', 'leave_request', 'คำร้องขอลาพักการศึกษา (Leave Form)', 'Leave of Absence Petition', '["PDF"]', 10, 1, 1, '2024-06-01', '2024-06-01'),
('DT004', 'drop_form', 'คำร้องขอถอนรายวิชา (Drop Form)', 'Course Withdrawal Petition', '["PDF"]', 10, 1, 1, '2024-06-01', '2024-06-01'),
('DT005', 'medical_certificate', 'ใบรับรองแพทย์ (Medical Certificate)', 'Medical Certificate / Health Proof', '["PDF","JPG","PNG"]', 10, 0, 1, '2024-06-01', '2024-06-01'),
('DT006', 'resume_cv', 'ประวัติย่อ / เรซูเม่ (Resume/CV)', 'Resume / Curriculum Vitae', '["PDF"]', 10, 0, 1, '2024-06-01', '2024-06-01'),
('DT007', 'other_document', 'เอกสารอื่นๆ', 'Other Supporting Documents', '["PDF","JPG","PNG","DOCX"]', 20, 0, 1, '2024-06-01', '2024-06-01');

