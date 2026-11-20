/**
 * Vercel Serverless Function: POST /api/gemini-prep-person
 * Precision Person Studio Normalizer:
 * Takes any uploaded woman's photo (cluttered room, dim lighting, slight tilt/distortion,
 * harsh shadows, or uneven framing) and molds it into a clean, studio-lit, neutral-background
 * full-body portrait optimized for near-100% VTON accuracy while preserving 100% of her exact
 * face, hair, skin tone, and body proportions.
 *
 * Expects JSON: { image_base64: "data:image/...;base64,..." }
 * Requires env var: GEMINI_API_KEY
 */

const PERSON_PREP_PROMPT = `You are a precision studio fashion photo normalizer preparing an input portrait for Virtual Try-On.
Clean and standardize this person photograph into a crisp, front-facing, well-lit studio full-body photograph while strictly preserving the person's exact identity.
Strict requirements:
1. Preserve 100% of the woman's exact face, facial features, expression, skin tone, hair, age, and true body proportions without altering her identity or body shape.
2. Replace any cluttered, dark, or distracting background with a clean, uniform soft light-beige studio backdrop (#ECE7E0) with soft, even studio lighting.
3. Correct lens distortion, harsh shadows, or slight camera tilt so the posture is clean, centered, and well-proportioned in a 3:4 vertical frame with arms clearly separated from the torso.
4. Keep her lower trousers/bottoms and footwear neat and consistent, and keep the upper garment clean and unwrinkled so virtual try-on replacement is seamless.
5. Output ONLY a single clean studio portrait photograph—no split frames, no text, no watermarks, no added accessories.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return res.status(503).json({
      code: 'GEMINI_API_KEY_NOT_CONFIGURED',
      detail: 'Gemini API key is not configured on the server.',
    })
  }

  try {
    const { image_base64 } = req.body || {}
    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing image_base64 payload.' })
    }

    const match = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : image_base64

    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: PERSON_PREP_PROMPT },
              { inline_data: { mime_type: mimeType, data: rawData } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    const data = await geminiRes.json()
    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        detail: data?.error?.message || 'Gemini person studio normalization failed.',
      })
    }

    const parts = data?.candidates?.[0]?.content?.parts || []
    const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data)
    if (!imgPart) {
      return res.status(502).json({ detail: 'Gemini returned no image output.' })
    }
    const inline = imgPart.inlineData || imgPart.inline_data
    const outMime = inline.mimeType || inline.mime_type || 'image/png'

    return res.status(200).json({
      status: 'ok',
      model,
      prepped_person_image: `data:${outMime};base64,${inline.data}`,
    })
  } catch (err) {
    return res.status(500).json({ detail: `Person normalization error: ${err.message}` })
  }
}
