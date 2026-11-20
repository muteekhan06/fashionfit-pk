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
} from 'lucide-react'
import { STUDIO_POSES, PREDEFINED_KURTAS, STUDIO_TIPS } from '../data/verifiedData.js'

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
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showServerPanel, setShowServerPanel] = useState(false)

  // Person state
  const [personFile, setPersonFile] = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [preppedPersonPreview, setPreppedPersonPreview] = useState(null)
  const [autoRefinePerson, setAutoRefinePerson] = useState(true)
  const [personLoading, setPersonLoading] = useState(false)

  // Garment state
  const [selectedKurtaId, setSelectedKurtaId] = useState(initialKurtaId || PREDEFINED_KURTAS[0].id)
  const [garmentFile, setGarmentFile] = useState(null)
  const [garmentPreview, setGarmentPreview] = useState(
    (PREDEFINED_KURTAS.find((k) => k.id === initialKurtaId) || PREDEFINED_KURTAS[0]).image
  )
  const [canonicalPreview, setCanonicalPreview] = useState(null)
  const [autoPerfectGarment, setAutoPerfectGarment] = useState(true)
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

  const handlePersonUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPersonFile(file)
    setPersonPreview(URL.createObjectURL(file))
    setPreppedPersonPreview(null)
    setError('')
  }

  const handleUseStudioModel = async () => {
    setError('')
    setPersonPreview('/brand/model_base.jpg')
    setPreppedPersonPreview(null)
    try {
      const f = await urlToFile('/brand/model_base.jpg', 'studio_model.jpg')
      setPersonFile(f)
    } catch {
      setError('Could not load studio model.')
    }
  }

  const handleSelectPredefinedKurta = (kurta) => {
    setSelectedKurtaId(kurta.id)
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
        body: JSON.stringify({ image_base64: dataUrl }),
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
      setError('Select or upload a kurta photo first.')
      return null
    }
    setGarmentLoading(true)
    setError('')
    try {
      const fileObj = garmentFile || (await urlToFile(garmentPreview, 'kurta.jpg'))
      const dataUrl = await fileToDataUrl(fileObj)
      const res = await fetch('/api/gemini-canonicalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl }),
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
      setError('Please upload your photo or click "Use Studio Model" first.')
      return
    }
    if (!garmentPreview) {
      setError('Please choose a kurta from the wardrobe or upload your own.')
      return
    }
    if (!isGpuConnected) {
      setShowServerPanel(true)
      setError('Connect your live studio server URL in the top bar to generate your try-on.')
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
      let garmentToSend = garmentFile || (await urlToFile(garmentPreview, 'kurta.jpg'))

      // Precision Gemini Person Studio Normalization (skip if already clean built-in studio model)
      if (autoRefinePerson && geminiReady && personPreview !== '/brand/model_base.jpg') {
        const preppedUrl = preppedPersonPreview || (await runRefinePerson())
        if (preppedUrl) {
          personToSend = await urlToFile(preppedUrl, 'prepped_person.png')
        }
      }

      // Precision Gemini Garment Reconstruction (skip if already clean predefined pure-white flat-lay)
      if (autoPerfectGarment && geminiReady && selectedKurtaId === 'custom') {
        const canonicalUrl = canonicalPreview || (await runPerfectGarment())
        if (canonicalUrl) {
          garmentToSend = await urlToFile(canonicalUrl, 'canonical_kurta.png')
        }
      }

      const fd = new FormData()
      fd.append('person_image', personToSend)
      fd.append('garment_image', garmentToSend)
      fd.append('model_id', selectedModel)
      fd.append('category', 'tops')
      fd.append('garment_photo_type', 'flat-lay')
      fd.append('seed', '42')

      const res = await fetch(directEndpoint('/vton'), { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Try-on generation failed.')
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
                AI Precision Ready
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
              {isGpuConnected ? 'Live Server On' : 'Connect Server'}
            </button>
          </div>
        </div>

        {/* Collapsible Live Server Bar */}
        {showServerPanel && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Studio Engine URL: </span>
                {colabStatusMsg || (isGpuConnected ? 'Connected & ready' : 'Paste your live server URL to run custom try-on')}
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
              {/* Step 1: Person Photo */}
              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#0F5C4D] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">Your Photo</h2>
                  </div>
                  <button
                    onClick={handleUseStudioModel}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5C4D] hover:underline cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Use Studio Model
                  </button>
                </div>

                {personPreview ? (
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#FAF8F5] border border-slate-200/70">
                    <img
                      src={preppedPersonPreview || personPreview}
                      alt="Selected person"
                      className="w-20 h-28 object-cover rounded-xl bg-white border border-slate-200 shrink-0"
                    />
                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">
                        {preppedPersonPreview ? 'Studio-Normalized Portrait Ready' : 'Photo Selected'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-300 hover:bg-slate-50">
                          Change
                          <input type="file" accept="image/*" className="hidden" onChange={handlePersonUpload} />
                        </label>
                        {personPreview !== '/brand/model_base.jpg' && (
                          <button
                            onClick={runRefinePerson}
                            disabled={personLoading}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
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
                    <p className="text-xs text-slate-500 mt-1">JPG or PNG • Or click “Use Studio Model” above</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePersonUpload} />
                  </label>
                )}

                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefinePerson}
                    onChange={(e) => setAutoRefinePerson(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F5C4D] focus:ring-[#0F5C4D]"
                  />
                  Auto-clean lighting &amp; background on uploaded photo for higher accuracy
                </label>
              </div>

              {/* Step 2: Predefined Wardrobe OR Upload Kurta */}
              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#9B1D4A] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">Choose or Upload Kurta</h2>
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B1D4A] hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Own
                    <input type="file" accept="image/*" className="hidden" onChange={handleGarmentUpload} />
                  </label>
                </div>

                {/* Predefined Wardrobe Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {PREDEFINED_KURTAS.map((kurta) => {
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
                      alt="Custom kurta"
                      className="w-16 h-20 object-contain rounded-lg bg-white border border-slate-200"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs font-bold text-slate-800">
                        {canonicalPreview ? 'Studio-Perfected Kurta Ready' : 'Custom Kurta Uploaded'}
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

                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPerfectGarment}
                    onChange={(e) => setAutoPerfectGarment(e.target.checked)}
                    className="rounded border-slate-300 text-[#9B1D4A] focus:ring-[#9B1D4A]"
                  />
                  Auto-reconstruct &amp; clean custom garment uploads before try-on
                </label>

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
                        <p className="text-xs font-semibold">Generating {STUDIO_POSES.find((p) => p.id === resultPose)?.label}...</p>
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
                    <button
                      onClick={() => setShowOriginalToggle(!showOriginalToggle)}
                      className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur border border-slate-200 text-xs font-bold text-slate-800 shadow-sm hover:bg-white cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {showOriginalToggle ? 'Show Try-On' : 'Compare Original'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Click Angled Runway or Back Silhouette above to generate additional angles</span>
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
                    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                      <div className="rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs">
                        <p className="text-[11px] font-bold text-slate-500 mb-2">Selected Person</p>
                        <img
                          src={preppedPersonPreview || personPreview}
                          alt="Person ready"
                          className="w-full h-64 object-contain rounded-xl"
                        />
                      </div>
                      <div className="rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs">
                        <p className="text-[11px] font-bold text-slate-500 mb-2">Selected Kurta</p>
                        <img
                          src={canonicalPreview || garmentPreview}
                          alt="Kurta ready"
                          className="w-full h-64 object-contain rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-sm space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-[#0F5C4D]">
                        <Shirt className="w-7 h-7" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-slate-900">Your Dressing Room Awaits</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Upload your photo on the left (or click <strong>Use Studio Model</strong>), select any Pakistani kurta from our wardrobe, and click <strong>Generate Virtual Try-On</strong>.
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
                  Explore how FashionFit-PK presents every Pakistani kurta across three dedicated studio poses—keeping embroidery, sleeve length, and hemline consistent from every angle.
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
                  Upload any catalog photo to cleanly isolate the kurta from trousers and dupatta.
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
                      if (!f) return
                      setSegFile(f)
                      setSegPreview(URL.createObjectURL(f))
                      setSegResult(null)
                      setError('')
                    }}
                  />
                </label>
                <button
                  onClick={runSegment}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#0F5C4D] text-white text-xs font-semibold hover:bg-[#0b473b] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                  Extract Kurta
                </button>
              </div>
            </div>

            {segResult ? (
              <div className="grid md:grid-cols-3 gap-5">
                <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Original Photo</p>
                  <img src={segPreview} alt="Original" className="w-full h-72 object-contain rounded-xl bg-white" />
                </div>
                <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                  <p className="text-xs font-bold text-[#0F5C4D] mb-2">Detected Outfit Layers</p>
                  <img src={segResult.overlay_image} alt="Detected" className="w-full h-72 object-contain rounded-xl bg-white" />
                </div>
                <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                  <p className="text-xs font-bold text-[#9B1D4A] mb-2">Clean Kurta Cutout</p>
                  <img src={segResult.kurta_cutout_image} alt="Cutout" className="w-full h-72 object-contain rounded-xl bg-white" />
                </div>
              </div>
            ) : segPreview ? (
              <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-6 text-center">
                <img src={segPreview} alt="Preview" className="mx-auto h-72 object-contain rounded-xl" />
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#FAF8F5]/60 p-14 text-center text-slate-400 text-sm">
                Upload an outfit photo above to preview layer detection and kurta extraction.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
