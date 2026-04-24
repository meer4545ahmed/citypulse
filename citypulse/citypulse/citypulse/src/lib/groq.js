import axios from 'axios'
import { getFaqAnswer } from '../data/aiFaq'

export async function askGroq(userMessage, cityContext) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey || apiKey === 'your_groq_api_key') {
    return getFaqAnswer(userMessage)
  }

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You are CityPulse AI, an expert urban intelligence advisor for Bengaluru Smart City. You analyze real-time city data and provide actionable policy recommendations to city officials. Be concise, data-driven, and specific. Always reference the actual metrics provided. Current city data: ' +
              JSON.stringify(cityContext),
          },
          { role: 'user', content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    )

    return data?.choices?.[0]?.message?.content || getFaqAnswer(userMessage)
  } catch (error) {
    return getFaqAnswer(userMessage)
  }
}
