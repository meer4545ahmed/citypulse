import { useEffect, useState } from 'react'
import { useCityStore } from '../store/cityStore'
import { getCityNews } from '../lib/news'

export function useCityNews() {
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const [news, setNews] = useState([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const city = selectedLocation.name.split(',')[0]
      const items = await getCityNews(city)
      if (active) setNews(items)
    }
    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [selectedLocation.name])

  return news
}
