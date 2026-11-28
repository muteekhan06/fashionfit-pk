/**
 * FashionFit-PK: Multi-Key Gemini Failover Engine
 * Multi-Key High Availability Pool:
 *  1. Mutee Ur Rehman (Personal / Primary)
 *  2. Mutee's Student ITU Account
 *  3. Hafiz Abdullah Muhammad
 *
 * Automatically monitors API quota & rate limits (HTTP 429 / 403 / RESOURCE_EXHAUSTED).
 * If any API key reaches its quota limit or is temporarily restricted, it immediately
 * and seamlessly fails over to the next available key without interrupting the user's try-on session.
 */

export function getGeminiKeyPool() {
  const keys = []

  // 1. Mutee's Primary Key
  const muteeKey = (process.env.GEMINI_API_KEY_MUTEE || process.env.GEMINI_API_KEY || '').trim()
  if (muteeKey && muteeKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    keys.push({ owner: "Mutee Ur Rehman (Primary)", id: 'mutee', key: muteeKey })
  }

  // 2. Mutee's Student ITU Account Key
  const muteeItuKey = (process.env.GEMINI_API_KEY_MUTEE_ITU || '').trim()
  if (muteeItuKey && muteeItuKey !== 'YOUR_GEMINI_API_KEY_HERE' && !keys.some(k => k.key === muteeItuKey)) {
    keys.push({ owner: "Mutee's Student ITU Account", id: 'mutee_itu', key: muteeItuKey })
  }

  // 3. Hafiz's Key
  const hafizKey = (process.env.GEMINI_API_KEY_HAFIZ || '').trim()
  if (hafizKey && hafizKey !== 'YOUR_GEMINI_API_KEY_HERE' && !keys.some(k => k.key === hafizKey)) {
    keys.push({ owner: "Hafiz Abdullah Muhammad", id: 'hafiz', key: hafizKey })
  }

  // 4. Fallback to comma-separated GEMINI_API_KEYS if provided
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
  return callGeminiMultiImageWithFailover({
    prompt,
    images: [{ mimeType, rawData }],
    generationConfig,
  })
}

export async function callGeminiMultiImageWithFailover({ prompt, images, generationConfig }) {
  const pool = getGeminiKeyPool()
  if (pool.length === 0) {
    return {
      ok: false,
      status: 503,
      code: 'GEMINI_NO_KEYS_CONFIGURED',
      error: 'No valid Gemini API keys configured. Set GEMINI_API_KEY_MUTEE, GEMINI_API_KEY_MUTEE_ITU, or GEMINI_API_KEY_HAFIZ.',
    }
  }

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const imageParts = (images || []).map((img) => ({
    inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.rawData },
  }))

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, ...imageParts],
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

      // Check for rate limit, quota exhaustion, or free tier restriction
      const isQuotaOrLimitError =
        response.status === 429 ||
        response.status === 403 ||
        data?.error?.code === 429 ||
        data?.error?.code === 403 ||
        data?.error?.status === 'RESOURCE_EXHAUSTED' ||
        String(data?.error?.message || '').toLowerCase().includes('quota') ||
        String(data?.error?.message || '').toLowerCase().includes('free tier')

      if (isQuotaOrLimitError) {
        console.warn(`[Gemini Engine] Limit/quota hit on ${current.owner}'s key (${response.status}). Auto-switching to next key...`)
        errors.push({
          owner: current.owner,
          status: response.status,
          message: data?.error?.message || 'Quota or Tier limit hit.',
        })
        // Seamlessly continue to the next key!
        continue
      }

      if (!response.ok) {
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
  return {
    ok: false,
    status: 429,
    code: 'ALL_GEMINI_KEYS_EXHAUSTED',
    error: 'All configured Gemini API keys (Mutee Primary, Mutee Student ITU, Hafiz) have reached their current capacity. They will automatically reset shortly, or you can attach a billing account for unlimited requests.',
    details: errors,
  }
}
