/**
 * Vercel Serverless Function: POST /api/gemini-prep-person
 * Precision Person Studio Normalizer with Dual-Key Auto-Failover
 * (Mutee Ur Rehman -> Hafiz Abdullah Muhammad)
 */

import { callGeminiWithFailover } from './_gemini.js'

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
