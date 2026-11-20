import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  Layers,
  Upload,
  ChevronDown,
  Cpu,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react'
import TryOnStudioModal from './components/TryOnStudioModal.jsx'
import {
  VERIFIED_METRICS,
  DEMO_CATALOG,
  R2_BENCHMARK_TABLE,
  SHOWCASE_RESULTS,
} from './data/verifiedData.js'

const FAQS = [
  {
    q: 'How does FashionFit-PK handle Pakistani kurtas, bottoms, and dupattas?',
    a: 'We use a 4-class visible-region schema (0=other, 1=kurta_kameez, 2=bottom, 3=dupatta, 255=ignore) powered by SegFormer-B2 Clothes. Controlled decoder adaptation improved validation foreground mIoU from 74.12% to 91.00% (+16.88 pp), with Bottom IoU rising +28.85 pp.',
  },
  {
    q: 'Which virtual try-on models power the benchmark and live studio?',
    a: 'Two garment-conditioned diffusion pipelines run on Google Colab GPU: CatVTON (author garment-conditioned code paired with SegFormer-B2 kurta masks) and FASHN VTON v1.5 (auto-parsed garment transfer). In our 38-case two-reviewer blinded benchmark, CatVTON achieved 20.0% strict acceptance vs. 0.0% for FASHN VTON v1.5.',
  },
  {
    q: 'How does privacy-first Avatar Try-On work?',
    a: 'Users who prefer not to upload personal photos can preview stitched kurtas on synthetic demo avatars (A001–A006). All synthetic avatars are strictly marked DEMO ONLY and excluded from real-person generalization claims.',
  },
  {
    q: 'How can I run live GPU inference from this deployed website?',
    a: 'Open our 1-click Google Colab notebook (FashionFit_PK_Live_GPU_Server.ipynb) on a free T4/L4 GPU, copy the printed https://...trycloudflare.com URL, click "Launch Studio", and paste it into the "Connect GPU" bar.',
  },
  {
    q: 'What is inside FYP-1 scope vs. future FYP-2 work?',
    a: 'FYP-1 delivers visible 4-class garment segmentation, controlled 2D kurta transfer comparisons, source-mask ablations, a 38-case two-reviewer blinded benchmark, and this interactive web prototype. Full dupatta de-occlusion, kurta-length LoRA adaptation, and 3D fit estimation are FYP-2 work.',
  },
]

const STORAGE_KEY = 'fashionfit_colab_gpu_url'

