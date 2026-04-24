import { create } from 'zustand'

const safeLocation = (location) => {
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 }
  }
  return {
    name: location?.name || 'Selected location',
    lat,
    lng,
  }
}

export const useCityStore = create((set, get) => ({
  metrics: [],
  alerts: [],
  weather: null,
  airQuality: null,
  cityScore: 72,
  scoreHistory: [],
  selectedLocation: { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  currentUser: null,
  isDisasterMode: false,
  activeModule: 'command-center',
  sidebarCollapsed: false,
  setMetrics: (metrics) => set({ metrics }),
  setAlerts: (alerts) => set({ alerts }),
  setWeather: (weather) => set({ weather }),
  setAirQuality: (airQuality) => set({ airQuality }),
  setCityScore: (cityScore) => set({ cityScore }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation: safeLocation(selectedLocation) }),
  setDisasterMode: (isDisasterMode) => set({ isDisasterMode }),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  updateAlert: (alert) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === alert.id ? { ...a, ...alert } : a)),
    })),
  resolveAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, is_active: false } : a)),
    })),
  getMetricsByType: (type) => get().metrics.filter((m) => m.metric_type === type),
  getMetricsByZone: (zone) => get().metrics.filter((m) => m.zone_id === zone),
  getCriticalCount: () => get().metrics.filter((m) => m.severity === 'critical').length,
  getZoneSeverity: (zone, type) =>
    get().metrics.find((m) => m.zone_id === zone && m.metric_type === type)?.severity || 'low',
}))
