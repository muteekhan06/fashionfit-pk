import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  ChevronDown,
  ArrowRight,
  Scissors,
  Camera,
  Heart,
  SlidersHorizontal,
} from 'lucide-react'
import StudioPage from './pages/StudioPage.jsx'
import { STUDIO_POSES, PREDEFINED_KURTAS } from './data/verifiedData.js'

const FAQS = [
  {
    q: 'What types of Pakistani outfits work best?',
    a: 'FashionFit-PK is designed specifically for Pakistani women’s stitched kurtas, straight kameez, printed lawn, embroidered festive wear, and kurta-dupatta combinations—preserving full knee-length hems and neckline embroidery.',
  },
  {
    q: 'Can I test it without uploading my own photo?',
    a: 'Yes. Inside our Studio you can preview our curated Pakistani kurtas on a built-in studio model or explore our 3-Pose Runway Demo with zero personal uploads.',
  },
  {
    q: 'What if my photo or garment image isn’t studio-perfect?',
    a: 'Our built-in AI Studio Precision engine automatically cleans backgrounds, balances lighting on uploaded portraits, and reconstructs minimal or hanging garment photos into crisp studio flat-lays before try-on.',
  },
  {
    q: 'What angles are included in the Studio?',
    a: 'Every try-on supports three dedicated poses: Front Portrait, Angled Runway (3/4 editorial drape), and Back Silhouette.',
  },
]

const STORAGE_KEY = 'fashionfit_colab_gpu_url'

