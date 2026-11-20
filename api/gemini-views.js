/**
 * Vercel Serverless Function: POST /api/gemini-views
 * Stage 3 Modaya-Style 3-View Studio Generator with Dual-Key Auto-Failover
 * (Mutee Ur Rehman -> Hafiz Abdullah Muhammad)
 */

import { callGeminiWithFailover } from './_gemini.js'

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

  try {
    const { result_image_base64, view_mode = 'three_quarter' } = req.body || {}
    if (!result_image_base64 || typeof result_image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing result_image_base64 payload.' })
    }

    const prompt = VIEW_PROMPTS[view_mode] || VIEW_PROMPTS.three_quarter
    const match = result_image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : result_image_base64

    const result = await callGeminiWithFailover({
      prompt,
      mimeType,
      rawData,
    })

    if (!result.ok) {
      return res.status(result.status).json({
        code: result.code,
        detail: result.error,
        details: result.details,
      })
    }

    return res.status(200).json({
      status: 'ok',
      model: result.model,
      view_mode,
      active_key_owner: result.activeKeyOwner,
      failover_triggered: result.failoverTriggered,
      view_image: result.base64Image,
    })
  } catch (err) {
    return res.status(500).json({ detail: `3-View generation error: ${err.message}` })
  }
}
