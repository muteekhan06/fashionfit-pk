/**
 * Vercel Serverless Function: POST /api/gemini-canonicalize
 * Stage 1 Generative Bridge with Dual-Key Auto-Failover
 * (Mutee Ur Rehman -> Hafiz Abdullah Muhammad)
 */

import { callGeminiWithFailover } from './_gemini.js'

const CANONICAL_PROMPT = `You are an elite e-commerce fashion studio retoucher and garment reconstruction specialist for Pakistani women's ethnic wear.
Transform this garment input—even if it is a minimal swatch, folded cloth, hanging kurta, wrinkled photo, or partially occluded model-worn shot—into a single, 100% complete, symmetrical, front-facing flat-lay studio product photograph of ONLY the Pakistani knee-length kurta/kameez on a pure solid white background (#FFFFFF).
Strict requirements:
1. Preserve the exact fabric color, weave, print motif, vertical neckline placket (gala) embroidery, sleeve cuff borders, and lower hemline (daaman) embroidery with extreme fidelity.
2. If the input is minimal, folded, cropped, or occluded by arms/dupatta/pose, faithfully complete and reconstruct the full knee-length straight kurta silhouette and both symmetrical full-length sleeves matching the exact fabric and design language of the input.
3. Completely remove any human model, hands, face, trousers/shalwar, dupatta, wooden hanger, wall, plants, floor rug, shadows, watermarks, or text.
4. Center the finished kurta cleanly in a 3:4 vertical frame with crisp, shadowless overhead studio lighting so downstream Virtual Try-On transfers it with near-100% accuracy.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { image_base64, garment_hint, garment_category = 'kurta' } = req.body || {}
    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing image_base64 payload.' })
    }

    const match = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : image_base64

    let basePrompt = CANONICAL_PROMPT
    if (garment_category === 'lehenga') {
      basePrompt = `You are an elite e-commerce fashion studio retoucher for Pakistani bridal and wedding wear.
Transform this wedding lehenga input into a single, 100% complete, symmetrical, front-facing flat-lay studio product photograph of the Pakistani embroidered choli blouse and wide A-line flared wedding lehenga skirt on a pure solid white background (#FFFFFF).
Preserve exact fabric colors, antique-gold zardozi, gota, and scalloped hem borders. Remove any human model, mannequin, shadows, or background clutter.`
    } else if (garment_category === 'kids') {
      basePrompt = `You are an elite e-commerce fashion studio retoucher for Pakistani kids' ethnic wear.
Transform this kids' ethnic outfit input into a single, 100% complete, symmetrical, front-facing flat-lay studio product photograph of the Pakistani girl's kurta/frock/sharara on a pure solid white background (#FFFFFF).
Preserve exact fabric colors, embroidery, and child-proportioned garment cut. Remove any human model, hanger, shadows, or background clutter.`
    }

    const promptText = garment_hint
      ? `${basePrompt}\nAdditional garment context: ${garment_hint}`
      : basePrompt

    const result = await callGeminiWithFailover({
      prompt: promptText,
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
      active_key_owner: result.activeKeyOwner,
      failover_triggered: result.failoverTriggered,
      canonical_image: result.base64Image,
    })
  } catch (err) {
    return res.status(500).json({ detail: `Canonicalization error: ${err.message}` })
  }
}
