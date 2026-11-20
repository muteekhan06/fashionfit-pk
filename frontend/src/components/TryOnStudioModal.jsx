import React, { useState, useEffect } from 'react'
import {
  X,
  Upload,
  Sparkles,
  ShieldCheck,
  Scissors,
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Wand2,
  Camera,
  Settings2,
} from 'lucide-react'

const STUDIO_VIEWS = [
  { id: 'front', label: 'Front View', desc: 'Full-body studio front' },
  { id: 'three_quarter', label: '3/4 Editorial', desc: 'Angled drape & sleeves' },
  { id: 'back_detail', label: 'Back & Detail', desc: 'Rear fall & embroidery' },
]

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function dataUrlToFile(dataUrl, filename = 'cleaned_kurta.png') {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

export default function TryOnStudioModal({
  isOpen,
  initialTab = 'avatar',
  onClose,
  health,
  catalog,
  colabUrlInput,
  setColabUrlInput,
  colabStatusMsg,
  onSaveColabUrl,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showServerPanel, setShowServerPanel] = useState(false)

  const [personFile, setPersonFile] = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [garmentFile, setGarmentFile] = useState(null)
  const [garmentPreview, setGarmentPreview] = useState(null)
  const [canonicalPreview, setCanonicalPreview] = useState(null)
  const [autoCleanGarment, setAutoCleanGarment] = useState(true)
  const [selectedModel, setSelectedModel] = useState('catvton')
  const [garmentType, setGarmentType] = useState('flat-lay')

  const [selectedAvatar, setSelectedAvatar] = useState('A002')
  const [selectedProduct, setSelectedProduct] = useState('KURTA_01')
  const [segFile, setSegFile] = useState(null)
  const [segPreview, setSegPreview] = useState(null)
  const [segVariant, setSegVariant] = useState('adapted')

  const [geminiReady, setGeminiReady] = useState(false)
  const [avatarView, setAvatarView] = useState('front')
  const [resultView, setResultView] = useState('front')
  const [generatedViews, setGeneratedViews] = useState({})

  const [loading, setLoading] = useState(false)
  const [cleanLoading, setCleanLoading] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [error, setError] = useState('')
  const [vtonResult, setVtonResult] = useState(null)
  const [segResult, setSegResult] = useState(null)
  const [showGarmentOnLeft, setShowGarmentOnLeft] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
    setError('')
  }, [initialTab, isOpen])

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/gemini-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setGeminiReady(Boolean(d.configured))
      })
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const isGpuConnected = health?.mode === 'colab_gpu_live'
  const directEndpoint = (path) => {
    if (health?.direct && health?.colab_gpu_url) {
      return `${health.colab_gpu_url}${path}`
    }
    return `/api${path}`
  }

  const handleFileChange = (e, setFile, setPreview, isGarment = false) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    setPreview(URL.createObjectURL(file))
    if (isGarment) setCanonicalPreview(null)
    setError('')
  }

  const runCleanGarment = async () => {
    if (!garmentFile) {
      setError('Upload a kurta photo first.')
      return null
    }
    setCleanLoading(true)
    setError('')
    try {
      const dataUrl = await fileToDataUrl(garmentFile)
      const res = await fetch('/api/gemini-canonicalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not clean garment image.')
      setCanonicalPreview(data.canonical_image)
      return data.canonical_image
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setCleanLoading(false)
    }
  }

  const runVton = async () => {
    if (!personFile || !garmentFile) {
      setError('Please upload both your full-body photo and a Pakistani kurta photo.')
      return
    }
    if (!isGpuConnected) {
      setShowServerPanel(true)
      setError('Connect your live studio server URL above to run custom photo try-on.')
      return
    }
    setLoading(true)
    setError('')
    setVtonResult(null)
    setGeneratedViews({})
    setResultView('front')
    try {
      let garmentToSend = garmentFile
      if (autoCleanGarment && geminiReady) {
        const cleanedUrl = canonicalPreview || (await runCleanGarment())
        if (cleanedUrl) {
          garmentToSend = await dataUrlToFile(cleanedUrl, 'cleaned_kurta.png')
        }
      }

      const fd = new FormData()
      fd.append('person_image', personFile)
      fd.append('garment_image', garmentToSend)
      fd.append('model_id', selectedModel)
      fd.append('category', 'tops')
      fd.append('garment_photo_type', canonicalPreview ? 'flat-lay' : garmentType)
      fd.append('seed', '42')

      const res = await fetch(directEndpoint('/vton'), { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Try-on generation failed.')
      setVtonResult(data)
      setGeneratedViews({ front: data.result_image })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runStudioView = async (viewMode, baseImage) => {
    setResultView(viewMode)
    if (generatedViews[viewMode] || !baseImage) return
    setViewLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gemini-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_image_base64: baseImage, view_mode: viewMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not generate angle.')
      setGeneratedViews((prev) => ({ ...prev, [viewMode]: data.view_image }))
    } catch (err) {
      setError(err.message)
    } finally {
      setViewLoading(false)
    }
  }

  const runSegment = async () => {
    if (!segFile) {
      setError('Please upload an outfit photo first.')
      return
    }
    if (!isGpuConnected) {
      setShowServerPanel(true)
      setError('Connect your live studio server URL above to extract garments.')
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

  const kurtas = catalog?.kurtas || []
  const currentKurta = kurtas.find((k) => k.id === selectedProduct) || kurtas[0]
  const previewImage = currentKurta?.showcaseByAvatar?.[selectedAvatar] || '/showcase/blind_012.jpg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F5C4D] to-[#9B1D4A] text-white font-display font-bold flex items-center justify-center">
              F
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Virtual Try-On Studio</h2>
              <p className="text-xs text-slate-500">Preview Pakistani kurtas across 3 studio angles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowServerPanel(!showServerPanel)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                isGpuConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {isGpuConnected ? 'Live Server On' : 'Connect Server'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              aria-label="Close studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Server Connection Drawer (Hidden by Default for Clean UX) */}
        {showServerPanel && (
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Live Studio Server: </span>
              {colabStatusMsg || (isGpuConnected ? 'Connected' : 'Paste your live server URL to run custom photos')}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={colabUrlInput}
                onChange={(e) => setColabUrlInput(e.target.value)}
                placeholder="https://your-studio-server.trycloudflare.com"
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white w-64 focus:outline-none focus:ring-2 focus:ring-[#0F5C4D]"
              />
              <button
                onClick={onSaveColabUrl}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#0F5C4D] text-white hover:bg-[#0b473b] transition cursor-pointer"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Clean 3-Tab Switcher */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex flex-wrap gap-2 bg-[#FAF8F5]/60">
          {[
            { id: 'avatar', label: 'Studio Models', icon: ShieldCheck },
            { id: 'photo', label: 'Try Your Photo', icon: Upload },
            { id: 'segment', label: 'Garment Cutout', icon: Scissors },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setError('')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                activeTab === id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: STUDIO MODELS */}
          {activeTab === 'avatar' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    1. Choose Model
                  </h3>
                  <div className="space-y-2">
                    {(catalog?.avatars || []).map((av) => (
                      <button
                        key={av.id}
                        onClick={() => setSelectedAvatar(av.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          selectedAvatar === av.id
                            ? 'border-[#0F5C4D] bg-emerald-50/50 ring-1 ring-[#0F5C4D]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-sm text-slate-900">{av.name}</span>
                          <p className="text-xs text-slate-500 mt-0.5">{av.profile}</p>
                        </div>
                        {selectedAvatar === av.id && <CheckCircle2 className="w-5 h-5 text-[#0F5C4D] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    2. Choose Kurta
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {kurtas.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedProduct(item.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          selectedProduct === item.id
                            ? 'border-[#9B1D4A] bg-rose-50/50 ring-1 ring-[#9B1D4A]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.fabric}</p>
                        </div>
                        {selectedProduct === item.id && <CheckCircle2 className="w-5 h-5 text-[#9B1D4A] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3-View Studio Preview */}
              <div className="lg:col-span-7 rounded-2xl bg-[#FAF8F5] border border-slate-200/80 p-4 space-y-3.5">
                <div className="grid grid-cols-3 gap-2">
                  {STUDIO_VIEWS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setAvatarView(v.id)}
                      className={`px-3 py-2 rounded-xl text-left transition cursor-pointer border ${
                        avatarView === v.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold">{v.label}</p>
                      <p className={`text-[10px] truncate ${avatarView === v.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        {v.desc}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="relative rounded-xl bg-white overflow-hidden border border-slate-200/70">
                  <img
                    src={previewImage}
                    alt={currentKurta?.name}
                    className={`w-full object-contain max-h-96 transition duration-300 ${
                      avatarView === 'three_quarter'
                        ? 'scale-[1.1] origin-right'
                        : avatarView === 'back_detail'
                          ? 'scale-[1.35] origin-right'
                          : ''
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-500">Demo model preview • Switch to Try Your Photo for custom uploads</span>
                  <button
                    onClick={() => setActiveTab('photo')}
                    className="px-4 py-1.5 rounded-full bg-[#0F5C4D] text-white text-xs font-semibold hover:bg-[#0b473b] cursor-pointer"
                  >
                    Try Your Own Photo →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRY YOUR PHOTO */}
          {activeTab === 'photo' && (
            <div className="space-y-6">
              {!vtonResult ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Person Upload */}
                    <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center bg-[#FAF8F5]/60">
                      <p className="text-sm font-bold text-slate-800 mb-2">1. Your Photo</p>
                      {personPreview ? (
                        <img src={personPreview} alt="Your photo" className="mx-auto h-56 object-contain rounded-xl mb-3" />
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs">Full-body front photo in neutral pose</span>
                        </div>
                      )}
                      <label className="inline-block cursor-pointer text-xs font-semibold px-4 py-2 rounded-full bg-white border border-slate-300 hover:bg-slate-50">
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setPersonFile, setPersonPreview)}
                        />
                      </label>
                    </div>

                    {/* Garment Upload */}
                    <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center bg-[#FAF8F5]/60">
                      <p className="text-sm font-bold text-slate-800 mb-2">2. Kurta Photo</p>
                      {canonicalPreview ? (
                        <div className="relative mb-3">
                          <img
                            src={canonicalPreview}
                            alt="Cleaned kurta"
                            className="mx-auto h-56 object-contain rounded-xl bg-white border border-emerald-200"
                          />
                          <span className="absolute top-2 right-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F5C4D] text-white">
                            Studio Cleaned
                          </span>
                        </div>
                      ) : garmentPreview ? (
                        <img src={garmentPreview} alt="Kurta photo" className="mx-auto h-56 object-contain rounded-xl mb-3" />
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs">Flat-lay, hanger, or model catalog photo</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <label className="inline-block cursor-pointer text-xs font-semibold px-4 py-2 rounded-full bg-white border border-slate-300 hover:bg-slate-50">
                          Choose Kurta
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setGarmentFile, setGarmentPreview, true)}
                          />
                        </label>
                        {garmentFile && (
                          <button
                            onClick={runCleanGarment}
                            disabled={cleanLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-[#0F5C4D] text-white hover:bg-[#0b473b] disabled:opacity-50 cursor-pointer"
                          >
                            {cleanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            {cleanLoading ? 'Cleaning...' : 'Clean Background'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clean Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200/80">
                    <div className="flex flex-wrap items-center gap-5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoCleanGarment}
                          onChange={(e) => setAutoCleanGarment(e.target.checked)}
                          className="rounded border-slate-300 text-[#0F5C4D] focus:ring-[#0F5C4D]"
                        />
                        Auto-clean garment background
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                      >
                        <option value="catvton">Full-Length Kurta Mode (Recommended)</option>
                        <option value="fashn_vton_1_5">Quick Try-On Mode</option>
                      </select>
                    </div>

                    <button
                      onClick={runVton}
                      disabled={loading}
                      className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition cursor-pointer shadow-sm"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {loading ? 'Creating Your Look...' : 'Generate Try-On'}
                    </button>
                  </div>
                </>
              ) : (
                /* 3-View Studio Result */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {STUDIO_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => runStudioView(v.id, vtonResult.result_image)}
                        className={`p-3 rounded-2xl text-left transition cursor-pointer border ${
                          resultView === v.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-[#FAF8F5] text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{v.label}</span>
                          {generatedViews[v.id] ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${resultView === v.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {v.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-600">
                          {showGarmentOnLeft ? 'Garment Reference' : 'Original Photo'}
                        </span>
                        <button
                          onClick={() => setShowGarmentOnLeft(!showGarmentOnLeft)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          {showGarmentOnLeft ? 'Show Person' : 'Show Kurta'}
                        </button>
                      </div>
                      <img
                        src={showGarmentOnLeft ? (canonicalPreview || garmentPreview) : personPreview}
                        alt="Input"
                        className="w-full h-80 object-contain rounded-xl bg-white"
                      />
                    </div>

                    <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[#0F5C4D]">
                          {STUDIO_VIEWS.find((v) => v.id === resultView)?.label}
                        </span>
                        <span className="text-[11px] text-slate-500">Generated in {vtonResult.seconds}s</span>
                      </div>
                      {viewLoading ? (
                        <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 gap-2 bg-white rounded-xl">
                          <Loader2 className="w-7 h-7 animate-spin text-[#9B1D4A]" />
                          <span className="text-xs font-medium">Creating studio angle...</span>
                        </div>
                      ) : (
                        <img
                          src={generatedViews[resultView] || vtonResult.result_image}
                          alt="Try-on result"
                          className="w-full h-80 object-contain rounded-xl bg-white"
                        />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setVtonResult(null)
                      setGeneratedViews({})
                    }}
                    className="w-full py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Try Another Kurta
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GARMENT CUTOUT */}
          {activeTab === 'segment' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200/80">
                <div>
                  <p className="text-sm font-bold text-slate-900">Pakistani Outfit Separator</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separates kurta, trousers, and dupatta into a clean catalog cutout.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={segVariant}
                    onChange={(e) => setSegVariant(e.target.value)}
                    className="text-xs px-3 py-2 rounded-full border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="adapted">Pakistani Ethnic Mode (Recommended)</option>
                    <option value="baseline">Standard Mode</option>
                  </select>
                  <label className="cursor-pointer text-xs font-semibold px-4 py-2 rounded-full bg-white border border-slate-300 hover:bg-slate-50">
                    Upload Outfit
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setSegFile, setSegPreview)}
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
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">Original Outfit</p>
                    <img src={segPreview} alt="Source" className="w-full h-64 object-contain rounded-xl bg-white" />
                  </div>
                  <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                    <p className="text-xs font-bold text-[#0F5C4D] mb-2">Detected Garments</p>
                    <img src={segResult.overlay_image} alt="Overlay" className="w-full h-64 object-contain rounded-xl bg-white" />
                  </div>
                  <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-3">
                    <p className="text-xs font-bold text-[#9B1D4A] mb-2">Extracted Kurta</p>
                    <img src={segResult.kurta_cutout_image} alt="Cutout" className="w-full h-64 object-contain rounded-xl bg-white" />
                  </div>
                </div>
              ) : (
                segPreview && (
                  <div className="rounded-2xl border border-slate-200 p-4 text-center bg-[#FAF8F5]/50">
                    <img src={segPreview} alt="Preview" className="mx-auto h-64 object-contain rounded-xl" />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
