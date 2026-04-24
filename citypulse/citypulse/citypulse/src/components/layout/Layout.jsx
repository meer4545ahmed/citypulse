import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useCityStore } from '../../store/cityStore'

export default function Layout() {
  const isDisasterMode = useCityStore((s) => s.isDisasterMode)
  const location = useLocation()
  return (
    <div
      className={`relative flex h-screen overflow-hidden bg-gray-950 text-white ${
        isDisasterMode ? 'ring-2 ring-red-500/80 ring-offset-0' : ''
      }`}
    >
      {/* Ambient background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-[-160px] top-1/3 h-[420px] w-[420px] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-[-160px] left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {isDisasterMode ? (
          <div className="relative overflow-hidden bg-gradient-to-r from-red-900 via-red-700 to-red-900 px-4 py-2 text-center text-sm font-semibold tracking-wide">
            <span className="relative z-10">⚠️ DISASTER SIMULATION ACTIVE — All systems critical</span>
            <span className="absolute inset-0 animate-pulse bg-red-500/30" />
          </div>
        ) : null}
        <TopBar />
        <main key={location.pathname} className="cp-page-enter custom-scrollbar flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
