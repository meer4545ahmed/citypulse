import axios from 'axios'

export async function getWeather(lat = 12.9716, lng = 77.5946) {
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat,
      longitude: lng,
      current:
        'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,apparent_temperature',
      hourly: 'temperature_2m,precipitation_probability',
      forecast_days: 3,
    },
  })
  return data
}
