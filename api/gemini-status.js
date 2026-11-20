import { getGeminiKeyPool } from './_gemini.js'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const pool = getGeminiKeyPool()
  const configured = pool.length > 0

  return res.status(200).json({
    configured,
    key_pool_count: pool.length,
    failover_enabled: pool.length > 1,
    model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    stages: [
      'person_studio_normalization',
      'canonical_garment_extraction',
      'three_view_studio',
    ],
  })
}
