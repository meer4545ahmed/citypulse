import axios from 'axios'

const fallback = [
  {
    location: 'Bengaluru Central',
    measurements: [
      { parameter: 'pm25', value: 87, unit: 'ug/m3' },
      { parameter: 'pm10', value: 142, unit: 'ug/m3' },
      { parameter: 'no2', value: 34, unit: 'ug/m3' },
    ],
  },
]

export async function getAirQuality() {
  try {
    const { data } = await axios.get(
      'https://api.openaq.org/v2/latest?city=Bengaluru&limit=10',
    )
    return data?.results?.length ? data.results : fallback
  } catch (error) {
    return fallback
  }
}
