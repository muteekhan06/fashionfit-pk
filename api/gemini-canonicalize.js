/**
 * Vercel Serverless Function: POST /api/gemini-canonicalize
 * Stage 1 Generative Bridge:
 * Converts any raw Pakistani garment upload (model-worn, occluded by dupatta/arms,
 * hanging on a hanger with background props) into a clean, symmetrical, pure-white
 * (#FFFFFF) flat-lay kurta reference ready for zero-leakage VTON.
 *
 * Expects JSON: { image_base64: "data:image/...;base64,...", garment_hint?: string }
 * Requires env var: GEMINI_API_KEY
 */

const CANONICAL_PROMPT = `You are a precision e-commerce fashion studio retoucher specializing in Pakistani women's ethnic wear.
Transform the garment in this input photo into a single, crisp, symmetrical, front-facing flat-lay studio product photograph of ONLY the Pakistani kurta/kameez on a pure solid white background (#FFFFFF).
Strict requirements:
1. Preserve the exact fabric color, weave, print pattern, neckline placket (gala) embroidery, sleeve cuff embroidery, and lower hemline (daaman) border with 100% fidelity.
2. Reconstruct any regions that were occluded by arms, hair, a draped dupatta, or folded fabric so the complete knee-length kurta silhouette and both full sleeves are cleanly visible.
3. Remove completely: any human model, hands, face, trousers/shalwar, dupatta, wooden hanger, wall, plants, floor rug, shadows, watermarks, or text.
4. Center the garment symmetrically in a 3:4 vertical frame with even, shadowless overhead studio lighting.`

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
      detail:
        'Gemini API key placeholder is active. Add GEMINI_API_KEY in Vercel Environment Variables (or pass it when ready) to enable live Stage 1 Canonical Garment Extraction.',
    })
  }

  try {
    const { image_base64, garment_hint } = req.body || {}
    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing image_base64 payload.' })
    }

    const match = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : image_base64

    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

    const promptText = garment_hint
      ? `${CANONICAL_PROMPT}\nAdditional garment context: ${garment_hint}`
      : CANONICAL_PROMPT

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText },
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
        detail: data?.error?.message || 'Gemini API canonicalization request failed.',
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
      canonical_image: `data:${outMime};base64,${inline.data}`,
    })
  } catch (err) {
    return res.status(500).json({ detail: `Canonicalization error: ${err.message}` })
  }
}
