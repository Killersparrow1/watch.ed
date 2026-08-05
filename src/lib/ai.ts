const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

export class AiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function aiErrorMessage(err: unknown): string {
  if (err instanceof AiError) {
    if (err.code === 'quota') return 'AI quota exceeded — try again later'
    if (err.code === 'not_configured') return 'AI service is not configured'
    if (err.code === 'empty') return 'AI returned an empty response'
    if (err.code === 'unauthorized') return 'You must be signed in to use AI features'
    if (err.code === 'forbidden') return 'You do not have permission to use this AI feature'
  }
  return 'AI service temporarily unavailable'
}

export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new AiError('not_configured', 'GEMINI_API_KEY not configured')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)

  try {
    const res = await fetch(
      `${GEMINI_URL}/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (res.status === 429) {
      throw new AiError('quota', 'Gemini quota exceeded')
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error:', res.status, errText)
      throw new AiError('api_error', `Gemini error ${res.status}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) {
      throw new AiError('empty', 'Gemini returned empty response')
    }

    return text
  } catch (e) {
    if (e instanceof AiError) throw e
    if ((e as Error).name === 'AbortError') {
      throw new AiError('timeout', 'AI request timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}