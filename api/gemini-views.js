/**
 * Vercel Serverless Function: POST /api/gemini-views
 * Stage 3 Modaya-Style 3-View Studio Generator:
 * Generates consistent multi-angle studio views from a front try-on result:
 *   - "front"         : Studio front full-body polished view
 *   - "three_quarter" : 3/4 editorial angle showing sleeve/side-slit drape
 *   - "back_detail"   : Rear / embroidery detail showcase view
 *
 * Expects JSON: { result_image_base64: string, view_mode: "front" | "three_quarter" | "back_detail" }
 * Requires env var: GEMINI_API_KEY
 */

const VIEW_PROMPTS = {
  front:
    'Enhance this Pakistani kurta virtual try-on photograph into a crisp, photorealistic e-commerce front-facing full-body studio shot. Keep the exact person identity, pose, trousers, shoes, and exact kurta embroidery, color, and knee-length silhouette unchanged. Remove any minor blending artifacts around seams, cuffs, or hemline.',
  three_quarter:
    'Generate a consistent 3/4 editorial studio angle (turned ~35 degrees) of the exact same person wearing the exact same Pakistani kurta and trousers from this image. Preserve identical face, hair, body proportions, kurta color, neckline gala embroidery, sleeve cuffs, daaman border, and studio backdrop. Natural fabric drape, photorealistic fashion photography.',
  back_detail:
    'Generate a consistent back / rear-angle full-body studio view of the exact same person wearing the exact same Pakistani kurta and trousers from this image, showing the back drape, knee-length hemline, side slits (chaak), and matching sleeve/hem border embroidery. Preserve identical hair, body proportions, trousers, shoes, and studio backdrop.',
}

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
        'Gemini API key placeholder is active. Add GEMINI_API_KEY in Vercel Environment Variables to enable live 3-View Modaya Studio generation.',
    })
  }

  try {
    const { result_image_base64, view_mode = 'three_quarter' } = req.body || {}
    if (!result_image_base64 || typeof result_image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing result_image_base64 payload.' })
    }

    const prompt = VIEW_PROMPTS[view_mode] || VIEW_PROMPTS.three_quarter
    const match = result_image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : result_image_base64

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
              { text: prompt },
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
        detail: data?.error?.message || 'Gemini 3-View generation failed.',
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
      view_mode,
      view_image: `data:${outMime};base64,${inline.data}`,
    })
  } catch (err) {
    return res.status(500).json({ detail: `3-View generation error: ${err.message}` })
  }
}
