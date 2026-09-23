// ============================================================
// AdvisingLog — Mock Data
// Realistic, connected data for all demo roles
// ============================================================

import type {
  User,
  StudentAdvisorAssignment,
  AdvisingRequest,
  RequestProgress,
  Appointment,
  AdvisingSession,
  FollowUp,
  Referral,
  AdvisingCategoryConfig,
  DocumentType,
  StudentDocument,
  Notification,
  EarlyWarningCase,
  EarlyWarningFollowUp,
  ExitCase,
  FollowUpProgress,
  AdvisorExitAssessment,
  StudentVoiceResponse,
  AuditLog,
} from '@/types'

// --- Users ---

export const mockUsers: User[] = [
  // Students
  { id: 'STU001', code: '6631503001', name: 'Somchai Jaidee', email: 'somchai.j@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5601', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU002', code: '6631503002', name: 'Ploy Srisuk', email: 'ploy.s@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5602', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU003', code: '6631503003', name: 'Nattapong Wongchai', email: 'nattapong.w@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5603', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU004', code: '6631503004', name: 'Kannika Thongkam', email: 'kannika.t@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5604', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU005', code: '6631503005', name: 'Arthit Phanit', email: 'arthit.p@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5605', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU006', code: '6631503006', name: 'Siriporn Meechai', email: 'siriporn.m@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5606', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU007', code: '6631503007', name: 'Tanawat Rungroj', email: 'tanawat.r@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5607', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU008', code: '6631503008', name: 'Pimchanok Saetang', email: 'pimchanok.s@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5608', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU009', code: '6631503009', name: 'Kittipat Somboon', email: 'kittipat.s@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5609', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU010', code: '6631503010', name: 'Waraporn Chantara', email: 'waraporn.c@student.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5610', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  { id: 'STU_WORANUT', code: '6631503036', name: 'Woranut Khwanpongdee', email: '6631503036@lamduan.mfu.ac.th', role: 'student', department: 'School of Applied Digital Technology (ADT)', phone: '081-234-5636', isActive: true, hasAiAccess: false, createdAt: '2024-06-01' },
  // Advisors
  { id: 'ADV001', code: 'EMP-1001', name: 'Dr. Prasit Kanchanawat', email: 'prasit.k@mfu.ac.th', role: 'advisor', department: 'School of Applied Digital Technology (ADT)', phone: '053-916-001', isActive: true, hasAiAccess: true, createdAt: '2020-01-15' },
  { id: 'ADV002', code: 'EMP-1002', name: 'Dr. Wipawan Buathong', email: 'wipawan.b@mfu.ac.th', role: 'advisor', department: 'School of Applied Digital Technology (ADT)', phone: '053-916-002', isActive: true, hasAiAccess: false, createdAt: '2019-08-01' },
  { id: 'ADV003', code: 'EMP-1003', name: 'Dr. Chaiwat Namsai', email: 'chaiwat.n@mfu.ac.th', role: 'advisor', department: 'School of Applied Digital Technology (ADT)', phone: '053-916-003', isActive: true, hasAiAccess: false, createdAt: '2021-01-10' },
  // QA Chair
  { id: 'QA001', code: 'EMP-2001', name: 'Assoc. Prof. Rattana Pongsakorn', email: 'rattana.p@mfu.ac.th', role: 'qa_chair', department: 'School of Applied Digital Technology (ADT)', phone: '053-916-010', isActive: true, hasAiAccess: true, createdAt: '2018-01-01' },
  // Admin
  { id: 'ADM001', code: 'EMP-3001', name: 'Supattra Kaewmanee', email: 'supattra.k@mfu.ac.th', role: 'admin', department: 'Academic Affairs', phone: '053-916-020', isActive: true, hasAiAccess: true, createdAt: '2019-03-01' },
]


// --- Student–Advisor Roster ---

export const mockRoster: StudentAdvisorAssignment[] = [
  { id: 'R001', studentId: 'STU001', advisorId: 'ADV001', assignedAt: '2024-06-15', isActive: true },
  { id: 'R002', studentId: 'STU002', advisorId: 'ADV001', assignedAt: '2024-06-15', isActive: true },
  { id: 'R003', studentId: 'STU003', advisorId: 'ADV001', assignedAt: '2024-06-15', isActive: true },
  { id: 'R004', studentId: 'STU004', advisorId: 'ADV002', assignedAt: '2024-06-15', isActive: true },
  { id: 'R005', studentId: 'STU005', advisorId: 'ADV002', assignedAt: '2024-06-15', isActive: true },
  { id: 'R006', studentId: 'STU006', advisorId: 'ADV002', assignedAt: '2024-06-15', isActive: true },
  { id: 'R007', studentId: 'STU007', advisorId: 'ADV003', assignedAt: '2024-06-15', isActive: true },
  { id: 'R008', studentId: 'STU008', advisorId: 'ADV003', assignedAt: '2024-06-15', isActive: true },
  { id: 'R009', studentId: 'STU009', advisorId: 'ADV003', assignedAt: '2024-06-15', isActive: true },
  { id: 'R010', studentId: 'STU010', advisorId: 'ADV001', assignedAt: '2024-06-15', isActive: true },
  { id: 'R_WORANUT', studentId: 'STU_WORANUT', advisorId: 'ADV001', assignedAt: '2024-06-15', isActive: true },
]

// --- Advising Requests ---

export const mockRequests: AdvisingRequest[] = [
  { id: 'REQ001', studentId: 'STU001', advisorId: 'ADV001', category: 'academic_performance', details: 'I received a warning letter about my GPA dropping below 2.00 this semester. I need guidance on course selection for next semester to recover.', preferredDate: '2026-09-10', preferredTime: '10:00', attachments: ['gpa_report.pdf'], pdpaConsent: true, status: 'scheduled', createdAt: '2026-08-28', updatedAt: '2026-08-30' },
  { id: 'REQ002', studentId: 'STU002', advisorId: 'ADV001', category: 'scholarship_document', details: 'I need my advisor to sign a scholarship renewal form. The deadline is September 20.', preferredDate: '2026-09-05', preferredTime: '14:00', attachments: ['scholarship_form.pdf'], pdpaConsent: true, status: 'completed', createdAt: '2026-08-20', updatedAt: '2026-09-01' },
  { id: 'REQ003', studentId: 'STU003', advisorId: 'ADV001', category: 'personal', details: 'I have been feeling overwhelmed and want to discuss my academic workload and personal situation.', preferredDate: '2026-09-12', preferredTime: '11:00', attachments: [], pdpaConsent: true, status: 'requested', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
  { id: 'REQ004', studentId: 'STU004', advisorId: 'ADV002', category: 'internship_career', details: 'I want to discuss internship opportunities for the upcoming summer semester and get recommendation letters.', preferredDate: '2026-09-08', preferredTime: '13:00', attachments: ['resume.pdf'], pdpaConsent: true, status: 'pending', createdAt: '2026-08-25', updatedAt: '2026-08-26' },
  { id: 'REQ005', studentId: 'STU005', advisorId: 'ADV002', category: 'registration', details: 'I need help resolving a registration hold on my account. I cannot register for next semester courses.', preferredDate: '2026-09-03', preferredTime: '09:00', attachments: [], pdpaConsent: true, status: 'completed', createdAt: '2026-08-18', updatedAt: '2026-08-28' },
  { id: 'REQ006', studentId: 'STU006', advisorId: 'ADV002', category: 'withdrawal_leave', details: 'I am considering taking a leave of absence due to family circumstances. I need to understand the process and implications.', preferredDate: '2026-09-15', preferredTime: '10:00', attachments: [], pdpaConsent: true, status: 'scheduled', createdAt: '2026-09-02', updatedAt: '2026-09-03' },
  { id: 'REQ007', studentId: 'STU007', advisorId: 'ADV003', category: 'financial', details: 'I am having difficulty paying tuition fees. I would like to discuss financial aid options and payment plans.', preferredDate: '2026-09-06', preferredTime: '14:00', attachments: [], pdpaConsent: true, status: 'completed', createdAt: '2026-08-22', updatedAt: '2026-09-01' },
  { id: 'REQ008', studentId: 'STU008', advisorId: 'ADV003', category: 'student_status', details: 'I need to clarify my student status. I received conflicting information about my enrollment status from different offices.', preferredDate: '2026-09-11', preferredTime: '15:00', attachments: ['enrollment_letter.pdf'], pdpaConsent: true, status: 'requested', createdAt: '2026-09-02', updatedAt: '2026-09-02' },
  { id: 'REQ009', studentId: 'STU010', advisorId: 'ADV001', category: 'academic_performance', details: 'I want to discuss strategies to improve my grades in core courses. I am struggling with the programming modules.', preferredDate: '2026-09-14', preferredTime: '11:00', attachments: [], pdpaConsent: true, status: 'requested', createdAt: '2026-09-03', updatedAt: '2026-09-03' },
]

// --- Request Progress Tracking ---

export const mockRequestProgress: RequestProgress[] = [
  {
    id: 'RGP001',
    requestId: 'REQ008',
    advisorId: 'ADV003',
    progress: 50,
    notes: 'Contacted student affairs office to verify enrollment status. Found discrepancy in system records.',
    status: 'in_progress',
    createdAt: '2026-09-04',
  },
  {
    id: 'RGP002',
    requestId: 'REQ009',
    advisorId: 'ADV001',
    progress: 30,
    notes: 'Reviewed student transcript. Identified weak performance in programming courses.',
    status: 'in_progress',
    createdAt: '2026-09-05',
  },
]

// --- Appointments ---

export const mockAppointments: Appointment[] = [
  { id: 'APT001', requestId: 'REQ001', studentId: 'STU001', advisorId: 'ADV001', scheduledDate: '2026-09-10', scheduledTime: '10:00', location: 'Room S2-301', status: 'scheduled', studentConfirmed: false, studentDeclined: false, studentDeclineReason: undefined, createdAt: '2026-08-30' },
  { id: 'APT002', requestId: 'REQ002', studentId: 'STU002', advisorId: 'ADV001', scheduledDate: '2026-09-01', scheduledTime: '14:00', location: 'Room S2-301', status: 'completed', studentConfirmed: true, studentDeclined: false, studentDeclineReason: undefined, createdAt: '2026-08-25' },
  { id: 'APT003', requestId: 'REQ005', studentId: 'STU005', advisorId: 'ADV002', scheduledDate: '2026-08-28', scheduledTime: '09:30', location: 'Room S2-205', status: 'completed', studentConfirmed: true, studentDeclined: false, studentDeclineReason: undefined, createdAt: '2026-08-20' },
  { id: 'APT004', requestId: 'REQ006', studentId: 'STU006', advisorId: 'ADV002', scheduledDate: '2026-09-15', scheduledTime: '10:00', location: 'Room S2-205', status: 'scheduled', studentConfirmed: false, studentDeclined: false, studentDeclineReason: undefined, createdAt: '2026-09-03' },
  { id: 'APT005', requestId: 'REQ007', studentId: 'STU007', advisorId: 'ADV003', scheduledDate: '2026-09-01', scheduledTime: '14:00', location: 'Room S2-108', status: 'completed', studentConfirmed: true, studentDeclined: false, studentDeclineReason: undefined, createdAt: '2026-08-25' },
]

// --- Advising Sessions (completed) ---

export const mockSessions: AdvisingSession[] = [
  { id: 'SES001', requestId: 'REQ002', appointmentId: 'APT002', studentId: 'STU002', advisorId: 'ADV001', sessionDate: '2026-09-01', summary: 'Scholarship renewal form signed and returned. Discussed maintaining GPA requirements for scholarship retention.', problem: 'Student needed advisor signature on scholarship renewal form before deadline.', advice: 'Maintain GPA above 3.00. Consider taking lighter course load next semester if needed.', actionsTaken: 'Signed scholarship renewal form. Reviewed student transcript.', outcome: 'Form signed. Student will submit to scholarship office.', createdAt: '2026-09-01' },
  { id: 'SES002', requestId: 'REQ005', appointmentId: 'APT003', studentId: 'STU005', advisorId: 'ADV002', sessionDate: '2026-08-28', summary: 'Registration hold resolved. Issue was due to missing health checkup form. Assisted student with proper documentation.', problem: 'Student had a registration hold preventing course enrollment.', advice: 'Submit health checkup form to student affairs. Check registration system after 24 hours.', actionsTaken: 'Called Student Affairs to expedite hold removal. Helped student fill out health form.', outcome: 'Hold removed within 24 hours. Student successfully registered.', createdAt: '2026-08-28' },
  { id: 'SES003', requestId: 'REQ007', appointmentId: 'APT005', studentId: 'STU007', advisorId: 'ADV003', sessionDate: '2026-09-01', summary: 'Discussed financial aid options. Student is eligible for emergency fund and work-study program.', problem: 'Student facing difficulty paying tuition fees for current semester.', advice: 'Apply for emergency financial aid fund. Consider university work-study program for additional income.', actionsTaken: 'Provided emergency fund application form. Referred to Financial Office for payment plan options.', outcome: 'Student will apply for emergency fund. Referral sent to Financial Office.', createdAt: '2026-09-01' },
]

// --- Follow-ups ---

export const mockFollowUps: FollowUp[] = [
  { id: 'FU001', sessionId: 'SES001', requestId: 'REQ002', studentId: 'STU002', advisorId: 'ADV001', task: 'Submit scholarship renewal form to Scholarship Office', dueDate: '2026-09-10', status: 'completed', completedAt: '2026-09-03', createdAt: '2026-09-01' },
  { id: 'FU002', sessionId: 'SES002', requestId: 'REQ005', studentId: 'STU005', advisorId: 'ADV002', task: 'Verify course registration is complete after hold removal', dueDate: '2026-09-05', status: 'completed', completedAt: '2026-08-30', createdAt: '2026-08-28' },
  { id: 'FU003', sessionId: 'SES003', requestId: 'REQ007', studentId: 'STU007', advisorId: 'ADV003', task: 'Submit emergency financial aid application', dueDate: '2026-09-15', status: 'pending', createdAt: '2026-09-01' },
  { id: 'FU004', sessionId: 'SES003', requestId: 'REQ007', studentId: 'STU007', advisorId: 'ADV003', task: 'Visit Financial Office to set up payment plan', dueDate: '2026-09-10', status: 'in_progress', createdAt: '2026-09-01' },
  // Follow-ups for STU001 (Somchai Jaidee)
  { id: 'FU005', sessionId: 'SES004', requestId: 'REQ001', studentId: 'STU001', advisorId: 'ADV001', task: 'Complete course add/drop form and submit to Registrar', dueDate: '2026-09-08', status: 'pending', createdAt: '2026-09-02' },
  { id: 'FU006', sessionId: 'SES004', requestId: 'REQ001', studentId: 'STU001', advisorId: 'ADV001', task: 'Meet with academic support center for tutoring', dueDate: '2026-09-12', status: 'pending', createdAt: '2026-09-02' },
  // Follow-ups for STU003 (Nattapong Wongchai)
  { id: 'FU007', sessionId: 'SES005', requestId: 'REQ003', studentId: 'STU003', advisorId: 'ADV001', task: 'Contact counseling center to arrange session', dueDate: '2026-09-06', status: 'in_progress', createdAt: '2026-09-01' },
  // Follow-ups for STU004 (Kannika Thongkam)
  { id: 'FU008', sessionId: 'SES006', requestId: 'REQ004', studentId: 'STU004', advisorId: 'ADV002', task: 'Prepare internship application documents', dueDate: '2026-09-20', status: 'pending', createdAt: '2026-09-02' },
  // Follow-ups for STU006 (Siriporn Meechai)
  { id: 'FU009', sessionId: 'SES007', requestId: 'REQ006', studentId: 'STU006', advisorId: 'ADV002', task: 'Submit leave of absence form with supporting documents', dueDate: '2026-09-11', status: 'pending', createdAt: '2026-09-01' },
]

// --- Follow-up Progress Tracking ---

export const mockFollowUpProgress: FollowUpProgress[] = [
  {
    id: 'FUP001',
    followUpId: 'FU004',
    studentId: 'STU007',
    progress: 60,
    notes: 'Met with Financial Office, paperwork submitted. Waiting for approval.',
    status: 'in_progress',
    createdAt: '2026-09-05',
  },
  {
    id: 'FUP002',
    followUpId: 'FU007',
    studentId: 'STU003',
    progress: 30,
    notes: 'Called counseling center, appointment scheduled for next week.',
    status: 'in_progress',
    createdAt: '2026-09-04',
  },
]

// --- Referrals ---

export const mockReferrals: Referral[] = [
  { id: 'REF001', sessionId: 'SES003', studentId: 'STU007', advisorId: 'ADV003', reason: 'Student needs financial assistance and payment plan options.', destination: 'finance_accounting', status: 'referred', referredAt: '2026-09-01', createdAt: '2026-09-01' },
]

// --- Category Config ---

export const mockCategoryConfigs: AdvisingCategoryConfig[] = [
  { id: 'CAT001', value: 'scholarship_document', label: 'Scholarship / Document Signing', subCategories: ['Scholarship Renewal', 'Recommendation Letter', 'Certificate Request', 'Transcript Request'], isActive: true },
  { id: 'CAT002', value: 'financial', label: 'Financial Issues', subCategories: ['Tuition Payment', 'Financial Aid', 'Emergency Fund', 'Work-Study'], isActive: true },
  { id: 'CAT003', value: 'registration', label: 'Registration', subCategories: ['Course Registration', 'Add/Drop', 'Registration Hold', 'Section Change'], isActive: true },
  { id: 'CAT004', value: 'student_status', label: 'Student Status', subCategories: ['Enrollment Verification', 'Status Change', 'Readmission'], isActive: true },
  { id: 'CAT005', value: 'academic_performance', label: 'Academic Performance / GPA / Probation', subCategories: ['GPA Recovery Plan', 'Probation Counseling', 'Course Planning', 'Academic Support'], isActive: true },
  { id: 'CAT006', value: 'internship_career', label: 'Internship / Cooperative Education / Career', subCategories: ['Internship Search', 'Co-op Placement', 'Career Guidance', 'Recommendation'], isActive: true },
  { id: 'CAT007', value: 'personal', label: 'Personal Issues', subCategories: ['Stress / Wellbeing', 'Conflict Resolution', 'Accommodation', 'General Guidance'], isActive: true },
  { id: 'CAT008', value: 'withdrawal_leave', label: 'Withdrawal / Leave of Absence', subCategories: ['Temporary Leave', 'Permanent Withdrawal', 'Transfer Out'], isActive: true },
]

// --- Document Types ---

export const mockDocumentTypes: DocumentType[] = [
  { id: 'DT001', name: 'Scholarship Renewal Form', signatureMethod: 'wet_signature', isActive: true },
  { id: 'DT002', name: 'Leave of Absence Form', signatureMethod: 'wet_signature', isActive: true },
  { id: 'DT003', name: 'Internship Agreement', signatureMethod: 'e_signature', isActive: true },
  { id: 'DT004', name: 'Course Add/Drop Form', signatureMethod: 'e_signature', isActive: true },
  { id: 'DT005', name: 'Withdrawal Form', signatureMethod: 'wet_signature', isActive: true },
  { id: 'DT006', name: 'Recommendation Request', signatureMethod: 'e_signature', isActive: true },
]

// --- Student Documents ---

export const mockStudentDocuments: StudentDocument[] = [
  { id: 'DOC001', studentId: 'STU002', documentTypeId: 'DT001', documentName: 'Scholarship Renewal Form', fileName: 'scholarship_form_signed.pdf', status: 'signed', signatureMethod: 'wet_signature', uploadedAt: '2026-08-25', signedAt: '2026-09-01' },
  { id: 'DOC002', studentId: 'STU006', documentTypeId: 'DT002', documentName: 'Leave of Absence Form', status: 'required', signatureMethod: 'wet_signature' },
  { id: 'DOC003', studentId: 'STU004', documentTypeId: 'DT003', documentName: 'Internship Agreement', fileName: 'internship_agreement.pdf', status: 'uploaded', signatureMethod: 'e_signature', uploadedAt: '2026-08-30' },
  { id: 'DOC004', studentId: 'STU001', documentTypeId: 'DT004', documentName: 'Course Add/Drop Form', status: 'required', signatureMethod: 'e_signature' },
]

// --- Notifications ---

export const mockNotifications: Notification[] = [
  { id: 'NOT001', userId: 'STU001', type: 'info', title: 'Appointment Scheduled', message: 'Your advising appointment has been scheduled for September 10, 2026 at 10:00 AM in Room S2-301.', relatedId: 'APT001', isRead: false, createdAt: '2026-08-30' },
  { id: 'NOT002', userId: 'STU001', type: 'action_required', title: 'Follow-up Required', message: 'Please complete the course add/drop form before the deadline.', relatedId: 'DOC004', isRead: false, createdAt: '2026-09-01' },
  { id: 'NOT003', userId: 'STU002', type: 'success', title: 'Follow-up Completed', message: 'Your scholarship renewal form has been submitted successfully.', relatedId: 'FU001', isRead: true, createdAt: '2026-09-03' },
  { id: 'NOT004', userId: 'ADV001', type: 'action_required', title: 'New Advising Request', message: 'Nattapong Wongchai (6631503003) has submitted a new advising request regarding personal issues.', relatedId: 'REQ003', isRead: false, createdAt: '2026-09-01' },
  { id: 'NOT005', userId: 'ADV001', type: 'action_required', title: 'New Advising Request', message: 'Waraporn Chantara (6631503010) has submitted a new advising request regarding academic performance.', relatedId: 'REQ009', isRead: false, createdAt: '2026-09-03' },
  { id: 'NOT006', userId: 'STU006', type: 'info', title: 'Appointment Scheduled', message: 'Your advising appointment has been scheduled for September 15, 2026 at 10:00 AM in Room S2-205.', relatedId: 'APT004', isRead: false, createdAt: '2026-09-03' },
  { id: 'NOT007', userId: 'STU007', type: 'warning', title: 'Follow-up Due Soon', message: 'Your follow-up task "Submit emergency financial aid application" is due on September 15.', relatedId: 'FU003', isRead: false, createdAt: '2026-09-08' },
  { id: 'NOT008', userId: 'ADV002', type: 'action_required', title: 'Pending Request', message: 'Kannika Thongkam (6631503004) has a pending advising request about internship/career that needs review.', relatedId: 'REQ004', isRead: false, createdAt: '2026-08-26' },
]

// --- Early Warning Cases ---

export const mockEarlyWarnings: EarlyWarningCase[] = [
  { id: 'EW001', studentId: 'STU001', advisorId: 'ADV001', warningType: 'academic_risk', severity: 'high', description: 'Student GPA dropped below 2.00. Received academic warning letter. At risk of probation if GPA does not improve next semester.', dateDetected: '2026-08-25', recommendedAction: 'Schedule advising session to create GPA recovery plan. Consider reduced course load.', followUpDate: '2026-09-15', status: 'active', createdAt: '2026-08-25' },
  { id: 'EW002', studentId: 'STU009', advisorId: 'ADV003', warningType: 'attendance', severity: 'medium', description: 'Student has missed more than 20% of classes in two courses. Pattern started 3 weeks ago.', dateDetected: '2026-08-30', recommendedAction: 'Contact student to check welfare. Schedule meeting to discuss attendance issues.', followUpDate: '2026-09-10', status: 'active', createdAt: '2026-08-30' },
]

// --- Early Warning Follow-Ups ---

export const mockEarlyWarningFollowUps: EarlyWarningFollowUp[] = [
  {
    id: 'EWF001',
    warningId: 'EW001',
    advisorId: 'ADV001',
    notes: 'Met with student to discuss GPA recovery plan. Student agreed to take reduced course load next semester.',
    actionsTaken: 'Created recovery plan with 12 credits instead of 15. Recommended tutoring center for programming course.',
    outcome: 'Student scheduled meeting with academic support center. Will monitor attendance and mid-term grades.',
    followUpDate: '2026-09-15',
    status: 'in_progress',
    createdAt: '2026-09-05',
  },
]

// --- Exit Cases ---

export const mockExitCases: ExitCase[] = [
  {
    id: 'EX001',
    studentId: 'STU006',
    advisorId: 'ADV002',
    exitType: 'leave_of_absence',
    reasonCode: 'personal_family',
    details: 'จำเป็นต้องขอพักการศึกษาชั่วคราว 1 ปีการศึกษา เนื่องจากคุณแม่ตรวจพบอาการป่วยเรื้อรัง ต้องกลับไปช่วยดูแลอย่างใกล้ชิดที่ต่างจังหวัด วางแผนจะกลับมาศึกษาต่อในปีการศึกษาถัดไป',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-10-01',
    status: 'under_review',
    createdAt: '2026-09-02',
    updatedAt: '2026-09-03',
  },
  {
    id: 'EX002',
    studentId: 'STU009',
    advisorId: 'ADV003',
    exitType: 'withdrawal',
    reasonCode: 'academic',
    details: 'วิชาพื้นฐานการเขียนโปรแกรมและการเขียนอัลกอริทึมในปี 1 มีความเร็วและซับซ้อนเกินกว่าความถนัด พยายามทบทวนแล้วแต่ทำข้อสอบกลางภาคได้คะแนนน้อยมาก รู้สึกท้อแท้และค้นพบว่าต้องการย้ายไปเรียนสาย Digital Graphic & Animation',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-09-30',
    status: 'under_review',
    createdAt: '2026-08-29',
    updatedAt: '2026-09-01',
  },
  {
    id: 'EX003',
    studentId: 'STU003',
    advisorId: 'ADV001',
    exitType: 'withdrawal',
    reasonCode: 'financial',
    details: 'ธุรกิจครอบครัวประสบวิกฤตทางการเงินกะทันหัน ไม่สามารถแบกรับค่าครองชีพและค่าเล่าเรียนได้ จำเป็นต้องออกไปทำงานประจำเต็มเวลาเพื่อจุนเจือครอบครัว',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-09-25',
    status: 'under_review',
    createdAt: '2026-08-20',
    updatedAt: '2026-08-28',
  },
  {
    id: 'EX004',
    studentId: 'STU007',
    advisorId: 'ADV003',
    exitType: 'leave_of_absence',
    reasonCode: 'mental_health',
    details: 'มีภาวะความเครียดสะสมรุนแรง วิตกกังวลและนอนไม่หลับเรื้อรังจากภาระการเรียนและการสอบ แพทย์แนะนำให้พักฟื้นและบำบัดจิตใจ 1 ภาคการศึกษาเพื่อฟื้นฟูสุขภาพจิตก่อนกลับมาเรียนต่อ',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-10-15',
    status: 'under_review',
    createdAt: '2026-09-04',
    updatedAt: '2026-09-06',
  },
  {
    id: 'EX005',
    studentId: 'STU004',
    advisorId: 'ADV002',
    exitType: 'withdrawal',
    reasonCode: 'transfer',
    details: 'สอบได้ทุนการศึกษาเต็มจำนวนของมหาวิทยาลัยใกล้ภูมิลำเนา (ภาคใต้) เพื่อลดภาระค่าเดินทางและได้อยู่ดูแลคุณยาย จึงขอยื่นลาออกเพื่อโอนย้ายสถาบัน',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-09-28',
    status: 'under_review',
    createdAt: '2026-08-25',
    updatedAt: '2026-08-30',
  },
  {
    id: 'EX006',
    studentId: 'STU010',
    advisorId: 'ADV001',
    exitType: 'leave_of_absence',
    reasonCode: 'health',
    details: 'ประสบอุบัติเหตุเอ็นข้อเข่าฉีกขาด ต้องรับการผ่าตัดและทำกายภาพบำบัดต่อเนื่อง 4-6 เดือน ไม่สามารถเดินทางขึ้นลงอาคารเรียนได้สะดวก จึงขอพักการศึกษา 1 ภาคการศึกษา',
    dataAnalysisConsent: true,
    preferredEffectiveDate: '2026-10-01',
    status: 'under_review',
    createdAt: '2026-09-05',
    updatedAt: '2026-09-07',
  },
]

// --- Advisor Exit Assessments ---

export const mockAdvisorAssessments: AdvisorExitAssessment[] = [
  {
    id: 'ASS001',
    exitCaseId: 'EX001',
    advisorId: 'ADV002',
    assessment: 'ได้สัมภาษณ์เชิงลึกกับนักศึกษา พบว่ามีภาระต้องดูแลมารดาที่ป่วยจริง นักศึกษามีผลการเรียนดี (GPAX 3.25) และมีความมุ่งมั่นจะกลับมาเรียนต่อให้จบหลักสูตร',
    contributingFactors: 'ภาระการดูแลผู้ป่วยในครอบครัวที่ต่างจังหวัด ขาดคนสลับเปลี่ยนดูแล',
    actionsTaken: 'ชี้แจงขั้นตอนการรักษาสถานภาพนักศึกษา วางแผน Study roadmap เทียบโอนรายวิชาเมื่อกลับมาเรียน',
    referralsMade: 'ประสานงานส่วนทะเบียนและประมวลผล (REG)',
    followUpAttempts: 'โทรติดตามผลและให้กำลังใจ 2 ครั้ง',
    recommendation: 'อนุมัติการลาพักการศึกษา 1 ปีการศึกษา โดยให้อาจารย์ที่ปรึกษาติดต่อเตรียมความพร้อมก่อนเปิดภาคเรียนถัดไป',
    resolution: 'Approved for leave of absence.',
    createdAt: '2026-09-03',
  },
  {
    id: 'ASS002',
    exitCaseId: 'EX002',
    advisorId: 'ADV003',
    assessment: 'นักศึกษาไม่มีพื้นฐานทักษะการเขียนโปรแกรมและการคิดเชิงคำนวณมาก่อน ทำให้เรียนไม่ทันเพื่อนในรายวิชา Foundation ส่งผลให้เกิดความเครียดและหมดไฟในการเรียนอย่างมาก',
    contributingFactors: 'ช่องว่างทักษะพื้นฐาน (Foundation Gap), เนื้อหารายวิชาก้าวกระโดดเร็ว, เป้าหมายอาชีพเบนเข็มไปทาง Digital Design / Media Arts',
    actionsTaken: 'พูดคุยชี้แจงทางเลือกการดรอปรายวิชาและลงเรียนใหม่ แต่เป้าหมายอาชีพของนักศึกษาเปลี่ยนไปอย่างชัดเจน จึงแนะนำกระบวนการเทียบโอนหน่วยกิตวิชาศึกษาทั่วไป',
    referralsMade: 'ฝ่ายแนะแนวอาชีพและส่วนทะเบียน',
    followUpAttempts: 'พูดคุยกับผู้ปกครองและนักศึกษา 2 ครั้ง',
    recommendation: 'เห็นควรอนุมัติการขอลาออก และเสนอแนะให้หลักสูตรพิจารณาจัด Pre-sessional Coding Boot Camp ปรับพื้นฐานสำหรับนักศึกษาใหม่ทุกคน',
    resolution: 'Approved for withdrawal.',
    createdAt: '2026-09-01',
  },
  {
    id: 'ASS003',
    exitCaseId: 'EX003',
    advisorId: 'ADV001',
    assessment: 'นักศึกษาประสบวิกฤตทางการเงินกะทันหันในชั้นปีที่ 3 ครอบครัวสูญเสียรายได้หลัก นักศึกษาต้องรับภาระค่าใช้จ่ายในบ้าน จึงจำเป็นต้องออกไปทำงานประจำ',
    contributingFactors: 'วิกฤตเศรษฐกิจครอบครัว ค่าครองชีพสูง ขาดแคลนทุนการศึกษาฉุกเฉินวงเงินสูงที่อนุมัติได้ทันท่วงที',
    actionsTaken: 'แนะนำการขอทุนฉุกเฉินและงาน Part-time ในสำนักวิชา แต่วงเงินไม่เพียงพอต่อภาระหนี้สินของครอบครัว',
    referralsMade: 'งานทุนการศึกษาและกองทุน กยศ.',
    followUpAttempts: 'พูดคุยกับนักศึกษาเพื่อหาทางเลือกในการลงทะเบียนเรียนแบบ Part-time แต่ระเบียบปัจจุบันยังไม่รองรับ',
    recommendation: 'อนุมัติการขอลาออก และเสนอแนะให้คณะฯ จัดตั้งกองทุนช่วยเหลือนักศึกษาฉุกเฉิน (Emergency Relief Grant) เพื่อลดอัตรา Dropout จากเหตุสุดวิสัย',
    resolution: 'Approved for withdrawal.',
    createdAt: '2026-08-28',
  },
  {
    id: 'ASS004',
    exitCaseId: 'EX004',
    advisorId: 'ADV003',
    assessment: 'นักศึกษามีภาวะ Burnout ขั้นรุนแรงและมีภาวะซึมเศร้าปานกลาง มีใบรับรองแพทย์จากโรงพยาบาลศูนย์การแพทย์ มฟล. ชัดเจนว่าควรหยุดพักการเรียนชั่วคราวเพื่อฟื้นฟูสุขภาพจิต',
    contributingFactors: 'ความกดดันต่อเกรดเฉลี่ยสะสม ภาวะนอนไม่หลับเรื้อรัง และความเครียดจากการแข่งขันในชั้นเรียน',
    actionsTaken: 'ส่งต่อนักศึกษาไปยังหน่วยบริการสุขภาพจิต (MFU Counselling Center) และพูดคุยวางแผนปรับลดจำนวนหน่วยกิตเมื่อกลับมาเรียน',
    referralsMade: 'ศูนย์ให้คำปรึกษาและพัฒนาคุณภาพชีวิตนักศึกษา และโรงพยาบาลศูนย์การแพทย์ มฟล.',
    followUpAttempts: 'นัดหมายพูดคุยติดตามอาการเดือนละ 1 ครั้งระหว่างลาพัก',
    recommendation: 'อนุมัติการลาพักการศึกษา 1 ภาคการศึกษา โดยกำหนดให้อาจารย์ที่ปรึกษาและจิตแพทย์ประเมินความพร้อมก่อนกลับเข้าเรียน',
    resolution: 'Approved for leave of absence.',
    createdAt: '2026-09-06',
  },
  {
    id: 'ASS005',
    exitCaseId: 'EX005',
    advisorId: 'ADV002',
    assessment: 'นักศึกษามีผลการเรียนดีเยี่ยม (GPAX 3.65) ได้รับทุนการศึกษาเต็มจำนวนที่มหาวิทยาลัยใกล้บ้านเพื่อช่วยดูแลผู้สูงอายุ เป็นการตัดสินใจที่มีเหตุผลรองรับชัดเจน',
    contributingFactors: 'ค่าใช้จ่ายในการเดินทางไกล และภาระครอบครัวที่ต้องการให้อยู่ใกล้ภูมิลำเนา',
    actionsTaken: 'ช่วยตรวจสอบและลงนามรับรองเอกสารคำอธิบายรายวิชา (Course Syllabi) เพื่อการเทียบโอนหน่วยกิต',
    referralsMade: 'ส่วนทะเบียนและประมวลผล (REG)',
    followUpAttempts: 'ให้คำปรึกษาเรื่องการเทียบโอน 1 ครั้ง',
    recommendation: 'อนุมัติการลาออกเพื่อโอนย้ายสถาบัน',
    resolution: 'Approved for withdrawal.',
    createdAt: '2026-08-30',
  },
  {
    id: 'ASS006',
    exitCaseId: 'EX006',
    advisorId: 'ADV001',
    assessment: 'นักศึกษาประสบอุบัติเหตุทางกายภาพ มีเอกสารใบรับรองแพทย์และกำหนดการผ่าตัดชัดเจน การเดินทางมาเรียนไม่สามารถทำได้ชั่วคราว',
    contributingFactors: 'อุบัติเหตุทางกายภาพและการผ่าตัดฟื้นฟูสมรรถภาพ 4-6 เดือน',
    actionsTaken: 'ประสานงานส่วนทะเบียนเพื่อขอยกเว้นค่าปรับ และประสานอาจารย์ผู้สอนเพื่อจัดเตรียมคลังสื่อออนไลน์สำหรับการศึกษาด้วยตนเอง',
    referralsMade: 'ส่วนบริการสุขภาพและส่วนทะเบียน',
    followUpAttempts: 'ติดตามอาการหลังการผ่าตัด',
    recommendation: 'อนุมัติการลาพักการศึกษา 1 ภาคการศึกษา',
    resolution: 'Approved for leave of absence.',
    createdAt: '2026-09-07',
  },
]

// --- Student Voice Voluntary Responses (Resignation / Leave) ---

export const mockStudentVoiceResponses: StudentVoiceResponse[] = [
  {
    id: 'SVR001',
    exitCaseId: 'EX001',
    studentId: 'STU006',
    studentCode: '6631503006',
    isAnonymous: false,
    exitType: 'leave_of_absence',
    academicYear: 'Year 2 (ชั้นปีที่ 2)',
    primaryFactors: [
      'ภาระครอบครัว / ส่วนตัว (Family & Personal Circumstances)',
      'ความเครียดและสุขภาพจิต (Mental Health & Stress)',
    ],
    ratings: {
      curriculumRelevance: 4,
      teachingQuality: 4,
      advisorSupport: 5,
      universityServices: 4,
      overallExperience: 4,
    },
    whatCouldUniversityDoBetter: 'อาจารย์ที่ปรึกษา (อ.วิภาวรรณ) ให้ความช่วยเหลือและแนะนำทางเลือกดีมาก แต่ขั้นตอนการยื่นเอกสารขอพักการศึกษาในส่วนกลางของมหาวิทยาลัยค่อนข้างซับซ้อน อยากให้มีระบบออนไลน์ที่เบ็ดเสร็จรวดเร็วกว่านี้',
    curriculumImprovementSuggestions: 'หลักสูตรเนื้อหาดีมาก อยากให้มีคลิปย้อนหลังสำหรับทบทวนเมื่อนักศึกษากลับมาเรียนต่อหลังจากพักการศึกษา',
    adviceForFutureStudents: 'หากมีปัญหาเรื่องครอบครัวหรือความเครียด ให้รีบปรึกษาอาจารย์ที่ปรึกษาตั้งแต่เนิ่นๆ อาจารย์พร้อมรับฟังและหาทางออกให้เสมอ',
    shareWithAdvisor: true,
    createdAt: '2026-09-02T11:30:00',
  },
  {
    id: 'SVR002',
    exitCaseId: 'EX002',
    studentId: 'STU009',
    studentCode: '6631503009',
    isAnonymous: true,
    exitType: 'withdrawal',
    academicYear: 'Year 1 (ชั้นปีที่ 1)',
    primaryFactors: [
      'ความยากของหลักสูตร / ไม่ตรงกับความถนัด (Curriculum Difficulty & Fit)',
      'การสอนและภาระงาน (Teaching Pace & Workload)',
      'เป้าหมายอาชีพเปลี่ยนไป (Career Path Redirection)',
    ],
    ratings: {
      curriculumRelevance: 3,
      teachingQuality: 2,
      advisorSupport: 4,
      universityServices: 3,
      overallExperience: 3,
    },
    whatCouldUniversityDoBetter: 'วิชาพื้นฐานการเขียนโปรแกรมในปี 1 มีความเร็วในการสอนค่อนข้างสูงและภาระการบ้านหนักมากสำหรับคนที่ไม่มีพื้นฐานสายคอมพิวเตอร์มาก่อน อยากให้มีวิชาปรับพื้นฐานหรือติวเสริมแบบเข้มข้น',
    curriculumImprovementSuggestions: 'ควรมี Track หรือวิชาเลือกด้าน Design / UX/UI ที่เน้นปฏิบัติสำหรับคนที่ไม่ถนัดสาย Coding เชิงทฤษฎี',
    adviceForFutureStudents: 'ควรศึกษาหลักสูตรและวิชาบังคับล่วงหน้า และกล้าสอบถามอาจารย์ผู้สอนตั้งแต่สัปดาห์แรกๆ',
    shareWithAdvisor: true,
    createdAt: '2026-08-30T14:15:00',
  },
  {
    id: 'SVR003',
    exitCaseId: 'EX003',
    studentId: 'STU003',
    studentCode: '6631503003',
    isAnonymous: true,
    exitType: 'withdrawal',
    academicYear: 'Year 3 (ชั้นปีที่ 3)',
    primaryFactors: [
      'ปัญหาทางการเงินและค่าครองชีพ (Financial Hardship)',
      'โอกาสในการทำงาน / รายได้ (Employment Opportunity)',
    ],
    ratings: {
      curriculumRelevance: 4,
      teachingQuality: 4,
      advisorSupport: 4,
      universityServices: 3,
      overallExperience: 4,
    },
    whatCouldUniversityDoBetter: 'อยากให้มีทุนการศึกษาฉุกเฉินหรือตำแหน่งงาน Part-time ภายในคณะที่เพียงพอกว่านี้ สำหรับนักศึกษาที่มีปัญหาการเงินกะทันหัน',
    curriculumImprovementSuggestions: 'อยากให้หลักสูตรมีความยืดหยุ่น เช่น การเรียนแบบ Hybrid หรือรายวิชาแบบ Modular ที่สามารถทำงานควบคู่กับการเรียนได้',
    adviceForFutureStudents: 'วางแผนการเงินและทุนการศึกษาตั้งแต่เนิ่นๆ หากเริ่มมีปัญหาให้ติดต่อหน่วยทุนของสำนักวิชาทันที',
    shareWithAdvisor: false,
    createdAt: '2026-08-22T09:45:00',
  },
  {
    id: 'SVR004',
    exitCaseId: 'EX004',
    studentId: 'STU007',
    studentCode: '6631503007',
    isAnonymous: false,
    exitType: 'leave_of_absence',
    academicYear: 'Year 2 (ชั้นปีที่ 2)',
    primaryFactors: [
      'ความเครียดและสุขภาพจิต (Mental Health & Stress)',
      'การสอนและภาระงาน (Teaching Pace & Workload)',
    ],
    ratings: {
      curriculumRelevance: 3,
      teachingQuality: 3,
      advisorSupport: 5,
      universityServices: 4,
      overallExperience: 3,
    },
    whatCouldUniversityDoBetter: 'อยากให้อาจารย์ผู้สอนแต่ละวิชามีการประสานกำหนดการส่งงานไม่ให้กระจุกตัวพร้อมกันในช่วงก่อนสอบ เพราะทำให้นักศึกษาเกิดภาวะนอนไม่หลับและความเครียดสูงมาก',
    curriculumImprovementSuggestions: 'ควรมีกิจกรรม Workshop ด้าน Work-Life Balance และทักษะการจัดการความเครียดในวิชาสัมมนา',
    adviceForFutureStudents: 'เมื่อรู้สึกว่าจิตใจเริ่มไม่ไหว อย่าเก็บไว้คนเดียว ให้เปิดใจปรึกษาอาจารย์หรือศูนย์สุขภาพจิตของมหาวิทยาลัยทันที',
    shareWithAdvisor: true,
    createdAt: '2026-09-04T16:20:00',
  },
  {
    id: 'SVR005',
    exitCaseId: 'EX005',
    studentId: 'STU004',
    studentCode: '6631503004',
    isAnonymous: false,
    exitType: 'withdrawal',
    academicYear: 'Year 1 (ชั้นปีที่ 1)',
    primaryFactors: [
      'ภาระครอบครัว / ส่วนตัว (Family & Personal Circumstances)',
      'ปัญหาทางการเงินและค่าครองชีพ (Financial Hardship)',
    ],
    ratings: {
      curriculumRelevance: 5,
      teachingQuality: 5,
      advisorSupport: 5,
      universityServices: 4,
      overallExperience: 5,
    },
    whatCouldUniversityDoBetter: 'ทุกอย่างของ มฟล. ดีมากทั้งบรรยากาศและอาจารย์ แต่ด้วยระยะทางที่ไกลจากบ้านทางใต้และค่าตั๋วเครื่องบินที่สูง จึงตัดสินใจย้ายเพื่อลดภาระคุณพ่อคุณแม่',
    curriculumImprovementSuggestions: 'หลักสูตรทันสมัยและดีมากอยู่แล้ว อยากให้รักษามาตรฐานนี้ต่อไป',
    adviceForFutureStudents: 'เตรียมความพร้อมเรื่องค่าใช้จ่ายในการเดินทางและความพร้อมในการอยู่ไกลบ้าน',
    shareWithAdvisor: true,
    createdAt: '2026-08-26T10:00:00',
  },
  {
    id: 'SVR006',
    exitCaseId: 'EX006',
    studentId: 'STU010',
    studentCode: '6631503010',
    isAnonymous: false,
    exitType: 'leave_of_absence',
    academicYear: 'Year 2 (ชั้นปีที่ 2)',
    primaryFactors: [
      'ปัญหาสุขภาพทางกาย (Physical Health)',
    ],
    ratings: {
      curriculumRelevance: 5,
      teachingQuality: 4,
      advisorSupport: 5,
      universityServices: 5,
      overallExperience: 5,
    },
    whatCouldUniversityDoBetter: 'เจ้าหน้าที่ส่วนทะเบียนและอาจารย์ที่ปรึกษาช่วยดำเนินการเรื่องเอกสารการลาพักป่วยอย่างรวดเร็วและให้กำลังใจดีมาก',
    curriculumImprovementSuggestions: 'อยากให้มีระบบบันทึกเทปบรรยาย (Lecture Recording) อัปโหลดบน Moodle เพื่อให้นักศึกษาที่พักป่วยสามารถทบทวนเนื้อหาระหว่างพักฟื้นได้',
    adviceForFutureStudents: 'รักษาสุขภาพและความปลอดภัยเป็นอันดับหนึ่ง หากเกิดเหตุฉุกเฉินให้รีบแจ้งอาจารย์ที่ปรึกษาทันที',
    shareWithAdvisor: true,
    createdAt: '2026-09-06T13:40:00',
  },
]

// --- Audit Logs ---

export const mockAuditLogs: AuditLog[] = [
  { id: 'AL001', userId: 'STU001', userName: 'Somchai Jaidee', userRole: 'student', action: 'request_created', description: 'Created advising request REQ001 for Academic Performance', targetId: 'REQ001', createdAt: '2026-08-28T09:15:00' },
  { id: 'AL002', userId: 'ADV001', userName: 'Dr. Prasit Kanchanawat', userRole: 'advisor', action: 'appointment_scheduled', description: 'Scheduled appointment for Somchai Jaidee on September 10', targetId: 'APT001', createdAt: '2026-08-30T14:22:00' },
  { id: 'AL003', userId: 'STU002', userName: 'Ploy Srisuk', userRole: 'student', action: 'request_created', description: 'Created advising request REQ002 for Scholarship / Document Signing', targetId: 'REQ002', createdAt: '2026-08-20T10:30:00' },
  { id: 'AL004', userId: 'ADV001', userName: 'Dr. Prasit Kanchanawat', userRole: 'advisor', action: 'session_completed', description: 'Completed advising session with Ploy Srisuk. Signed scholarship form.', targetId: 'SES001', createdAt: '2026-09-01T15:00:00' },
  { id: 'AL005', userId: 'ADV001', userName: 'Dr. Prasit Kanchanawat', userRole: 'advisor', action: 'followup_created', description: 'Created follow-up for Ploy Srisuk: Submit scholarship renewal form', targetId: 'FU001', createdAt: '2026-09-01T15:05:00' },
  { id: 'AL006', userId: 'STU002', userName: 'Ploy Srisuk', userRole: 'student', action: 'document_signed', description: 'Scholarship Renewal Form signed by advisor', targetId: 'DOC001', createdAt: '2026-09-01T15:10:00' },
  { id: 'AL007', userId: 'ADV002', userName: 'Dr. Wipawan Buathong', userRole: 'advisor', action: 'session_completed', description: 'Completed advising session with Arthit Phanit. Registration hold resolved.', targetId: 'SES002', createdAt: '2026-08-28T10:30:00' },
  { id: 'AL008', userId: 'ADV003', userName: 'Dr. Chaiwat Namsai', userRole: 'advisor', action: 'referral_created', description: 'Referred Tanawat Rungroj to Financial Office for payment plan options', targetId: 'REF001', createdAt: '2026-09-01T15:20:00' },
  { id: 'AL009', userId: 'STU006', userName: 'Siriporn Meechai', userRole: 'student', action: 'exit_case_created', description: 'Created exit case EX001: Leave of Absence due to personal/family reasons', targetId: 'EX001', createdAt: '2026-09-02T11:00:00' },
  { id: 'AL010', userId: 'ADV001', userName: 'Dr. Prasit Kanchanawat', userRole: 'advisor', action: 'warning_created', description: 'Created early warning for Somchai Jaidee: Academic risk (high severity)', targetId: 'EW001', createdAt: '2026-08-25T16:30:00' },
  { id: 'AL011', userId: 'ADM001', userName: 'Supattra Kaewmanee', userRole: 'admin', action: 'roster_updated', description: 'Updated student-advisor roster. Assigned 10 students to 3 advisors.', createdAt: '2026-06-15T09:00:00' },
]

// --- Helper functions ---

export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id)
}

export function getUsersByRole(role: User['role']): User[] {
  return mockUsers.filter(u => u.role === role)
}

export function getAdvisorForStudent(studentId: string): User | undefined {
  const assignment = mockRoster.find(r => r.studentId === studentId && r.isActive)
  if (!assignment) return undefined
  return mockUsers.find(u => u.id === assignment.advisorId)
}

export function getStudentsForAdvisor(advisorId: string): User[] {
  const studentIds = mockRoster
    .filter(r => r.advisorId === advisorId && r.isActive)
    .map(r => r.studentId)
  return mockUsers.filter(u => studentIds.includes(u.id))
}
