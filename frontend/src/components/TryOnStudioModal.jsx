import React, { useState } from 'react'
import {
  X,
  Upload,
  Sparkles,
  ShieldCheck,
  Layers,
  Cpu,
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

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
  const [personFile, setPersonFile] = useState(null)
  const [personPreview, setPersonPreview] = useState(null)
  const [garmentFile, setGarmentFile] = useState(null)
  const [garmentPreview, setGarmentPreview] = useState(null)
  const [selectedModel, setSelectedModel] = useState('catvton')
  const [garmentType, setGarmentType] = useState('flat-lay')
  const [selectedAvatar, setSelectedAvatar] = useState('A002')
  const [selectedProduct, setSelectedProduct] = useState('DEMO_001')
  const [segFile, setSegFile] = useState(null)
  const [segPreview, setSegPreview] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [vtonResult, setVtonResult] = useState(null)
  const [segResult, setSegResult] = useState(null)
  const [showGarmentOnLeft, setShowGarmentOnLeft] = useState(false)

  React.useEffect(() => {
    setActiveTab(initialTab)
    setError('')
  }, [initialTab, isOpen])

  if (!isOpen) return null

  const isGpuConnected = health?.mode === 'colab_gpu_live'
  const directEndpoint = (path) => {
    if (health?.direct && health?.colab_gpu_url) {
      return `${health.colab_gpu_url}${path}`
    }
    return `/api${path}`
  }

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  const runVton = async () => {
    if (!personFile || !garmentFile) {
      setError('Please upload both a target person photograph and a kurta/garment photograph.')
      return
    }
    if (!isGpuConnected) {
      setError(
        'No live Colab GPU connected yet. Run FashionFit_PK_Live_GPU_Server.ipynb on Google Colab (T4 GPU), paste its https://...trycloudflare.com URL above, and click "Connect GPU".'
      )
      return
    }
    setLoading(true)
    setError('')
    setVtonResult(null)
    try {
      const fd = new FormData()
      fd.append('person_image', personFile)
      fd.append('garment_image', garmentFile)
      fd.append('model_id', selectedModel)
      fd.append('category', 'tops')
      fd.append('garment_photo_type', garmentType)
      fd.append('seed', '42')

      const res = await fetch(directEndpoint('/vton'), { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'VTON inference failed')
      setVtonResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runSegment = async () => {
    if (!segFile) {
      setError('Please upload a model-worn Pakistani outfit photo first.')
      return
    }
    if (!isGpuConnected) {
      setError(
        'No live Colab GPU connected yet. Run FashionFit_PK_Live_GPU_Server.ipynb on Google Colab (T4 GPU), paste its https://...trycloudflare.com URL above, and click "Connect GPU".'
      )
      return
    }
    setLoading(true)
    setError('')
    setSegResult(null)
    try {
      const fd = new FormData()
      fd.append('image', segFile)
      const res = await fetch(directEndpoint('/segment'), { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Segmentation failed')
      setSegResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const items = catalog?.collections?.[0]?.items || []
  const currentProductObj = items.find((i) => i.id === selectedProduct) || items[0]
  const previewImage =
    currentProductObj?.showcaseByAvatar?.[selectedAvatar] || '/showcase/blind_012.jpg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F5C4D] to-[#164E63] text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-lg font-bold leading-tight">FashionFit-PK Interactive Studio</h2>
              <p className="text-xs text-emerald-100">
                Real Neural Models: SegFormer-B2 Clothes • CatVTON • FASHN VTON v1.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/15 transition cursor-pointer"
            aria-label="Close studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Colab GPU Connection Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isGpuConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-700">
              {isGpuConnected
                ? `Connected to Live Colab GPU (${health.colab_gpu_url})`
                : colabStatusMsg ||
                  'Demo Mode Active — Paste your trycloudflare.com URL from Colab for live custom GPU runs'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={colabUrlInput}
              onChange={(e) => setColabUrlInput(e.target.value)}
              placeholder="https://xxxx.trycloudflare.com"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 w-64 focus:outline-none focus:ring-2 focus:ring-[#0F5C4D]"
            />
            <button
              onClick={onSaveColabUrl}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0F5C4D] text-white hover:bg-[#0b473b] transition cursor-pointer"
            >
              Connect GPU
            </button>
          </div>
        </div>

        {/* 3-Tab Switcher */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex flex-wrap gap-2">
          {[
            { id: 'avatar', label: 'Avatar Try-On (Instant Demo)', icon: ShieldCheck },
            { id: 'photo', label: 'Live Photo Try-On', icon: Upload },
            { id: 'segment', label: '4-Class Garment Parsing', icon: Layers },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setError('')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                activeTab === id
                  ? 'bg-[#9B1D4A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: AVATAR TRY-ON (INSTANT VERIFIED R2 PREVIEW) */}
          {activeTab === 'avatar' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  <strong>DEMO ONLY — SYNTHETIC AVATARS:</strong> Avatars A001 &amp; A002 are AI-generated privacy-safe
                  studio profiles from our verified R2 Colab benchmark.
                </span>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      1. Select Synthetic Demo Avatar
                    </h3>
                    <div className="space-y-2">
                      {(catalog?.avatars || []).map((av) => (
                        <button
                          key={av.id}
                          onClick={() => setSelectedAvatar(av.id)}
                          className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                            selectedAvatar === av.id
                              ? 'border-[#0F5C4D] bg-emerald-50/70 ring-1 ring-[#0F5C4D]'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{av.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                DEMO ONLY
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{av.profile}</p>
                          </div>
                          {selectedAvatar === av.id && <CheckCircle2 className="w-5 h-5 text-[#0F5C4D] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      2. Select Verified Pakistani Kurta
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedProduct(item.id)}
                          className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                            selectedProduct === item.id
                              ? 'border-[#9B1D4A] bg-rose-50/60 ring-1 ring-[#9B1D4A]'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.fabric} • {item.garment_photo_type}
                            </p>
                          </div>
                          {selectedProduct === item.id && <CheckCircle2 className="w-5 h-5 text-[#9B1D4A] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Pre-Computed Result Preview */}
                <div className="lg:col-span-7 rounded-2xl bg-slate-900 p-4 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Verified R2 Colab Output • {selectedAvatar} × {currentProductObj?.name}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200">
                      DEMO ONLY
                    </span>
                  </div>
                  <img
                    src={previewImage}
                    alt="Verified R2 Virtual Try-On Preview"
                    className="w-full rounded-xl bg-white object-contain max-h-96"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-300">
                      Left: Source Reference • Center: Target Avatar • Right: Generated Output
                    </p>
                    <button
                      onClick={() => setActiveTab('photo')}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      Run Custom Photo Live →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHOTO TRY-ON */}
          {activeTab === 'photo' && (
            <div className="space-y-6">
              {!vtonResult ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Target Person Upload */}
                    <div className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center bg-slate-50/70">
                      <p className="text-sm font-bold text-slate-800 mb-2">1. Target Person Photograph</p>
                      {personPreview ? (
                        <img
                          src={personPreview}
                          alt="Target person"
                          className="mx-auto h-56 object-contain rounded-lg mb-3"
                        />
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs">Front full-body neutral pose (JPG / PNG)</span>
                        </div>
                      )}
                      <label className="inline-block cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100">
                        Choose Person Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setPersonFile, setPersonPreview)}
                        />
                      </label>
                    </div>

                    {/* Garment Upload */}
                    <div className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center bg-slate-50/70">
                      <p className="text-sm font-bold text-slate-800 mb-2">2. Pakistani Kurta / Garment Reference</p>
                      {garmentPreview ? (
                        <img
                          src={garmentPreview}
                          alt="Garment reference"
                          className="mx-auto h-56 object-contain rounded-lg mb-3"
                        />
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-xs">Hanging kurta, flat-lay, or extracted cutout</span>
                        </div>
                      )}
                      <label className="inline-block cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100">
                        Choose Garment Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setGarmentFile, setGarmentPreview)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Model & Type Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">VTON Model</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="catvton">CatVTON (R2 Top Performer • SegFormer-B2 Mask)</option>
                          <option value="fashn_vton_1_5">FASHN VTON v1.5 (Auto-Parse)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Garment Input Type</label>
                        <select
                          value={garmentType}
                          onChange={(e) => setGarmentType(e.target.value)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="flat-lay">Flat-Lay / Hanging / Cutout</option>
                          <option value="model">Model-Worn Reference</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={runVton}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {loading ? 'Running Colab GPU Inference...' : 'Generate Virtual Try-On'}
                    </button>
                  </div>
                </>
              ) : (
                /* Side-by-Side Comparison */
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl bg-slate-900 p-4 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          {showGarmentOnLeft ? 'Garment Input' : 'Target Person'}
                        </span>
                        <button
                          onClick={() => setShowGarmentOnLeft(!showGarmentOnLeft)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          {showGarmentOnLeft ? 'See Person' : 'See Garment'}
                        </button>
                      </div>
                      <img
                        src={showGarmentOnLeft ? garmentPreview : personPreview}
                        alt="Input"
                        className="w-full h-80 object-contain rounded-lg"
                      />
                    </div>

                    <div className="rounded-xl bg-slate-900 p-4 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                          Generated Result ({vtonResult.model_id})
                        </span>
                        <span className="text-xs text-slate-300">
                          {vtonResult.seconds}s • {vtonResult.peak_vram_mb} MB VRAM
                        </span>
                      </div>
                      <img
                        src={vtonResult.result_image}
                        alt="VTON Output"
                        className="w-full h-80 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setVtonResult(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Try Another Kurta / Model
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 4-CLASS VISIBLE GARMENT SEGMENTATION */}
          {activeTab === 'segment' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    4-Class Visible-Region Parser (SegFormer-B2 Clothes)
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Labels visible fabric only: <span className="font-semibold text-emerald-700">1: kurta_kameez</span>,{' '}
                    <span className="font-semibold text-blue-700">2: bottom</span>,{' '}
                    <span className="font-semibold text-amber-700">3: dupatta</span>,{' '}
                    <span className="font-semibold text-slate-600">0: other</span>.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100">
                    Upload Outfit Photo
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
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0F5C4D] text-white text-xs font-bold hover:bg-[#0b473b] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                    Run 4-Class Segmentation
                  </button>
                </div>
              </div>

              {segResult ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-slate-900 p-3 text-white">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Source Outfit</p>
                    <img src={segPreview} alt="Source" className="w-full h-64 object-contain rounded" />
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3 text-white">
                    <p className="text-xs font-semibold text-emerald-300 mb-2">
                      4-Class Overlay ({segResult.seconds}s)
                    </p>
                    <img src={segResult.overlay_image} alt="Overlay" className="w-full h-64 object-contain rounded" />
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3 text-white">
                    <p className="text-xs font-semibold text-amber-300 mb-2">Extracted Kurta Cutout</p>
                    <img
                      src={segResult.kurta_cutout_image}
                      alt="Cutout"
                      className="w-full h-64 object-contain rounded bg-white"
                    />
                  </div>
                </div>
              ) : (
                segPreview && (
                  <div className="rounded-xl border border-slate-200 p-4 text-center">
                    <img src={segPreview} alt="Preview" className="mx-auto h-64 object-contain rounded-lg" />
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
