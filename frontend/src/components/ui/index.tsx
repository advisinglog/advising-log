// ============================================================
// Reusable UI Components — Ultra-Clean Minimal White & Sky Blue
// ============================================================

import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RequestStatus, FollowUpStatus, ReferralStatus, ExitCaseStatus, AppointmentStatus, EarlyWarningSeverity, DocumentStatus } from '@/types'

export { ThemeToggle } from './ThemeToggle'
export { DocumentViewerModal, type DocumentViewerTarget } from './DocumentViewerModal'

// --- Status Badge ---

type BadgeStatus = RequestStatus | FollowUpStatus | ReferralStatus | ExitCaseStatus | AppointmentStatus | EarlyWarningSeverity | DocumentStatus | string

const statusLabelsTh: Record<string, string> = {
  requested: 'รอการตอบรับ',
  scheduled: 'นัดหมายแล้ว',
  active: 'เปิดใช้งาน',
  in_progress: 'กำลังดำเนินการ',
  open: 'รอดำเนินการ',
  submitted: 'ยื่นคำร้องแล้ว',
  advisor_reviewed: 'อาจารย์ตรวจสอบแล้ว',
  chair_approved: 'ประธานหลักสูตรอนุมัติ',
  uploaded: 'อัปโหลดแล้ว',
  completed: 'เสร็จสิ้น',
  resolved: 'ยุติเคสแล้ว',
  signed: 'ลงนามเรียบร้อย',
  approved: 'อนุมัติแล้ว',
  accepted: 'ตอบรับแล้ว',
  reviewed: 'ตรวจสอบแล้ว',
  pending: 'รอดำเนินการ',
  under_review: 'อยู่ระหว่างตรวจสอบ',
  monitoring: 'เฝ้าระวัง / ติดตาม',
  required: 'ต้องยื่นเอกสาร',
  medium: 'ความเสี่ยงปานกลาง',
  overdue: 'เกินกำหนดเวลา',
  high: 'ความเสี่ยงสูง',
  critical: 'วิกฤตเร่งด่วน',
  rejected: 'ไม่อนุมัติ / ปฏิเสธ',
  cancelled: 'ยกเลิก',
  closed: 'ปิดเคสแล้ว',
  low: 'ความเสี่ยงต่ำ',
  referred: 'ส่งต่อหน่วยงานแล้ว',
  inactive: 'ปิดใช้งาน',
}

