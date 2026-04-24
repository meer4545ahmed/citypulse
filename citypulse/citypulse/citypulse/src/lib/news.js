import axios from 'axios'

const demoNews = (city) => [
  { title: `${city}: Metro expansion update announced`, source: 'CityPulse Wire' },
  { title: `${city}: Weather advisory for evening commute`, source: 'Open Weather Desk' },
  { title: `${city}: AQI monitoring intensified in core zones`, source: 'Urban Health Feed' },
  { title: `${city}: Traffic police introduces adaptive signals`, source: 'Mobility Live' },
]

export async function getCityNews(city) {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(city + ' traffic weather air quality')}`
    const { data } = await axios.get('https://api.rss2json.com/v1/api.json', {
      params: { rss_url: rssUrl, count: 6 },
    })
    if (!data?.items?.length) return demoNews(city)
    return data.items.slice(0, 6).map((item) => ({ title: item.title, source: item.author || 'Global Feed' }))
  } catch (error) {
    return demoNews(city)
  }
}
