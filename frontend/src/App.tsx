import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { StoreProvider } from '@/data/mock-store'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastContainer } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import LoginPage from '@/pages/LoginPage'

// Student Pages
import StudentDashboard from '@/pages/student/StudentDashboard'
import RequestAdvising from '@/pages/student/RequestAdvising'
import AdvisingHistory from '@/pages/student/AdvisingHistory'
import AdvisingDetail from '@/pages/student/AdvisingDetail'
import StudentForms from '@/pages/student/StudentForms'
import FollowUps from '@/pages/student/FollowUps'
import StudentVoiceSurvey from '@/pages/student/StudentVoiceSurvey'

// Advisor Pages
import AdvisorDashboard from '@/pages/advisor/AdvisorDashboard'
import AdvisingSessions from '@/pages/advisor/AdvisingSessions'
import AdvisorLog from '@/pages/advisor/AdvisorLog'
import EarlyWarning from '@/pages/advisor/EarlyWarning'
import Referrals from '@/pages/advisor/Referrals'
import ExitCases from '@/pages/advisor/ExitCases'

// QA Pages
import QADashboard from '@/pages/qa/QADashboard'
import ExitCaseReview from '@/pages/qa/ExitCaseReview'

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import AiGovernance from '@/pages/admin/AiGovernance'
import Roster from '@/pages/admin/Roster'
import Categories from '@/pages/admin/Categories'
import DocumentTypes from '@/pages/admin/DocumentTypes'
import AuditLogs from '@/pages/admin/AuditLogs'

import type { UserRole } from '@/types'

// Role Guard Component
function RequireRole({ children, allowedRoles }: { children: import('react').ReactNode, allowedRoles: UserRole[] }) {
  const { currentUser, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (currentUser && !allowedRoles.includes(currentUser.role)) {
    // Redirect to their default dashboard if unauthorized
    if (currentUser.role === 'student') return <Navigate to="/student" replace />
    if (currentUser.role === 'advisor') return <Navigate to="/advisor" replace />
    if (currentUser.role === 'qa_chair') return <Navigate to="/qa" replace />
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return <Navigate to="/admin" replace />
  }
  return children
}

// Redirect root to appropriate dashboard
function RootRedirect() {
  const { currentUser, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (currentUser?.role === 'student') return <Navigate to="/student" replace />
  if (currentUser?.role === 'advisor') return <Navigate to="/advisor" replace />
  if (currentUser?.role === 'qa_chair') return <Navigate to="/qa" replace />
  if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') return <Navigate to="/admin" replace />
  return <Navigate to="/login" replace />
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '1029384756-demo-advising-log.apps.googleusercontent.com'

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <StoreProvider>
              <AuthProvider>
                <ToastProvider>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route path="/" element={<AppLayout />}>
                      <Route index element={<RootRedirect />} />
                      
                      {/* Student Routes */}
                      <Route path="student" element={<RequireRole allowedRoles={['student']}><StudentDashboard /></RequireRole>} />
                      <Route path="student/request" element={<RequireRole allowedRoles={['student']}><RequestAdvising /></RequireRole>} />
                      <Route path="student/history" element={<RequireRole allowedRoles={['student']}><AdvisingHistory /></RequireRole>} />
                      <Route path="student/history/:id" element={<RequireRole allowedRoles={['student']}><AdvisingDetail /></RequireRole>} />
                      <Route path="student/forms" element={<RequireRole allowedRoles={['student']}><StudentForms /></RequireRole>} />
                      <Route path="student/documents" element={<Navigate to="/student/forms" replace />} />
                      <Route path="student/followups" element={<RequireRole allowedRoles={['student']}><FollowUps /></RequireRole>} />
                      <Route path="student/exit" element={<Navigate to="/student/request?category=withdrawal_leave" replace />} />
                      <Route path="student/voice" element={<RequireRole allowedRoles={['student']}><StudentVoiceSurvey /></RequireRole>} />

                      {/* Advisor Routes */}
                      <Route path="advisor" element={<RequireRole allowedRoles={['advisor']}><AdvisorDashboard /></RequireRole>} />
                      <Route path="advisor/sessions" element={<RequireRole allowedRoles={['advisor']}><AdvisingSessions /></RequireRole>} />
                      <Route path="advisor/log" element={<RequireRole allowedRoles={['advisor']}><AdvisorLog /></RequireRole>} />
                      <Route path="advisor/warnings" element={<RequireRole allowedRoles={['advisor']}><EarlyWarning /></RequireRole>} />
                      <Route path="advisor/referrals" element={<RequireRole allowedRoles={['advisor']}><Referrals /></RequireRole>} />
                      <Route path="advisor/exit-cases" element={<RequireRole allowedRoles={['advisor']}><ExitCases /></RequireRole>} />

                      {/* QA Routes */}
                      <Route path="qa" element={<RequireRole allowedRoles={['qa_chair']}><QADashboard /></RequireRole>} />
                      <Route path="qa/exit-review" element={<RequireRole allowedRoles={['qa_chair']}><ExitCaseReview /></RequireRole>} />

                      {/* Admin & Super Admin Routes */}
                      <Route path="admin" element={<RequireRole allowedRoles={['admin', 'super_admin']}><AdminDashboard /></RequireRole>} />
                      <Route path="admin/users" element={<RequireRole allowedRoles={['admin', 'super_admin']}><UserManagement /></RequireRole>} />
                      <Route path="admin/ai-governance" element={<RequireRole allowedRoles={['super_admin']}><AiGovernance /></RequireRole>} />
                      <Route path="admin/roster" element={<RequireRole allowedRoles={['admin', 'super_admin']}><Roster /></RequireRole>} />
                      <Route path="admin/categories" element={<RequireRole allowedRoles={['admin', 'super_admin']}><Categories /></RequireRole>} />
                      <Route path="admin/document-types" element={<RequireRole allowedRoles={['admin', 'super_admin']}><DocumentTypes /></RequireRole>} />
                      <Route path="admin/audit-logs" element={<RequireRole allowedRoles={['admin', 'super_admin']}><AuditLogs /></RequireRole>} />
                    </Route>
                  </Routes>
                  <ToastContainer />
                </ToastProvider>
              </AuthProvider>
            </StoreProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
