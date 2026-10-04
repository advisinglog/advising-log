import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// 1. Users Table (Student, Advisor, QA Chair, Admin)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // Student ID or Employee Code
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['student', 'advisor', 'qa_chair', 'admin', 'sub_admin'] }).notNull(),
  department: text('department').notNull().default('School of Applied Digital Technology (ADT)'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  hasAiAccess: integer('has_ai_access', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

// 2. Student-Advisor Assignments
export const studentAdvisorAssignments = sqliteTable('student_advisor_assignments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  assignedAt: text('assigned_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

// 3. Advising Requests
export const advisingRequests = sqliteTable('advising_requests', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  subCategory: text('sub_category'),
  details: text('details').notNull(),
  preferredDate: text('preferred_date').notNull(),
  preferredTime: text('preferred_time').notNull(),
  attachments: text('attachments').notNull().default('[]'), // JSON array of file public_ids/names
  pdpaConsent: integer('pdpa_consent', { mode: 'boolean' }).notNull().default(true),
  status: text('status', { enum: ['requested', 'pending', 'scheduled', 'completed', 'cancelled', 'closed'] }).notNull().default('requested'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 4. Appointments
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().references(() => advisingRequests.id),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  location: text('location').notNull(),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  studentConfirmed: integer('student_confirmed', { mode: 'boolean' }).default(false),
  studentDeclined: integer('student_declined', { mode: 'boolean' }).default(false),
  studentDeclineReason: text('student_decline_reason'),
  createdAt: text('created_at').notNull(),
})

// 5. Advising Sessions (Completed Records)
export const advisingSessions = sqliteTable('advising_sessions', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().references(() => advisingRequests.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  sessionDate: text('session_date').notNull(),
  summary: text('summary').notNull(),
  problem: text('problem').notNull(),
  advice: text('advice').notNull(),
  actionsTaken: text('actions_taken').notNull(),
  outcome: text('outcome').notNull(),
  createdAt: text('created_at').notNull(),
})

// 6. Follow-up Tasks
export const followUps = sqliteTable('follow_ups', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => advisingSessions.id),
  requestId: text('request_id').references(() => advisingRequests.id),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  task: text('task').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'overdue'] }).notNull().default('pending'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
})

// 7. Follow-up Progress Updates
export const followUpProgress = sqliteTable('follow_up_progress', {
  id: text('id').primaryKey(),
  followUpId: text('follow_up_id').notNull().references(() => followUps.id),
  studentId: text('student_id').notNull().references(() => users.id),
  progress: integer('progress').notNull().default(0), // 0 to 100
  notes: text('notes').notNull().default(''),
  status: text('status', { enum: ['in_progress', 'submitted', 'reviewed'] }).notNull().default('in_progress'),
  createdAt: text('created_at').notNull(),
})

// 8. Referrals to Specialized University Units
export const referrals = sqliteTable('referrals', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => advisingSessions.id),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  targetUnit: text('target_unit').notNull(),
  reason: text('reason').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'accepted', 'completed', 'cancelled'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
})

// 9. Exit Cases (Withdrawal & Leave of Absence)
export const exitCases = sqliteTable('exit_cases', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id),
  advisorId: text('advisor_id').notNull().references(() => users.id),
  exitType: text('exit_type', { enum: ['withdrawal', 'leave_of_absence', 'transfer', 'dropout'] }).notNull(),
  reasonCode: text('reason_code').notNull(),
  reasonCategory: text('reason_category').notNull(),
  details: text('details').notNull(),
  documents: text('documents').notNull().default('[]'), // JSON array of public_ids
  advisorAssessment: text('advisor_assessment'),
  status: text('status', { enum: ['submitted', 'advisor_reviewed', 'chair_approved', 'completed', 'cancelled'] }).notNull().default('submitted'),
  pdpaConsent: integer('pdpa_consent', { mode: 'boolean' }).notNull().default(true),
  voiceSurveyCompleted: integer('voice_survey_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 10. Student Voice Survey (Voluntary & Anonymous Departure Feedback)
export const studentVoiceResponses = sqliteTable('student_voice_responses', {
  id: text('id').primaryKey(),
  exitCaseId: text('exit_case_id').references(() => exitCases.id),
  studentId: text('student_id').references(() => users.id),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  exitType: text('exit_type', { enum: ['withdrawal', 'leave_of_absence', 'transfer', 'dropout'] }).notNull(),
  academicYear: text('academic_year').notNull(),
  primaryFactors: text('primary_factors').notNull(), // JSON array
  curriculumRating: integer('curriculum_rating').notNull(),
  teachingRating: integer('teaching_rating').notNull(),
  advisorRating: integer('advisor_rating').notNull(),
  servicesRating: integer('services_rating').notNull(),
  overallRating: integer('overall_rating').notNull(),
  whatCouldUniversityDoBetter: text('what_could_university_do_better'),
  curriculumImprovementSuggestions: text('curriculum_improvement_suggestions'),
  adviceForFutureStudents: text('advice_for_future_students'),
  shareWithAdvisor: integer('share_with_advisor', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

// 11. Documents & Media Attachments (Cloudinary references)
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  type: text('type').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  publicId: text('public_id').notNull(),
  url: text('url').notNull(),
  createdAt: text('created_at').notNull(),
})

// 12. Early Warning Indicators
export const earlyWarnings = sqliteTable('early_warnings', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id),
  riskLevel: text('risk_level', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  indicators: text('indicators').notNull(), // JSON array
  status: text('status', { enum: ['active', 'monitoring', 'resolved'] }).notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
})

// 13. PDPA & Security Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  description: text('description').notNull(),
  targetId: text('target_id'),
  timestamp: text('timestamp').notNull(),
  ipAddress: text('ip_address'),
})

// 14. Multi-Key AI Governance (Cloudflare D1)
export const aiApiKeys = sqliteTable('ai_api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  provider: text('provider').notNull().default('Google Gemini'),
  model: text('model').notNull().default('gemini-1.5-flash'),
  status: text('status', { enum: ['active', 'inactive', 'rate_limited'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
  lastTestedAt: text('last_tested_at'),
})

// 15. Advising Category Configuration (Cloudflare D1)
export const advisingCategoryConfigs = sqliteTable('advising_category_configs', {
  id: text('id').primaryKey(),
  value: text('value').notNull().unique(),
  labelTh: text('label_th').notNull(),
  labelEn: text('label_en').notNull(),
  subCategories: text('sub_categories').notNull().default('[]'), // JSON array of subcategories
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// 16. Document Type Configuration (Cloudflare D1)
export const documentTypeConfigs = sqliteTable('document_type_configs', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  labelTh: text('label_th').notNull(),
  labelEn: text('label_en').notNull(),
  allowedFormats: text('allowed_formats').notNull().default('["PDF","JPG","PNG"]'), // JSON array
  maxSizeMb: integer('max_size_mb').notNull().default(10),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

