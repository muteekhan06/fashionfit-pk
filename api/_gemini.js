/**
 * FashionFit-PK: Multi-Key Gemini Failover Engine
 * Dual-Key High Availability: Mutee Ur Rehman & Hafiz Abdullah Muhammad
 *
 * Automatically monitors API quota & rate limits (HTTP 429 / RESOURCE_EXHAUSTED).
 * If Mutee's API key reaches its quota limit, it immediately and seamlessly fails over
 * to Hafiz's API key without interrupting the user's try-on session.
 */

export function getGeminiKeyPool() {
  const keys = []

  // 1. Mutee's API Key (Primary)
  const muteeKey = (process.env.GEMINI_API_KEY_MUTEE || process.env.GEMINI_API_KEY || '').trim()
  if (muteeKey && muteeKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    keys.push({ owner: "Mutee Ur Rehman", id: 'mutee', key: muteeKey })
  }

  // 2. Hafiz's API Key (Secondary / Auto-Failover)
  const hafizKey = (process.env.GEMINI_API_KEY_HAFIZ || '').trim()
  if (hafizKey && hafizKey !== 'YOUR_GEMINI_API_KEY_HERE' && hafizKey !== muteeKey) {
    keys.push({ owner: "Hafiz Abdullah Muhammad", id: 'hafiz', key: hafizKey })
  }

  // 3. Fallback to comma-separated GEMINI_API_KEYS if provided
  if (process.env.GEMINI_API_KEYS) {
    const extras = process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
    extras.forEach((k, idx) => {
      if (!keys.some((entry) => entry.key === k)) {
        keys.push({ owner: `Backup Key #${idx + 1}`, id: `backup_${idx + 1}`, key: k })
      }
    })
  }

  return keys
}

export async function callGeminiWithFailover({ prompt, mimeType, rawData, generationConfig }) {
  const pool = getGeminiKeyPool()
  if (pool.length === 0) {
    return {
      ok: false,
      status: 503,
      code: 'GEMINI_NO_KEYS_CONFIGURED',
      error: 'No valid Gemini API keys configured. Set GEMINI_API_KEY_MUTEE and GEMINI_API_KEY_HAFIZ.',
    }
  }

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: rawData } },
        ],
      },
    ],
    generationConfig: generationConfig || {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const errors = []

  for (let i = 0; i < pool.length; i++) {
    const current = pool[i]
    try {
      console.log(`[Gemini Engine] Attempting request using ${current.owner}'s API Key...`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': current.key,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // Check for rate limit / quota exhaustion (HTTP 429 or RESOURCE_EXHAUSTED)
      const isQuotaError =
        response.status === 429 ||
        data?.error?.code === 429 ||
        data?.error?.status === 'RESOURCE_EXHAUSTED' ||
        String(data?.error?.message || '').toLowerCase().includes('quota')

      if (isQuotaError) {
        console.warn(`[Gemini Engine] Quota limit reached on ${current.owner}'s key. Auto-switching...`)
        errors.push({
          owner: current.owner,
          status: 429,
          message: data?.error?.message || 'Daily quota limit reached on Free Tier.',
        })
        // Continue loop to failover to next key!
        continue
      }

      if (!response.ok) {
        // If not a quota error (e.g. invalid parameter or server error), record and try next key if available
        errors.push({
          owner: current.owner,
          status: response.status,
          message: data?.error?.message || 'API request failed.',
        })
        continue
      }

      // Successful response!
      const parts = data?.candidates?.[0]?.content?.parts || []
      const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data)

      if (!imgPart) {
        return {
          ok: false,
          status: 502,
          code: 'NO_IMAGE_OUTPUT',
          error: 'Gemini model did not return image bytes in response.',
          activeKeyOwner: current.owner,
        }
      }

      const inline = imgPart.inlineData || imgPart.inline_data
      const outMime = inline.mimeType || inline.mime_type || 'image/png'

      return {
        ok: true,
        status: 200,
        model,
        activeKeyOwner: current.owner,
        failoverTriggered: i > 0,
        base64Image: `data:${outMime};base64,${inline.data}`,
      }
    } catch (netErr) {
      console.error(`[Gemini Engine] Network error on ${current.owner}'s key:`, netErr.message)
      errors.push({ owner: current.owner, status: 500, message: netErr.message })
    }
  }

  // If all keys in the pool were exhausted:
  const allQuota = errors.every((e) => e.status === 429)
  return {
    ok: false,
    status: 429,
    code: allQuota ? 'ALL_GEMINI_QUOTAS_EXHAUSTED' : 'ALL_GEMINI_KEYS_FAILED',
    error: allQuota
      ? "Both Mutee's and Hafiz's Gemini API keys have reached their daily Free Tier quota limit. Google AI Studio resets free quotas automatically every 24 hours (~13 hours remaining), or you can link a Google Cloud billing account for unlimited requests."
      : 'All configured Gemini API keys failed to complete the request.',
    details: errors,
  }
}
