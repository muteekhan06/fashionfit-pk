export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  const configured = Boolean(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE')
  return res.status(200).json({
    configured,
    model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    stages: ['person_studio_normalization', 'canonical_garment_extraction', 'three_view_studio'],
  })
}