export default function App() {
  const [route, setRoute] = useState(() =>
    window.location.pathname.startsWith('/studio') ? 'studio' : 'home'
  )
  const [studioInitTab, setStudioInitTab] = useState('photo')
  const [studioInitKurta, setStudioInitKurta] = useState(null)

  const [health, setHealth] = useState({ mode: 'standby', colab_gpu_url: null })
  const [openFaq, setOpenFaq] = useState(0)
  const [colabUrlInput, setColabUrlInput] = useState('')
  const [colabStatusMsg, setColabStatusMsg] = useState('')

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname.startsWith('/studio') ? 'studio' : 'home')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigateToStudio = (tab = 'photo', kurtaId = null) => {
    setStudioInitTab(tab)
    setStudioInitKurta(kurtaId)
    if (window.location.pathname !== '/studio') {
      window.history.pushState({}, '', '/studio')
    }
    setRoute('studio')
  }

  const navigateHome = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
    setRoute('home')
  }

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
          gpu: data.gpu || 'Live Studio Server',
          direct: true,
        })
        setColabStatusMsg('Connected to live studio server.')
        return true
      }
    } catch {
      // fall through
    }
    setHealth({ mode: 'standby', colab_gpu_url: null })
    setColabStatusMsg('Could not reach server URL. Check that your server is running.')
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
      try {
        const hRes = await fetch('/api/health')
        if (hRes.ok) {
          const h = await hRes.json()
          setHealth(h)
          if (h.colab_gpu_url) setColabUrlInput(h.colab_gpu_url)
        }
      } catch {
        // Standalone mode on Vercel
      }
    }
    init()
  }, [])

  const handleSaveColabUrl = async () => {
    const cleaned = colabUrlInput.trim().replace(/\/+$/, '')
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY)
      setHealth({ mode: 'standby', colab_gpu_url: null })
      setColabStatusMsg('Disconnected.')
      return
    }
    setColabStatusMsg('Connecting...')
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
          setColabStatusMsg('Connected.')
        }
      } catch {
        // Error already set
      }
    }
  }

  if (route === 'studio') {
    return (
      <StudioPage
        initialTab={studioInitTab}
        initialKurtaId={studioInitKurta}
        onBackHome={navigateHome}
        health={health}
        colabUrlInput={colabUrlInput}
        setColabUrlInput={setColabUrlInput}
        colabStatusMsg={colabStatusMsg}
        onSaveColabUrl={handleSaveColabUrl}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      {/* Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F5C4D] to-[#9B1D4A] text-white font-display font-bold text-base flex items-center justify-center shadow-sm">
              F
            </span>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              FashionFit<span className="text-[#9B1D4A]">-PK</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#poses" className="hover:text-slate-900 transition">3 Studio Poses</a>
            <a href="#wardrobe" className="hover:text-slate-900 transition">Kurta Wardrobe</a>
            <a href="#why-us" className="hover:text-slate-900 transition">Why FashionFit</a>
            <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
          </nav>

          <button
            onClick={() => navigateToStudio('photo')}
            className="px-5 py-2 rounded-full bg-[#9B1D4A] text-white text-sm font-semibold hover:bg-[#7d163b] shadow-sm transition cursor-pointer"
          >
            Open Studio
          </button>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F7] via-[#FAF8F5] to-white pt-14 pb-24 lg:pt-20 lg:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          <div className="lg:col-span-6 space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-200/80 text-xs font-semibold text-[#9B1D4A] shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              AI Virtual Try-On for Pakistani Fashion
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              See Every Kurta on You{' '}
              <span className="bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] bg-clip-text text-transparent">
                Before You Buy.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">
              Upload your photo or pick a studio model, choose any Pakistani kurta, and preview the embroidery, full-length drape, and fit across three runway poses in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={() => navigateToStudio('photo')}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0F5C4D] text-white font-semibold text-sm hover:bg-[#0b473b] shadow-md transition cursor-pointer"
              >
                Enter Virtual Studio
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateToStudio('demo')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-slate-300 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                Explore 3-Pose Demo
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-slate-500">
              <span>✓ True knee-length drape</span>
              <span>✓ Embroidery preserved</span>
              <span>✓ 3 studio poses</span>
            </div>
          </div>

          {/* Branded Luxury Editorial Hero Visual */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-md">
              <div
                onClick={() => navigateToStudio('photo', 'emerald-zari')}
                className="group relative rounded-[2rem] overflow-hidden bg-white p-2.5 border border-rose-100 shadow-2xl shadow-rose-900/10 cursor-pointer"
              >
                <div className="relative rounded-[1.5rem] overflow-hidden aspect-[3/4] bg-[#EFEBE6]">
                  <img
                    src="/brand/hero_editorial.jpg"
                    alt="Pakistani Woman Virtual Try-On Editorial"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent p-5 flex items-end justify-between text-white">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                        Virtual Try-On
                      </p>
                      <p className="text-sm font-bold mt-0.5">Emerald Zari Embroidered Kurta</p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold shadow-sm">
                      Try On →
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Garment Swatch Card */}
              <div
                onClick={() => navigateToStudio('photo', 'emerald-zari')}
                className="hidden sm:flex items-center gap-3 absolute -left-8 bottom-10 bg-white/95 backdrop-blur-md p-2.5 pr-4 rounded-2xl border border-slate-200/80 shadow-xl cursor-pointer hover:-translate-y-0.5 transition"
              >
                <img
                  src="/brand/kurta_emerald.jpg"
                  alt="Emerald Kurta Reference"
                  className="w-12 h-16 object-contain rounded-lg bg-white border border-slate-100"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F5C4D]">Selected Kurta</p>
                  <p className="text-xs font-bold text-slate-900">Emerald Zari Lawn</p>
                  <p className="text-[11px] text-slate-500">1-click studio fit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Dedicated Studio Poses Showcase */}
      <section id="poses" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F5C4D] mb-2">Every Angle Covered</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              Three Meaningful Studio Poses
            </h2>
            <p className="text-sm text-slate-500 mt-3">
              Inspect neckline embroidery, side-slit drape, and rear silhouette before committing to a purchase.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-7">
            {STUDIO_POSES.map((pose) => (
              <div
                key={pose.id}
                onClick={() => navigateToStudio('demo')}
                className="group rounded-3xl bg-[#FAF8F5] border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition duration-300 cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#EFEBE6]">
                  <img
                    src={pose.demoImage}
                    alt={pose.label}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900">{pose.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{pose.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Predefined Pakistani Kurta Wardrobe */}
      <section id="wardrobe" className="py-24 bg-[#FAF8F5] border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#9B1D4A] mb-2">Ready-to-Try Collection</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                Pick a Kurta &amp; Try It On
              </h2>
            </div>
            <button
              onClick={() => navigateToStudio('photo')}
              className="text-sm font-semibold text-[#0F5C4D] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              Or upload your own kurta <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-7">
            {PREDEFINED_KURTAS.map((kurta) => (
              <div
                key={kurta.id}
                onClick={() => navigateToStudio('photo', kurta.id)}
                className="group rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition duration-300 cursor-pointer flex flex-col"
              >
                <div className="aspect-[3/4] bg-white p-6 flex items-center justify-center border-b border-slate-100">
                  <img
                    src={kurta.image}
                    alt={kurta.name}
                    className="w-full h-full object-contain group-hover:scale-[1.04] transition duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F5C4D]">{kurta.fabric}</p>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{kurta.name}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{kurta.caption}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9B1D4A] group-hover:translate-x-0.5 transition">
                    Try This in Studio <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why FashionFit */}
      <section id="why-us" className="py-24 bg-white border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F5C4D] mb-2">Crafted for Local Fashion</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              Built for Pakistani Brands &amp; Shoppers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Scissors,
                title: 'True Kurta Proportions',
                desc: 'Respects full knee-length hems, straight cuts, side slits, and modest necklines instead of cropping garments like generic Western apps.',
                color: 'bg-[#0F5C4D]',
              },
              {
                icon: Camera,
                title: 'AI Studio Precision',
                desc: 'Automatically refines messy backgrounds and reconstructs minimal or hanging garments into clean studio inputs for crisp embroidery transfer.',
                color: 'bg-[#9B1D4A]',
              },
              {
                icon: Heart,
                title: 'Inclusive & Privacy-First',
                desc: 'Test any kurta immediately on studio models or upload your own photo—helping shoppers buy with confidence and reducing online returns.',
                color: 'bg-slate-900',
              },
            ].map((pillar) => (
              <div key={pillar.title} className="rounded-3xl p-7 border border-slate-200/80 bg-[#FAF8F5]/60 space-y-4">
                <div className={`w-11 h-11 rounded-2xl ${pillar.color} text-white flex items-center justify-center shadow-sm`}>
                  <pillar.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{pillar.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clean CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Step Inside the Virtual Dressing Room
          </h2>
          <p className="text-sm sm:text-base text-white/85 max-w-xl mx-auto">
            Select a curated Pakistani kurta or upload your own design and preview all three studio poses in seconds.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigateToStudio('photo')}
              className="px-8 py-3.5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-rose-50 shadow-lg transition cursor-pointer"
            >
              Open Virtual Studio
            </button>
          </div>
        </div>
      </section>

      {/* Simple FAQ */}
      <section id="faq" className="py-24 bg-[#FAF8F5]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-center text-slate-900 mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => (
              <div key={item.q} className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-sm text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-white text-sm">
              FashionFit<span className="text-rose-400">-PK</span>
            </p>
            <p className="mt-1">AI Virtual Try-On for Pakistani Ethnic Wear • Mutee Ur Rehman &amp; Hafiz Abdullah Muhammad</p>
          </div>
          <button
            onClick={() => navigateToStudio('photo')}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Open Virtual Studio
          </button>
        </div>
      </footer>
    </div>
  )
}