export default function App() {
  const [health, setHealth] = useState({ mode: 'standby', colab_gpu_url: null })
  const [catalog, setCatalog] = useState(DEMO_CATALOG)
  const [metrics, setMetrics] = useState(VERIFIED_METRICS)
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioTab, setStudioTab] = useState('photo')
  const [openFaq, setOpenFaq] = useState(0)
  const [colabUrlInput, setColabUrlInput] = useState('')
  const [colabStatusMsg, setColabStatusMsg] = useState('')
  const [lightboxItem, setLightboxItem] = useState(null)

  const checkDirectColabHealth = async (rawUrl) => {
    const cleaned = (rawUrl || '').trim().replace(/\/+$/, '')
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY)
      setHealth({ mode: 'standby', colab_gpu_url: null })
      setColabStatusMsg('')
      return false
    }
    try {
      const res = await fetch(`${cleaned}/health`)
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem(STORAGE_KEY, cleaned)
        setHealth({
          mode: 'colab_gpu_live',
          colab_gpu_url: cleaned,
          gpu: data.gpu || 'Colab GPU',
          direct: true,
        })
        setColabStatusMsg(`Connected directly to ${data.gpu || 'Colab GPU'}`)
        return true
      }
    } catch {
      // fall through
    }
    setHealth({ mode: 'standby', colab_gpu_url: null })
    setColabStatusMsg('Could not reach Colab GPU URL. Ensure the Colab notebook cell is running.')
    return false
  }

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setColabUrlInput(saved)
        const ok = await checkDirectColabHealth(saved)
        if (ok) return
      }
      // Optional local FastAPI backend check when running locally
      try {
        const hRes = await fetch('/api/health')
        if (hRes.ok) {
          const h = await hRes.json()
          setHealth(h)
          if (h.colab_gpu_url) setColabUrlInput(h.colab_gpu_url)
        }
      } catch {
        // Running standalone on Vercel — static verifiedData is already loaded
      }
    }
    init()
  }, [])

  const handleSaveColabUrl = async () => {
    const cleaned = colabUrlInput.trim().replace(/\/+$/, '')
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY)
      setHealth({ mode: 'standby', colab_gpu_url: null })
      setColabStatusMsg('Disconnected from Colab GPU.')
      return
    }
    setColabStatusMsg('Testing connection to Colab GPU...')
    const directOk = await checkDirectColabHealth(cleaned)
    if (!directOk) {
      try {
        const res = await fetch('/api/config/colab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colab_gpu_url: cleaned }),
        })
        if (res.ok) {
          setHealth({ mode: 'colab_gpu_live', colab_gpu_url: cleaned, direct: false })
          setColabStatusMsg('Connected via local FastAPI proxy.')
        }
      } catch {
        // Error message already set by checkDirectColabHealth
      }
    }
  }

  const openStudio = (tab) => {
    setStudioTab(tab)
    setStudioOpen(true)
  }

  const isGpuLive = health?.mode === 'colab_gpu_live'

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#hero" className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F5C4D] to-[#9B1D4A] text-white font-display font-bold text-lg flex items-center justify-center shadow-sm">
                F
              </span>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                FashionFit<span className="text-[#9B1D4A]">-PK</span>
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#how-it-works" className="hover:text-slate-900 transition">Studio Modes</a>
              <a href="#showcase" className="hover:text-slate-900 transition">R2 Showcase</a>
              <a href="#metrics" className="hover:text-slate-900 transition">Benchmarks</a>
              <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                isGpuLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isGpuLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isGpuLive ? 'Colab GPU Live' : 'Interactive Demo Mode'}
            </span>
            <button
              onClick={() => openStudio('avatar')}
              className="px-4 py-2 rounded-xl bg-[#9B1D4A] text-white text-sm font-semibold hover:bg-[#7d163b] shadow-sm transition cursor-pointer"
            >
              Launch Studio
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F7] via-[#FAF8F5] to-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-xs font-semibold text-[#9B1D4A] shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              ITU Lahore BS AI FYP-1 • Pakistani Women's Modest Fashion
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Virtual Try-On{' '}
              <span className="bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] bg-clip-text text-transparent">
                Built for Pakistani Kurtas
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              An end-to-end research prototype combining <strong>4-class visible garment segmentation</strong>{' '}
              (kurta/kameez, bottom, dupatta) with controlled <strong>CatVTON</strong> and{' '}
              <strong>FASHN VTON v1.5</strong> virtual try-on evaluation—backed by a completed 38-case two-reviewer blinded benchmark.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => openStudio('avatar')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0F5C4D] text-white font-semibold text-sm hover:bg-[#0b473b] shadow-md transition cursor-pointer"
              >
                Open Interactive Studio
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => openStudio('segment')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#9B1D4A]" />
                Test 4-Class Segmentation
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 max-w-lg text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5C4D]" /> +16.88 pp SegFormer Gain
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5C4D]" /> 38/38 Blinded Reviews
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5C4D]" /> 89.5% Agreement
              </div>
            </div>
          </div>

          {/* Pipeline Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl p-4 bg-white border border-rose-100 shadow-xl">
              <div className="rounded-2xl bg-[#06131F] p-6 text-white space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    End-to-End Architecture
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200">
                    Colab T4 / L4 GPU
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { step: '01', title: 'Gemini Canonical Garment Bridge', desc: 'De-occludes messy uploads into pure-white flat-lay kurtas', color: 'bg-indigo-500' },
                    { step: '02', title: 'SegFormer-B2 Adapted (91.0% mIoU)', desc: '4-class visible mask (kurta / bottom / dupatta)', color: 'bg-emerald-500' },
                    { step: '03', title: 'CatVTON & FASHN VTON v1.5', desc: 'Controlled 2D kurta transfer + blinded evaluation', color: 'bg-amber-500' },
                    { step: '04', title: 'Modaya 3-View Studio Output', desc: 'Front Studio • 3/4 Editorial Angle • Back & Detail', color: 'bg-rose-500' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className={`w-7 h-7 rounded-lg ${item.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                        {item.step}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="text-xs text-slate-300">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openStudio('avatar')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] text-xs font-bold hover:opacity-95 transition cursor-pointer"
                >
                  Explore Verified Demo Track (A001 &amp; A002) →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — 3 Modes */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              Three Interactive Studio Modes
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              Preview verified R2 outputs immediately, or connect your Colab GPU URL for live custom inference.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                tab: 'avatar',
                title: 'Avatar Try-On (Instant Demo)',
                badge: 'Works Instantly • No GPU Needed',
                desc: 'Explore verified R2 Pakistani kurta outputs on synthetic studio avatars (A001 & A002) without uploading personal photos.',
                icon: ShieldCheck,
                accent: 'bg-[#0F5C4D]',
                tint: 'bg-emerald-50/70 border-emerald-100',
              },
              {
                tab: 'photo',
                title: 'Live Photo Try-On',
                badge: 'Live Colab T4/L4 GPU',
                desc: 'Upload any target photo and Pakistani kurta reference to run live CatVTON or FASHN VTON v1.5 inference directly via Colab.',
                icon: Upload,
                accent: 'bg-purple-600',
                tint: 'bg-purple-50/70 border-purple-100',
              },
              {
                tab: 'segment',
                title: '4-Class Garment Parsing',
                badge: 'Kurta / Bottom / Dupatta',
                desc: 'Inspect real-time SegFormer-B2 visible-region segmentation overlays, pixel coverage ratios, and clean kurta cutouts.',
                icon: Layers,
                accent: 'bg-[#9B1D4A]',
                tint: 'bg-rose-50/70 border-rose-100',
              },
            ].map((card) => (
              <div key={card.tab} className={`rounded-2xl p-6 border ${card.tint} flex flex-col justify-between`}>
                <div>
                  <div className={`w-12 h-12 rounded-xl ${card.accent} text-white flex items-center justify-center mb-5 shadow-sm`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-200 mb-3">
                    {card.badge}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
                <button
                  onClick={() => openStudio(card.tab)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  Open Mode
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified R2 Showcase Gallery */}
      <section id="showcase" className="py-20 bg-[#FAF8F5] border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9B1D4A]">
                <Eye className="w-4 h-4" /> Real Colab GPU Outputs • DEMO ONLY Synthetic Avatars
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                Verified R2 Pakistani Kurta Showcase
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Each triptych shows: Source Garment Reference (left), Target Synthetic Avatar (center), and Generated Try-On Output (right). Click any card to inspect full resolution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHOWCASE_RESULTS.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxItem(item)}
                className="group rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer flex flex-col"
              >
                <div className="relative bg-slate-100 aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-900/85 text-white">
                    {item.id} • DEMO ONLY
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#0F5C4D]">{item.subtitle}</p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Research Metrics & R2 Table */}
      <section id="metrics" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0F5C4D]">
                <BarChart3 className="w-4 h-4" /> Completed Two-Reviewer Blinded Evaluation (R2)
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                Honest Quantitative Benchmarks
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">{metrics.honesty_note}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { value: `${metrics.dataset_total_normalized_images}`, label: 'Verified Normalized Images', sub: '600 catalogue + 27 pilot + 100 REHLIN + 6 avatars', color: 'text-[#0F5C4D]' },
              { value: `${(metrics.segformer_b2_adapted_miou * 100).toFixed(2)}%`, label: 'Adapted SegFormer-B2 mIoU', sub: `+${metrics.segformer_b2_gain_pp} pp over 74.12% baseline (Bottom: 89.48%)`, color: 'text-[#9B1D4A]' },
              { value: `${metrics.vton_runs_succeeded} / ${metrics.vton_runs_total}`, label: 'Two-Reviewer Scored Outputs', sub: `${metrics.review_rows} total ratings • ${metrics.inter_reviewer_agreement_pct}% inter-reviewer agreement`, color: 'text-indigo-700' },
              { value: `${metrics.catvton_acceptance_pct.toFixed(0)}%`, label: 'CatVTON Strict Acceptance', sub: 'vs. 0% FASHN VTON 1.5 (all 4 scores ≥ 4, both reviewers)', color: 'text-slate-900' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl bg-[#FAF8F5] p-6 border border-slate-200 shadow-sm">
                <p className={`text-4xl font-extrabold tracking-tight ${kpi.color}`}>{kpi.value}</p>
                <p className="text-sm font-bold text-slate-900 mt-2">{kpi.label}</p>
                <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Table + Acceptance Chart */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">R2 Two-Reviewer Comparison by Condition</h3>
                <p className="text-xs text-slate-500 mt-0.5">Strict acceptance requires Design, Silhouette, Identity, Artifact ≥ 4 and no major artifact from both reviewers.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Model / Condition</th>
                      <th className="px-3 py-3 text-center">N</th>
                      <th className="px-3 py-3 text-center">Accept</th>
                      <th className="px-3 py-3 text-center">Design</th>
                      <th className="px-3 py-3 text-center">Silh.</th>
                      <th className="px-3 py-3 text-center">Ident.</th>
                      <th className="px-3 py-3 text-center">Artif.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {R2_BENCHMARK_TABLE.map((row) => (
                      <tr key={`${row.model}-${row.condition}`} className={row.highlight ? 'bg-emerald-50/60 font-semibold' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{row.model}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{row.condition}</div>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-700">{row.outputs}</td>
                        <td className={`px-3 py-3 text-center font-bold ${row.highlight ? 'text-[#0F5C4D]' : 'text-slate-600'}`}>{row.acceptance}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{row.design}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{row.silhouette}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{row.identity}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{row.artifact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
              <p className="text-xs font-bold text-slate-800 mb-3">Human Acceptance Rate Chart (Notebook 08)</p>
              <img
                src="/showcase/human_acceptance.png"
                alt="R2 Human Acceptance Chart"
                className="w-full rounded-xl border border-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-[#FAF8F5] border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-center text-slate-900 mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => (
              <div key={item.q} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between font-semibold text-sm text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-white text-sm">FashionFit-PK — BS AI Final Year Project (ITU Lahore)</p>
            <p className="mt-1">Team: Mutee Ur Rehman &amp; Hafiz Abdullah Muhammad • Supervisor: Ms. Anam Zahid</p>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Powered by SegFormer-B2, CatVTON &amp; FASHN VTON v1.5</span>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal for Showcase */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full rounded-2xl bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div>
                <p className="text-sm font-bold">{lightboxItem.title} ({lightboxItem.id})</p>
                <p className="text-xs text-slate-300">{lightboxItem.subtitle} • DEMO ONLY</p>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={lightboxItem.image} alt={lightboxItem.title} className="w-full max-h-[75vh] object-contain bg-slate-100" />
            <div className="px-5 py-3 bg-white text-xs text-slate-600 border-t border-slate-200">
              {lightboxItem.note}
            </div>
          </div>
        </div>
      )}

      <TryOnStudioModal
        isOpen={studioOpen}
        initialTab={studioTab}
        onClose={() => setStudioOpen(false)}
        health={health}
        catalog={catalog}
        colabUrlInput={colabUrlInput}
        setColabUrlInput={setColabUrlInput}
        colabStatusMsg={colabStatusMsg}
        onSaveColabUrl={handleSaveColabUrl}
      />
    </div>
  )
}
