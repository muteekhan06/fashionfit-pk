import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Scissors,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wand2,
  Camera,
  Settings2,
  UserCheck,
  Shirt,
  ArrowLeftRight,
  Repeat,
  ShieldCheck,
} from 'lucide-react'
import {
  STUDIO_POSES,
  STUDIO_MODELS,
  WARDROBE_CATEGORIES,
  ALL_WARDROBE_ITEMS,
  STUDIO_TIPS,
} from '../data/verifiedData.js'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function urlToFile(url, filename = 'image.jpg') {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

const STUDIO_MODEL_PATHS = new Set(STUDIO_MODELS.map((m) => m.image))

export default function StudioPage({
  initialTab = 'photo',
  initialKurtaId = null,
  onBackHome,
  health,
  colabUrlInput,
  setColabUrlInput,
  colabStatusMsg,
  onSaveColabUrl,
}) {
  const initialGarment =
    ALL_WARDROBE_ITEMS.find((item) => item.id === initialKurtaId) || ALL_WARDROBE_ITEMS[0]

  const [activeTab, setActiveTab] = useState(initialTab)
  const [showServerPanel, setShowServerPanel] = useState(false)

  // Person state (Adult or Girl Child)
  const [personFile, setPersonFile] = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [personAgeGroup, setPersonAgeGroup] = useState(
    initialGarment.category === 'kids' ? 'child' : 'adult'
  )
  const [preppedPersonPreview, setPreppedPersonPreview] = useState(null)
  const [autoRefinePerson, setAutoRefinePerson] = useState(true)
  const [personLoading, setPersonLoading] = useState(false)

  // Garment state (Women's Kurtas, Kids Girls, Wedding Lehengas, or Custom)
  const [wardrobeCategory, setWardrobeCategory] = useState(initialGarment.category || 'kurta')
  const [selectedKurtaId, setSelectedKurtaId] = useState(initialGarment.id)
  const [garmentFile, setGarmentFile] = useState(null)
  const [garmentPreview, setGarmentPreview] = useState(initialGarment.image)
  const [canonicalPreview, setCanonicalPreview] = useState(null)
  const [autoPerfectGarment, setAutoPerfectGarment] = useState(true)
  const [preserveDupatta, setPreserveDupatta] = useState(true)
  const [garmentLoading, setGarmentLoading] = useState(false)

  // Try-On & Pose state
  const [selectedModel, setSelectedModel] = useState('catvton')
  const [demoPose, setDemoPose] = useState('front')
  const [resultPose, setResultPose] = useState('front')
  const [generatedPoses, setGeneratedPoses] = useState({})
  const [vtonResult, setVtonResult] = useState(null)
  const [showOriginalToggle, setShowOriginalToggle] = useState(false)

  // Cutout state
  const [segFile, setSegFile] = useState(null)
  const [segPreview, setSegPreview] = useState(null)
  const [segVariant, setSegVariant] = useState('adapted')
  const [segResult, setSegResult] = useState(null)

  const [geminiReady, setGeminiReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [poseLoading, setPoseLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    fetch('/api/gemini-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setGeminiReady(Boolean(d.configured))
      })
      .catch(() => {})
  }, [])

  const isGpuConnected = health?.mode === 'colab_gpu_live'
  const directEndpoint = (path) => {
    if (health?.direct && health?.colab_gpu_url) {
      return `${health.colab_gpu_url}${path}`
    }
    return `/api${path}`
  }

  // Derive active garment metadata & smart try-on mode automatically
  const activeGarmentItem = ALL_WARDROBE_ITEMS.find((item) => item.id === selectedKurtaId)
  const effectiveGarmentCategory = activeGarmentItem ? activeGarmentItem.category : wardrobeCategory
  const effectiveGarmentAge = effectiveGarmentCategory === 'kids' ? 'child' : 'adult'
  const isCrossAge = personAgeGroup !== effectiveGarmentAge

  const activeTryonMode =
    effectiveGarmentCategory === 'lehenga'
      ? isCrossAge
        ? 'cross_age'
        : 'flared_lehenga'
      : isCrossAge
        ? 'cross_age'
        : effectiveGarmentCategory === 'kids'
          ? 'kids_ethnic'
          : 'upper_body'

  const activeModeBadge =
    activeTryonMode === 'flared_lehenga'
      ? {
          title: 'Flared A-Line Wedding Lehenga Mode',
          desc: 'Full choli & wide flared bridal skirt silhouette with embroidery lock',
          tone: 'bg-rose-50 text-[#9B1D4A] border-rose-200',
        }
      : activeTryonMode === 'cross_age'
        ? {
            title:
              personAgeGroup === 'child'
                ? 'Cross-Age Transfer (Adult Outfit → Girl Child)'
                : 'Cross-Age Transfer (Kids Outfit → Adult)',
            desc: 'Visual fabric & motif transfer scaled proportionally to target stature',
            tone: 'bg-amber-50 text-amber-800 border-amber-200',
          }
        : activeTryonMode === 'kids_ethnic'
          ? {
              title: 'Kids Ethnic Fit (Girl Child)',
              desc: 'Proportion-aware kids silhouette preserving natural child stature',
              tone: 'bg-emerald-50 text-[#0F5C4D] border-emerald-200',
            }
          : {
              title: 'Pakistani Kurta Fit',
              desc: 'True knee-length kameez drape, gala embroidery & dupatta protection',
              tone: 'bg-slate-50 text-slate-700 border-slate-200',
            }

  const activeCategoryObj =
    WARDROBE_CATEGORIES.find((c) => c.id === wardrobeCategory) || WARDROBE_CATEGORIES[0]

  const handlePersonUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPersonFile(file)
    setPersonPreview(URL.createObjectURL(file))
    setPreppedPersonPreview(null)
    setError('')
  }

  const handleUseStudioModel = async (modelId = 'adult') => {
    const model = STUDIO_MODELS.find((m) => m.id === modelId) || STUDIO_MODELS[0]
    setError('')
    setPersonAgeGroup(model.ageGroup)
    setPersonPreview(model.image)
    setPreppedPersonPreview(null)
    try {
      const f = await urlToFile(model.image, model.filename)
      setPersonFile(f)
    } catch {
      setError('Could not load studio model.')
    }
  }

  const handleSwapCrossAge = async () => {
    const nextAge = personAgeGroup === 'adult' ? 'child' : 'adult'
    if (!personPreview || STUDIO_MODEL_PATHS.has(personPreview)) {
      await handleUseStudioModel(nextAge)
    } else {
      setPersonAgeGroup(nextAge)
    }
  }

  const handleSelectCategory = (catId) => {
    setWardrobeCategory(catId)
    const cat = WARDROBE_CATEGORIES.find((c) => c.id === catId)
    if (cat && cat.items.length > 0 && selectedKurtaId !== 'custom') {
      const first = cat.items[0]
      setSelectedKurtaId(first.id)
      setGarmentFile(null)
      setGarmentPreview(first.image)
      setCanonicalPreview(null)
    }
    setError('')
  }

  const handleSelectPredefinedKurta = (kurta) => {
    setSelectedKurtaId(kurta.id)
    setWardrobeCategory(kurta.category)
    setGarmentFile(null)
    setGarmentPreview(kurta.image)
    setCanonicalPreview(null)
    setError('')
  }

  const handleGarmentUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedKurtaId('custom')
    setGarmentFile(file)
    setGarmentPreview(URL.createObjectURL(file))
    setCanonicalPreview(null)
    setError('')
  }

  const runRefinePerson = async () => {
    if (!personFile && !personPreview) {
      setError('Upload your photo first to refine it.')
      return null
    }
    setPersonLoading(true)
    setError('')
    try {
      const fileObj = personFile || (await urlToFile(personPreview, 'person.jpg'))
      const dataUrl = await fileToDataUrl(fileObj)
      const res = await fetch('/api/gemini-prep-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl, person_age_group: personAgeGroup }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not refine person photo.')
      setPreppedPersonPreview(data.prepped_person_image)
      return data.prepped_person_image
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setPersonLoading(false)
    }
  }

  const runPerfectGarment = async () => {
    if (!garmentFile && !garmentPreview) {
      setError('Select or upload an outfit photo first.')
      return null
    }
    setGarmentLoading(true)
    setError('')
    try {
      const fileObj = garmentFile || (await urlToFile(garmentPreview, 'garment.jpg'))
      const dataUrl = await fileToDataUrl(fileObj)
      const res = await fetch('/api/gemini-canonicalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: dataUrl,
          garment_category: effectiveGarmentCategory,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not refine garment photo.')
      setCanonicalPreview(data.canonical_image)
      return data.canonical_image
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setGarmentLoading(false)
    }
  }

  const runVton = async () => {
    if (!personPreview) {
      setError('Please upload a photo or pick Adult Model / Girl Child above.')
      return
    }
    if (!garmentPreview) {
      setError('Please choose an outfit from the wardrobe or upload your own.')
      return
    }
    if (!isGpuConnected && !geminiReady) {
      setShowServerPanel(true)
      setError('Connect your live studio server URL in the top bar or configure Cloud AI keys.')
      return
    }

    setLoading(true)
    setError('')
    setVtonResult(null)
    setGeneratedPoses({})
    setResultPose('front')
    setShowOriginalToggle(false)

    try {
      let personToSend = personFile || (await urlToFile(personPreview, 'person.jpg'))
      let garmentToSend = garmentFile || (await urlToFile(garmentPreview, 'garment.jpg'))

      // Precision Person Normalization (skip for built-in studio models)
      if (autoRefinePerson && geminiReady && !STUDIO_MODEL_PATHS.has(personPreview)) {
        const preppedUrl = preppedPersonPreview || (await runRefinePerson())
        if (preppedUrl) {
          personToSend = await urlToFile(preppedUrl, 'prepped_person.png')
        }
      }

      // Precision Garment Reconstruction (skip for built-in pure-white flat-lays)
      if (autoPerfectGarment && geminiReady && selectedKurtaId === 'custom') {
        const canonicalUrl = canonicalPreview || (await runPerfectGarment())
        if (canonicalUrl) {
          garmentToSend = await urlToFile(canonicalUrl, 'canonical_garment.png')
        }
      }

      let data
      if (isGpuConnected) {
        // Path A: Live Colab T4 GPU Server (CatVTON + Gold SegFormer + Flared A-Line Mask)
        const fd = new FormData()
        fd.append('person_image', personToSend)
        fd.append('garment_image', garmentToSend)
        fd.append('model_id', selectedModel)
        fd.append('category', effectiveGarmentCategory === 'lehenga' ? 'one-pieces' : 'tops')
        fd.append('garment_photo_type', 'flat-lay')
        fd.append('tryon_mode', activeTryonMode)
        fd.append('person_age_group', personAgeGroup)
        fd.append('preserve_dupatta', String(preserveDupatta))
        fd.append('seed', '42')

        const res = await fetch(directEndpoint('/vton'), { method: 'POST', body: fd })
        data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Try-on generation failed.')
      } else {
        // Path B: Built-in Cloud AI Studio Engine (Zero-Setup Live Try-On on Vercel)
        const [personDataUrl, garmentDataUrl] = await Promise.all([
          fileToDataUrl(personToSend),
          fileToDataUrl(garmentToSend),
        ])
        const res = await fetch('/api/gemini-tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_image_base64: personDataUrl,
            garment_image_base64: garmentDataUrl,
            tryon_mode: activeTryonMode,
            person_age_group: personAgeGroup,
            garment_category: effectiveGarmentCategory,
            preserve_dupatta: preserveDupatta,
          }),
        })
        data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Cloud try-on generation failed.')
      }

      setError('')
      setVtonResult(data)
      setGeneratedPoses({ front: data.result_image })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResultPose = async (poseId) => {
    setResultPose(poseId)
    if (generatedPoses[poseId] || !vtonResult?.result_image) return
    setPoseLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gemini-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_image_base64: vtonResult.result_image,
          view_mode: poseId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not generate pose angle.')
      setGeneratedPoses((prev) => ({ ...prev, [poseId]: data.view_image }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPoseLoading(false)
    }
  }

  const runSegment = async () => {
    if (!segFile) {
      setError('Upload a full-body outfit photo first.')
      return
    }
    if (!isGpuConnected) {
      setShowServerPanel(true)
      setError('Connect your live studio server URL in the top bar first.')
      return
    }
    setLoading(true)
    setError('')
    setSegResult(null)
    try {
      const fd = new FormData()
      fd.append('image', segFile)
      fd.append('seg_variant', segVariant)
      const res = await fetch(directEndpoint('/segment'), { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Extraction failed.')
      setSegResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activeDemoPoseObj = STUDIO_POSES.find((p) => p.id === demoPose) || STUDIO_POSES[0]

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      {/* Dedicated Studio Top Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0F5C4D] to-[#9B1D4A] text-white font-display font-bold text-sm flex items-center justify-center">
                F
              </span>
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900">
                FashionFit<span className="text-[#9B1D4A]">-PK</span>{' '}
                <span className="font-medium text-slate-400 hidden md:inline">Studio</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {geminiReady && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                <Wand2 className="w-3.5 h-3.5" />
                Cloud AI Ready
              </span>
            )}
            <button
              onClick={() => setShowServerPanel(!showServerPanel)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                isGpuConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {isGpuConnected ? 'Live GPU On' : 'Connect GPU'}
            </button>
          </div>
        </div>

        {/* Collapsible Live Server Bar */}
        {showServerPanel && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Optional Colab T4 GPU URL: </span>
                {colabStatusMsg ||
                  (isGpuConnected
                    ? 'Connected to live Colab GPU'
                    : geminiReady
                      ? 'Cloud AI Studio is active by default — paste a Colab URL to switch to T4 CatVTON GPU'
                      : 'Paste your live server URL to run custom try-on')}
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="url"
                  value={colabUrlInput}
                  onChange={(e) => setColabUrlInput(e.target.value)}
                  placeholder="https://your-server.trycloudflare.com"
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white flex-1 sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#0F5C4D]"
                />
                <button
                  onClick={onSaveColabUrl}
                  className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#0F5C4D] text-white hover:bg-[#0b473b] transition cursor-pointer"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Clean Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex flex-wrap gap-2 bg-white p-1.5 rounded-full border border-slate-200/80 shadow-xs">
            {[
              { id: 'photo', label: 'Virtual Try-On', icon: Sparkles },
              { id: 'demo', label: '3-Pose Runway Demo', icon: Camera },
              { id: 'segment', label: 'Garment Cutout', icon: Scissors },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id)
                  setError('')
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeTab === id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: FULL-PAGE VIRTUAL TRY-ON STUDIO */}
        {activeTab === 'photo' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Controls, Uploads, Wardrobe & Tips */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step 1: Person Photo (Adult & Girl Child) */}
              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#0F5C4D] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">Your Photo</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {STUDIO_MODELS.map((m) => {
                      const active = personPreview === m.image
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleUseStudioModel(m.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                            active
                              ? 'bg-[#0F5C4D] text-white border-[#0F5C4D]'
                              : 'bg-white text-[#0F5C4D] border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {personPreview ? (
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#FAF8F5] border border-slate-200/70">
                    <img
                      src={preppedPersonPreview || personPreview}
                      alt="Selected person"
                      className="w-20 h-28 object-cover rounded-xl bg-white border border-slate-200 shrink-0"
                    />
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {preppedPersonPreview
                            ? 'Studio-Normalized Ready'
                            : personAgeGroup === 'child'
                              ? 'Girl Child Photo Ready'
                              : 'Adult Photo Ready'}
                        </p>
                      </div>

                      {/* Subject Age Toggle (keeps Cross-Age detection exact on custom uploads) */}
                      <div className="inline-flex rounded-full bg-white border border-slate-200 p-0.5">
                        {[
                          { id: 'adult', label: 'Adult' },
                          { id: 'child', label: 'Girl Child' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setPersonAgeGroup(opt.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                              personAgeGroup === opt.id
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-300 hover:bg-slate-50">
                          Change
                          <input type="file" accept="image/*" className="hidden" onChange={handlePersonUpload} />
                        </label>
                        {!STUDIO_MODEL_PATHS.has(personPreview) && (
                          <button
                            onClick={runRefinePerson}
                            disabled={personLoading}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                          >
                            {personLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Studio Refine
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0F5C4D] bg-[#FAF8F5]/70 p-6 text-center transition">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">Upload a full-body photo</p>
                    <p className="text-xs text-slate-500 mt-1">
                      JPG or PNG • Or select <strong>Adult Model</strong> / <strong>Girl Child</strong> above
                    </p>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePersonUpload} />
                  </label>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRefinePerson}
                      onChange={(e) => setAutoRefinePerson(e.target.checked)}
                      className="rounded border-slate-300 text-[#0F5C4D] focus:ring-[#0F5C4D]"
                    />
                    Auto-clean lighting &amp; background on uploaded photo for higher accuracy
                  </label>
                  {personAgeGroup === 'child' && (
                    <p className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 rounded-xl px-3 py-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      Privacy-first: Minor photos are processed strictly in-memory with zero storage.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Predefined Wardrobe (Women's Kurtas, Kids Girls, Wedding Lehengas) OR Upload */}
              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#9B1D4A] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">Choose or Upload Outfit</h2>
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B1D4A] hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Own
                    <input type="file" accept="image/*" className="hidden" onChange={handleGarmentUpload} />
                  </label>
                </div>

                {/* Clean 3-Category Wardrobe Switcher */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#FAF8F5] border border-slate-200/70">
                  {WARDROBE_CATEGORIES.map((cat) => {
                    const active = wardrobeCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>

                {/* Predefined Wardrobe Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {activeCategoryObj.items.map((kurta) => {
                    const active = selectedKurtaId === kurta.id
                    return (
                      <button
                        key={kurta.id}
                        onClick={() => handleSelectPredefinedKurta(kurta)}
                        className={`group rounded-2xl p-2 text-left border transition cursor-pointer ${
                          active
                            ? 'border-[#9B1D4A] bg-rose-50/40 ring-1 ring-[#9B1D4A]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="aspect-[3/4] rounded-xl bg-white overflow-hidden border border-slate-100 mb-2">
                          <img
                            src={kurta.image}
                            alt={kurta.name}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2">
                          {kurta.name}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Custom Garment Preview Bar */}
                {selectedKurtaId === 'custom' && garmentPreview && (
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#FAF8F5] border border-slate-200/80">
                    <img
                      src={canonicalPreview || garmentPreview}
                      alt="Custom outfit"
                      className="w-16 h-20 object-contain rounded-lg bg-white border border-slate-200"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs font-bold text-slate-800">
                        {canonicalPreview ? 'Studio-Perfected Outfit Ready' : 'Custom Outfit Uploaded'}
                      </p>
                      <button
                        onClick={runPerfectGarment}
                        disabled={garmentLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-[#0F5C4D] text-white hover:bg-[#0b473b] disabled:opacity-50 cursor-pointer"
                      >
                        {garmentLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {garmentLoading ? 'Perfecting...' : 'Perfect Garment Shape'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Smart Mode Bar (Auto-detects Kids, Cross-Age, and Flared Wedding Lehenga) */}
                <div className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-2 ${activeModeBadge.tone}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight">{activeModeBadge.title}</p>
                    <p className="text-[11px] opacity-85 mt-0.5 leading-snug">{activeModeBadge.desc}</p>
                  </div>
                  <button
                    onClick={handleSwapCrossAge}
                    title="Toggle Adult vs Girl Child for Cross-Age Try-On"
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-white/90 text-slate-800 border border-slate-200 hover:bg-white transition cursor-pointer"
                  >
                    <Repeat className="w-3 h-3" />
                    {personAgeGroup === 'adult' ? 'Try on Child' : 'Try on Adult'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoPerfectGarment}
                      onChange={(e) => setAutoPerfectGarment(e.target.checked)}
                      className="rounded border-slate-300 text-[#9B1D4A] focus:ring-[#9B1D4A]"
                    />
                    Auto-reconstruct &amp; clean custom garment uploads before try-on
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveDupatta}
                      onChange={(e) => setPreserveDupatta(e.target.checked)}
                      className="rounded border-slate-300 text-[#0F5C4D] focus:ring-[#0F5C4D]"
                    />
                    Preserve draped dupatta layer during outfit swap
                  </label>
                </div>

                <button
                  onClick={runVton}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] text-white font-bold text-sm hover:opacity-95 disabled:opacity-50 shadow-md transition cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? 'Creating Your Look...' : 'Generate Virtual Try-On'}
                </button>
              </div>

              {/* Clean Professional Instructions Card */}
              <div className="rounded-3xl bg-white border border-rose-100 p-5 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9B1D4A]">
                  Tips for Best Results
                </p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {STUDIO_TIPS.map((tip) => (
                    <li key={tip} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F5C4D] shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* RIGHT COLUMN: Spacious Studio Result Canvas & 3-Pose Switcher */}
            <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              {/* 3 Meaningful Pose Tabs */}
              <div className="grid grid-cols-3 gap-2.5">
                {STUDIO_POSES.map((pose) => {
                  const active = (vtonResult ? resultPose : demoPose) === pose.id
                  const ready = Boolean(generatedPoses[pose.id])
                  return (
                    <button
                      key={pose.id}
                      onClick={() => (vtonResult ? handleSelectResultPose(pose.id) : setDemoPose(pose.id))}
                      className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-[#FAF8F5] text-slate-800 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold">{pose.label}</span>
                        {vtonResult &&
                          (ready ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ))}
                      </div>
                      <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {pose.desc}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Studio Display Stage */}
              {vtonResult ? (
                <div className="space-y-4">
                  <div className="relative rounded-2xl bg-[#FAF8F5] border border-slate-200/70 overflow-hidden flex items-center justify-center min-h-[480px]">
                    {poseLoading ? (
                      <div className="flex flex-col items-center gap-3 text-slate-500 py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#9B1D4A]" />
                        <p className="text-xs font-semibold">
                          Generating {STUDIO_POSES.find((p) => p.id === resultPose)?.label}...
                        </p>
                      </div>
                    ) : (
                      <img
                        src={
                          showOriginalToggle
                            ? preppedPersonPreview || personPreview
                            : generatedPoses[resultPose] || vtonResult.result_image
                        }
                        alt="Virtual try-on output"
                        className="w-full max-h-[540px] object-contain"
                      />
                    )}
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 backdrop-blur border border-slate-200 text-[11px] font-bold text-slate-800 shadow-xs">
                      {activeModeBadge.title}
                      {vtonResult.seconds ? ` • ${vtonResult.seconds}s` : ''}
                    </span>
                    <button
                      onClick={() => setShowOriginalToggle(!showOriginalToggle)}
                      className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur border border-slate-200 text-xs font-bold text-slate-800 shadow-sm hover:bg-white cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {showOriginalToggle ? 'Show Try-On' : 'Compare Original'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Engine:{' '}
                      <strong className="text-slate-700">
                        {vtonResult.engine === 'colab_gpu_live' ? 'Live Colab T4 GPU' : 'Cloud AI Studio'}
                      </strong>{' '}
                      • Click Angled Runway or Back Silhouette above for more angles
                    </span>
                    <button
                      onClick={() => {
                        setVtonResult(null)
                        setGeneratedPoses({})
                      }}
                      className="font-semibold text-[#9B1D4A] hover:underline cursor-pointer"
                    >
                      Start New Look
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200/70 p-6 min-h-[480px] flex flex-col items-center justify-center text-center space-y-6">
                  {personPreview ? (
                    <div className="space-y-4 w-full max-w-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs">
                          <p className="text-[11px] font-bold text-slate-500 mb-2">
                            {personAgeGroup === 'child' ? 'Girl Child Model' : 'Selected Person'}
                          </p>
                          <img
                            src={preppedPersonPreview || personPreview}
                            alt="Person ready"
                            className="w-full h-64 object-contain rounded-xl"
                          />
                        </div>
                        <div className="rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs">
                          <p className="text-[11px] font-bold text-slate-500 mb-2">
                            {effectiveGarmentCategory === 'lehenga'
                              ? 'Selected Wedding Lehenga'
                              : effectiveGarmentCategory === 'kids'
                                ? 'Selected Kids Outfit'
                                : 'Selected Kurta'}
                          </p>
                          <img
                            src={canonicalPreview || garmentPreview}
                            alt="Outfit ready"
                            className="w-full h-64 object-contain rounded-xl"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Ready for <strong>{activeModeBadge.title}</strong> — click{' '}
                        <strong>Generate Virtual Try-On</strong> on the left.
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-sm space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-[#0F5C4D]">
                        <Shirt className="w-7 h-7" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-slate-900">Your Dressing Room Awaits</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pick <strong>Adult Model</strong> or <strong>Girl Child</strong> (or upload your own photo),
                        choose from <strong>Women’s Kurtas</strong>, <strong>Kids (Girls)</strong>, or{' '}
                        <strong>Wedding Lehengas</strong>, and click <strong>Generate Virtual Try-On</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE 3-POSE RUNWAY DEMO (REAL DISTINCT STUDIO POSES) */}
        {activeTab === 'demo' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#0F5C4D]">3-Pose Showcase</p>
                <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                  Emerald Zari Embroidered Kurta
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Explore how FashionFit-PK presents every Pakistani outfit across three dedicated studio poses—keeping
                  embroidery, sleeve length, and hemline consistent from every angle.
                </p>
              </div>

              <div className="space-y-2.5">
                {STUDIO_POSES.map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => setDemoPose(pose.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      demoPose === pose.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold">{pose.label}</p>
                      <p className={`text-xs mt-0.5 ${demoPose === pose.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {pose.desc}
                      </p>
                    </div>
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 ${demoPose === pose.id ? 'text-emerald-400' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('photo')}
                  className="w-full py-3 rounded-full bg-[#0F5C4D] text-white text-sm font-semibold hover:bg-[#0b473b] transition cursor-pointer"
                >
                  Try This Kurta on Your Photo →
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs">
              <div className="relative rounded-2xl overflow-hidden bg-[#FAF8F5] flex items-center justify-center min-h-[480px]">
                <img
                  key={activeDemoPoseObj.id}
                  src={activeDemoPoseObj.demoImage}
                  alt={activeDemoPoseObj.label}
                  className="w-full max-h-[600px] object-contain"
                />
                <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur text-xs font-bold text-slate-900 shadow-xs">
                  {activeDemoPoseObj.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GARMENT CUTOUT */}
        {activeTab === 'segment' && (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pakistani Outfit Cutout Tool</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload any catalog photo to cleanly isolate the kurta, lehenga, and dupatta.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={segVariant}
                  onChange={(e) => setSegVariant(e.target.value)}
                  className="text-xs px-3.5 py-2 rounded-full border border-slate-300 bg-white font-medium text-slate-700"
                >
                  <option value="adapted">Pakistani Ethnic Mode (Recommended)</option>
                  <option value="baseline">Standard Mode</option>
                </select>
                <label className="cursor-pointer text-xs font-semibold px-4 py-2 rounded-full bg-[#FAF8F5] border border-slate-300 hover:bg-slate-100">
                  Upload Outfit
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setSegFile(f)
                        setSegPreview(URL.createObjectURL(f))
                        setSegResult(null)
                      }
                    }}
                  />
                </label>
                <button
                  onClick={runSegment}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-full bg-[#0F5C4D] text-white hover:bg-[#0b473b] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                  Extract Cutout
                </button>
              </div>
            </div>

            {segResult ? (
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  { label: 'Original', src: segPreview },
                  { label: '4-Class Overlay', src: segResult.overlay_image },
                  { label: 'Isolated Garment', src: segResult.kurta_cutout_image },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3 space-y-2">
                    <p className="text-xs font-bold text-slate-700">{card.label}</p>
                    <img src={card.src} alt={card.label} className="w-full h-72 object-contain rounded-xl bg-white" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#FAF8F5] border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
                {segPreview ? (
                  <img src={segPreview} alt="Preview" className="h-64 mx-auto object-contain rounded-xl" />
                ) : (
                  'Upload a full-body Pakistani outfit photo above and click Extract Cutout.'
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