const statusLabelsEn: Record<string, string> = {
  requested: 'Awaiting Response',
  scheduled: 'Scheduled',
  active: 'Active',
  in_progress: 'In Progress',
  open: 'Open',
  submitted: 'Submitted',
  advisor_reviewed: 'Advisor Reviewed',
  chair_approved: 'Chair Approved',
  uploaded: 'Uploaded',
  completed: 'Completed',
  resolved: 'Resolved',
  signed: 'Signed',
  approved: 'Approved',
  accepted: 'Accepted',
  reviewed: 'Reviewed',
  pending: 'Pending',
  under_review: 'Under Review',
  monitoring: 'Monitoring',
  required: 'Required',
  medium: 'Medium Risk',
  overdue: 'Overdue',
  high: 'High Risk',
  critical: 'Critical',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Closed',
  low: 'Low Risk',
  referred: 'Referred',
  inactive: 'Inactive',
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  // Sky Blue for active, open, requested, scheduled, submitted
  requested: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  scheduled: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  active: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  in_progress: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  open: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  submitted: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },
  uploaded: { bg: 'bg-sky-50/80 dark:bg-sky-500/12', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200/60 dark:border-sky-500/25', dot: 'bg-sky-500 dark:bg-sky-400' },

  // Emerald for completed, resolved, signed, approved, accepted, reviewed, chair_approved
  completed: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  resolved: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  signed: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  approved: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  accepted: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  reviewed: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  chair_approved: { bg: 'bg-emerald-50/80 dark:bg-emerald-500/12', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/60 dark:border-emerald-500/25', dot: 'bg-emerald-500 dark:bg-emerald-400' },

  // Amber for pending, review, monitoring, required, advisor_reviewed
  pending: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
  under_review: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
  advisor_reviewed: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
  monitoring: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
  required: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },
  medium: { bg: 'bg-amber-50/80 dark:bg-amber-500/12', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-500/25', dot: 'bg-amber-500 dark:bg-amber-400' },

  // Rose/Red for high, critical, overdue, rejected
  overdue: { bg: 'bg-rose-50/80 dark:bg-rose-500/12', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200/60 dark:border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },
  high: { bg: 'bg-rose-50/80 dark:bg-rose-500/12', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200/60 dark:border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },
  critical: { bg: 'bg-rose-50/80 dark:bg-rose-500/12', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200/60 dark:border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },
  rejected: { bg: 'bg-rose-50/80 dark:bg-rose-500/12', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200/60 dark:border-rose-500/25', dot: 'bg-rose-500 dark:bg-rose-400' },

  // Slate for closed, cancelled, low
  cancelled: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/60', dot: 'bg-slate-400' },
  closed: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/60', dot: 'bg-slate-400' },
  low: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/60', dot: 'bg-slate-400' },
  referred: { bg: 'bg-purple-50/80 dark:bg-purple-500/12', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200/60 dark:border-purple-500/25', dot: 'bg-purple-500 dark:bg-purple-400' },
  inactive: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700/60', dot: 'bg-slate-400' },
}

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const { language } = useLanguage()
  const conf = statusConfig[status] || { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700/60', dot: 'bg-slate-400' }
  const label = language === 'th'
    ? (statusLabelsTh[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : (statusLabelsEn[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight',
      conf.bg, conf.text, conf.border,
      className,
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', conf.dot)} />
      {label}
    </span>
  )
}

// --- Page Header ---

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
      <div className="flex-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:self-center sm:gap-2.5">{actions}</div>}
    </div>
  )
}

// --- Stat Card ---

export function StatCard({ label, value, icon, color = 'sky' }: { label: string; value: string | number; icon: ReactNode; color?: string }) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    sky: { bg: 'bg-sky-50/90 dark:bg-sky-500/12', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-1 ring-sky-200/60 dark:ring-sky-500/25' },
    indigo: { bg: 'bg-sky-50/90 dark:bg-sky-500/12', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-1 ring-sky-200/60 dark:ring-sky-500/25' },
    blue: { bg: 'bg-sky-50/90 dark:bg-sky-500/12', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-1 ring-sky-200/60 dark:ring-sky-500/25' },
    emerald: { bg: 'bg-emerald-50/90 dark:bg-emerald-500/12', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-1 ring-emerald-200/60 dark:ring-emerald-500/25' },
    amber: { bg: 'bg-amber-50/90 dark:bg-amber-500/12', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-1 ring-amber-200/60 dark:ring-amber-500/25' },
    red: { bg: 'bg-rose-50/90 dark:bg-rose-500/12', text: 'text-rose-600 dark:text-rose-300', ring: 'ring-1 ring-rose-200/60 dark:ring-rose-500/25' },
    purple: { bg: 'bg-purple-50/90 dark:bg-purple-500/12', text: 'text-purple-600 dark:text-purple-300', ring: 'ring-1 ring-purple-200/60 dark:ring-purple-500/25' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-800/80', text: 'text-slate-600 dark:text-slate-300', ring: 'ring-1 ring-slate-200 dark:ring-slate-700/60' },
  }
  const theme = colorMap[color] || colorMap.sky

  return (
    <div className="group relative bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-3 sm:p-4 md:p-5 shadow-premium hover:shadow-premium-hover hover:border-sky-300/60 dark:hover:border-sky-500/50 transition-all duration-200">
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className={cn('h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 duration-200', theme.bg, theme.text, theme.ring)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-sans">{value}</p>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-400 mt-0.5 truncate tracking-wide">{label}</p>
        </div>
      </div>
    </div>
  )
}

// --- Card ---

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-premium text-slate-900 dark:text-slate-100',
        onClick && 'cursor-pointer hover:border-sky-300/80 dark:hover:border-sky-500/60 hover:shadow-premium-hover transition-all duration-200 hover:-translate-y-0.5',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// --- Empty State ---

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-sky-50/50 dark:bg-slate-800/80 border border-sky-100/80 dark:border-slate-700/60 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3.5 shadow-xs">
        {icon || <FileText className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}

// --- Modal / Dialog ---

export function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!isOpen) return null
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className={cn('relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col z-10 animate-[slideIn_0.15s_ease-out] text-slate-900 dark:text-slate-100', sizeClass)}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// --- Confirm Dialog ---

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
}) {
  const { t } = useLanguage()
  if (!isOpen) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel || t('ยกเลิก', 'Cancel')}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel || t('ยืนยัน', 'Confirm')}
        </Button>
      </div>
    </Modal>
  )
}

// --- Tabs ---

export function Tabs({ tabs, active, onChange }: { tabs: { value: string; label: string; count?: number }[]; active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 border-b border-slate-200/70 dark:border-slate-800 mb-6 overflow-x-auto pb-px">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-150 -mb-px whitespace-nowrap flex items-center gap-2 cursor-pointer',
            active === t.value
              ? 'border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tracking-tight',
              active === t.value ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// --- Search Input ---

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 dark:focus:border-sky-500 transition-all shadow-xs"
      />
    </div>
  )
}

// --- Data Table ---

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T extends { id?: string }>({ columns, data, onRowClick, emptyMessage = 'No data available.' }: {
  columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; emptyMessage?: string
}) {
  if (data.length === 0) {
    return (
      <div className="border border-slate-200/70 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-premium">
        <EmptyState title={emptyMessage} />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto border border-slate-200/70 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-premium">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800">
            {columns.map(col => (
              <th key={col.key} className={cn('px-4 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'bg-white dark:bg-slate-900/90 transition-colors duration-150',
                onRowClick && 'cursor-pointer hover:bg-sky-50/40 dark:hover:bg-slate-800/60',
              )}
            >
              {columns.map(col => (
                <td key={col.key} className={cn('px-4 py-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 align-middle', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Pagination ---

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  const { t } = useLanguage()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
      <span>{t(`หน้า ${page} จาก ${totalPages}`, `Page ${page} of ${totalPages}`)}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('หน้าก่อนหน้า', 'Previous page')}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('หน้าถัดไป', 'Next page')}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// --- Timeline ---

export function Timeline({ items }: { items: { date: string; title: string; description?: string; status?: string }[] }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3.5">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-sky-500 mt-1.5 ring-4 ring-sky-100 dark:ring-sky-950/60" />
            {i < items.length - 1 && <div className="w-px flex-1 bg-slate-200/80 dark:bg-slate-800 my-1" />}
          </div>
          <div className="pb-5">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{item.date}</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{item.title}</p>
            {item.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>}
            {item.status && <StatusBadge status={item.status} className="mt-1.5" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Toast Container ---

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    error: <AlertCircle className="h-4 w-4 text-rose-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Info className="h-4 w-4 text-sky-500" />,
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
      {toasts.map(t => (
        <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 flex items-start gap-3 animate-[slideIn_0.2s_ease-out]">
          <div className="mt-0.5 flex-shrink-0">{iconMap[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{t.title}</p>
            {t.message && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t.message}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// --- Button helpers ---

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; disabled?: boolean; className?: string; type?: 'button' | 'submit'
}) {
  const variants = {
    primary: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white border-transparent shadow-xs font-semibold focus:ring-4 focus:ring-sky-500/15',
    secondary: 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs font-semibold focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-transparent shadow-xs font-semibold focus:ring-4 focus:ring-rose-500/15',
    ghost: 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border-transparent font-medium',
  }
  const sizes = {
    sm: 'px-2.5 sm:px-3 py-1.5 text-xs rounded-lg',
    md: 'px-3.5 sm:px-4 py-2 text-xs sm:text-sm rounded-xl',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  )
}

// --- User Avatar (Google OAuth & Fallback Safe) ---

export function UserAvatar({
  name,
  avatar,
  size = 'md',
  className,
}: {
  name: string
  avatar?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [avatar])

  // Clean out common academic titles & honorific prefixes (EN & TH)
  const cleanName = (name || 'User')
    .replace(/^(asst\.\s*prof\.\s*dr\.|assoc\.\s*prof\.\s*dr\.|asst\.\s*prof\.|assoc\.\s*prof\.|prof\.\s*dr\.|prof\.|dr\.|doctor|mr\.|mrs\.|ms\.|ผศ\.\s*ดร\.|รศ\.\s*ดร\.|ศ\.\s*ดร\.|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|อ\.|นาย|นางสาว|นาง)\s+/i, '')
    .trim()

  const parts = (cleanName || name || 'User').split(/\s+/).filter(Boolean)
  const initials = (
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0]?.substring(0, 2) || 'U'
  ).toUpperCase()

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px] rounded-lg',
    sm: 'h-8 w-8 text-xs rounded-xl',
    md: 'h-9 w-9 text-xs rounded-xl',
    lg: 'h-12 w-12 sm:h-14 sm:w-14 text-base rounded-2xl',
    xl: 'h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 text-lg sm:text-xl rounded-2xl',
  }[size]

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={cn(
          sizeClasses,
          'object-cover ring-2 ring-sky-500/30 flex-shrink-0 shadow-2xs bg-slate-100 dark:bg-slate-800',
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClasses,
        'bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 font-extrabold flex items-center justify-center flex-shrink-0 shadow-2xs',
        className
      )}
    >
      {initials}
    </div>
  )
}

// --- Student Profile Banner (REG MFU Academic Information Style) ---

export function StudentProfileBanner({
  student,
  advisor,
  school,
  major,
}: {
  student: { name: string; code: string; email: string; department?: string; avatar?: string }
  advisor?: { name: string; email: string; phone?: string; department?: string; avatar?: string } | null
  school?: string
  major?: string
}) {
  const { t } = useLanguage()
  const displaySchool = school || t('สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)', 'School of Applied Digital Technology (ADT)')
  const displayMajor = major || t('สาขาวิชาวิศวกรรมซอฟต์แวร์', 'Software Engineering')

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-premium p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 relative overflow-hidden">
      {/* Top sky accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
        {/* Left: Avatar + Identity */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <UserAvatar name={student.name} avatar={student.avatar} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-sky-100/70 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-[10px] sm:text-xs font-mono font-bold border border-sky-200/60 dark:border-sky-800">
                {student.code}
              </span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {student.name}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
              {displayMajor} · {displaySchool}
            </p>
          </div>
        </div>

        {/* Right: Advisor Card */}
        <div className="flex items-center pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="px-3.5 py-2 rounded-xl bg-sky-50/60 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/25 min-w-[200px] sm:min-w-[240px]">
            <p className="text-[9px] sm:text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">{t('อาจารย์ที่ปรึกษา', 'Faculty Advisor')}</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {advisor?.name || t('ยังไม่ได้รับการจัดสรร', 'Not Assigned')}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {advisor?.email || t('กรุณาติดต่อสำนักวิชา', 'Contact School Office')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Advisor Cohort Banner ---

export function AdvisorCohortBanner({
  advisor,
  adviseeCount,
  school,
}: {
  advisor: { name: string; code?: string; email: string; department?: string; avatar?: string }
  adviseeCount: number
  school?: string
  semester?: string
}) {
  const { t } = useLanguage()
  const displaySchool = school || advisor.department || t('สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)', 'School of Applied Digital Technology (ADT)')

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-premium p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <UserAvatar name={advisor.name} avatar={advisor.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {advisor.name}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
              {displaySchool}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/25 text-center min-w-[100px]">
            <p className="text-[9px] sm:text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">{t('นักศึกษาในความดูแล', 'Assigned Advisees')}</p>
            <p className="text-lg sm:text-xl font-extrabold text-sky-800 dark:text-sky-200 mt-0.5 font-mono">{adviseeCount} {t('คน', 'Students')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { GoogleCalendarButton, type GoogleCalendarButtonProps } from './GoogleCalendarButton'
