/**
 * Vercel Serverless Function: POST /api/gemini-prep-person
 * Precision Person Studio Normalizer with Dual-Key Auto-Failover
 * (Mutee Ur Rehman -> Hafiz Abdullah Muhammad)
 */

import { callGeminiWithFailover } from './_gemini.js'

const PERSON_PREP_PROMPT = `You are a precision studio fashion photo normalizer preparing an input portrait for Virtual Try-On.
Clean and enhance the lighting and background clarity of this person photograph while STRICTLY locking 100% of the person's exact original pose, body geometry, and identity.
Strict non-negotiable requirements:
1. ZERO POSE CHANGES: Preserve 100% of the woman's exact original pose, head angle, shoulder slope, arm and hand placement, leg stance, camera angle, framing, and scale pixel-for-pixel. Do NOT rotate, straighten, repose, or move her arms, hands, head, or body in any way.
2. Preserve 100% of her exact face, facial features, expression, skin tone, hair, age, and true body proportions without altering her identity or body shape.
3. Only clean up harsh shadows, uneven dim lighting, or distracting background noise into clean, even lighting while keeping her silhouette, lower trousers/bottoms, and footwear completely faithful to the original input photograph.
4. Output ONLY a single clean portrait photograph in the exact same pose and framing as the input—no split frames, no text, no watermarks, no added accessories.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { image_base64 } = req.body || {}
    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ detail: 'Missing image_base64 payload.' })
    }

    const match = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    const mimeType = match ? match[1] : 'image/jpeg'
    const rawData = match ? match[2] : image_base64

    const result = await callGeminiWithFailover({
      prompt: PERSON_PREP_PROMPT,
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
      prepped_person_image: result.base64Image,
    })
  } catch (err) {
    return res.status(500).json({ detail: `Person normalization error: ${err.message}` })
  }
}
