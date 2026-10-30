// ============================================================
// AdvisingLog — App Layout (Minimal White & Sky Blue)
// ============================================================

import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f19] overflow-hidden text-slate-900 dark:text-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-[#0b0f19]">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Pages load on demand; show a light placeholder while a page's code downloads */}
            <Suspense fallback={<div role="status" aria-label="Loading" className="flex justify-center py-16"><div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400 animate-spin" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}


