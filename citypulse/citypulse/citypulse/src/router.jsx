import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import CommandCenter from './pages/CommandCenter'
import Traffic from './pages/Traffic'
import AirQuality from './pages/AirQuality'
import Energy from './pages/Energy'
import Water from './pages/Water'
import Waste from './pages/Waste'
import Transport from './pages/Transport'
import AIAdvisor from './pages/AIAdvisor'
import Alerts from './pages/Alerts'
import MLInsights from './pages/MLInsights'
import LiveMap from './pages/LiveMap'
import Scenarios from './pages/Scenarios'
import RouteError from './components/shared/RouteError'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CommandCenter /> },
      { path: 'traffic', element: <Traffic /> },
      { path: 'air-quality', element: <AirQuality /> },
      { path: 'energy', element: <Energy /> },
      { path: 'water', element: <Water /> },
      { path: 'waste', element: <Waste /> },
      { path: 'transport', element: <Transport /> },
      { path: 'ai-advisor', element: <AIAdvisor /> },
      { path: 'ml-insights', element: <MLInsights /> },
      { path: 'live-map', element: <LiveMap /> },
      { path: 'scenarios', element: <Scenarios /> },
      { path: 'alerts', element: <Alerts /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
