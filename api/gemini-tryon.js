/**
 * Vercel Serverless Function: POST /api/gemini-tryon
 * End-to-End Cloud Virtual Try-On Engine with 3-Key Auto-Failover.
 * Supports:
 *  - upper_body     (Women's Pakistani Kurta / Kameez)
 *  - kids_ethnic    (Girl Child Pakistani Ethnic Wear)
 *  - cross_age      (Cross-Age Visual Appearance Transfer: Adult <-> Girl Child)
 *  - flared_lehenga (Full Bridal & Wedding Flared A-Line Lehenga Choli)
 */

import { callGeminiMultiImageWithFailover } from './_gemini.js'

function parseBase64(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (match) return { mimeType: match[1], rawData: match[2] }
  return { mimeType: 'image/jpeg', rawData: String(dataUrl || '') }
}

function buildTryOnPrompt({ tryonMode, personAgeGroup, garmentCategory, preserveDupatta }) {
  const subjectLabel =
    personAgeGroup === 'child'
      ? 'young Pakistani girl child (strictly preserve her exact child age, face, height, and natural ~1:4.5 child head-to-body proportions)'
      : 'Pakistani woman (strictly preserve her exact adult face, age, identity, and natural body proportions)'

  const dupattaRule = preserveDupatta
    ? 'If the person already wears a separate draped dupatta or scarf that does not conflict with a full bridal set, preserve its natural drape cleanly.'
    : 'Blend the neckline and shoulders naturally with the target garment.'

  if (tryonMode === 'flared_lehenga' || garmentCategory === 'lehenga') {
    return `You are an elite Pakistani bridal couture Virtual Try-On engine.
Image 1 is the target person: a ${subjectLabel}.
Image 2 is the reference Pakistani wedding lehenga choli / bridal formal outfit.
Dress the person in Image 1 wearing the EXACT bridal wedding lehenga choli outfit from Image 2.
Strict non-negotiable rules:
1. IDENTITY & POSE LOCK: Preserve 100% of the person's exact face, facial features, expression, skin tone, hair, age, hands, and studio background from Image 1.
2. FLARED A-LINE LEHENGA SILHOUETTE: Replace BOTH the upper top and lower garment with the complete embroidered choli/blouse and WIDE, FLOWING A-LINE FLARED WEDDING LEHENGA SKIRT extending gracefully to the floor—do NOT squeeze the lehenga into tight straight trousers.
3. BRIDAL EMBROIDERY FIDELITY: Reproduce the exact fabric color, antique-gold zardozi, gota patti, dabka, pearl work, neckline border, and heavy scalloped lehenga hem border from Image 2 with razor-sharp detail and realistic fabric folds.
4. ${dupattaRule}
5. Output ONLY a single photorealistic full-body studio photograph—no collage, no split screen, no text, no watermarks.`
  }

  if (tryonMode === 'cross_age') {
    const direction =
      personAgeGroup === 'child'
        ? 'Scale the adult ethnic garment design from Image 2 down into an age-appropriate, comfortable child-proportioned silhouette tailored naturally to the young girl child in Image 1.'
        : 'Scale the kids ethnic garment design and embroidery motifs from Image 2 proportionally up into a refined full-length adult Pakistani silhouette tailored naturally to the woman in Image 1.'
    return `You are an elite Pakistani fashion Cross-Age Virtual Try-On engine specializing in visual appearance transfer across age groups.
Image 1 is the target person: a ${subjectLabel}.
Image 2 is the reference Pakistani ethnic garment from another age group.
Perform seamless Cross-Age Visual Appearance Transfer so the person in Image 1 wears the garment design from Image 2.
Strict non-negotiable rules:
1. IDENTITY & AGE LOCK: Preserve 100% of the target person's exact face, exact age, height, body proportions, pose, hands, hair, and background from Image 1. NEVER age up a child or age down an adult.
2. PROPORTIONAL SCALING: ${direction} Keep sleeve lengths, neckline modesty, and hemline natural for the target person's stature without stretching or distorting embroidery motifs.
3. TEXTURE & MOTIF FIDELITY: Transfer the exact fabric color, print pattern, neckline gala embroidery, and border work from Image 2 with crisp photographic realism.
4. ${dupattaRule}
5. Output ONLY a single photorealistic full-body photograph—no split screen, no text, no watermarks.`
  }

  if (tryonMode === 'kids_ethnic' || personAgeGroup === 'child') {
    return `You are an elite Pakistani kids' ethnic fashion Virtual Try-On engine.
Image 1 is the target young Pakistani girl child: ${subjectLabel}.
Image 2 is the reference Pakistani girl's ethnic outfit (kurta, festive frock/pishwas, or sharara set).
Dress the girl child in Image 1 wearing the EXACT Pakistani kids' ethnic outfit from Image 2.
Strict non-negotiable rules:
1. CHILD IDENTITY & PROPORTION LOCK: Preserve 100% of the girl child's exact face, smile, hair, skin tone, child age, pose, hands, and studio background from Image 1.
2. NATURAL KIDS FIT: Drape the garment naturally to a child's proportions—preserving full festive frock flare, embroidered neckline, sleeves, and matching shalwar/sharara if shown in Image 2.
3. FABRIC & EMBROIDERY FIDELITY: Keep exact colors, gota patti, resham motifs, and border details from Image 2 sharp and realistic.
4. Output ONLY a single photorealistic studio portrait—no split screen, no text, no watermarks.`
  }

  // Default: Women's Pakistani Kurta / Kameez (upper_body)
  return `You are an elite Pakistani women's fashion Virtual Try-On engine.
Image 1 is the target person: a ${subjectLabel}.
Image 2 is the reference Pakistani kurta/kameez.
Dress the person in Image 1 wearing the EXACT Pakistani kurta/kameez from Image 2.
Strict non-negotiable rules:
1. IDENTITY & POSE LOCK: Preserve 100% of the person's exact face, hair, skin tone, pose, arms, hands, lower trousers/shalwar, footwear, and background from Image 1.
2. TRUE PAKISTANI KURTA DRAPE: Maintain authentic knee-length straight kameez proportions, side slits (chaak), full sleeve length, and neckline embroidery (gala) from Image 2—never crop into a short Western top.
3. EMBROIDERY & PRINT FIDELITY: Reproduce the exact fabric color, weave, floral/zari embroidery, sleeve cuffs, and daaman border from Image 2 with natural shadows and folds.
4. ${dupattaRule}
5. Output ONLY a single photorealistic studio portrait—no split screen, no text, no watermarks.`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      person_image_base64,
      garment_image_base64,
      tryon_mode = 'upper_body',
      person_age_group = 'adult',
      garment_category = 'kurta',
      preserve_dupatta = true,
    } = req.body || {}

    if (!person_image_base64 || !garment_image_base64) {
      return res.status(400).json({ detail: 'Both person_image_base64 and garment_image_base64 are required.' })
    }

    const personImg = parseBase64(person_image_base64)
    const garmentImg = parseBase64(garment_image_base64)

    const prompt = buildTryOnPrompt({
      tryonMode: tryon_mode,
      personAgeGroup: person_age_group,
      garmentCategory: garment_category,
      preserveDupatta: Boolean(preserve_dupatta),
    })

    const t0 = Date.now()
    const result = await callGeminiMultiImageWithFailover({
      prompt,
      images: [personImg, garmentImg],
    })
    const seconds = Number(((Date.now() - t0) / 1000).toFixed(2))

    if (!result.ok) {
      return res.status(result.status).json({
        code: result.code,
        detail: result.error,
        details: result.details,
      })
    }

    return res.status(200).json({
      status: 'ok',
      engine: 'cloud_ai_studio',
      model_id: result.model,
      tryon_mode,
      person_age_group,
      garment_category,
      seconds,
      active_key_owner: result.activeKeyOwner,
      failover_triggered: result.failoverTriggered,
      result_image: result.base64Image,
    })
  } catch (err) {
    return res.status(500).json({ detail: `Cloud try-on error: ${err.message}` })
  }
}
