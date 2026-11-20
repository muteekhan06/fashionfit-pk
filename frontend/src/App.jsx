import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  X,
  Scissors,
  Camera,
  Heart,
  SlidersHorizontal,
} from 'lucide-react'
import TryOnStudioModal from './components/TryOnStudioModal.jsx'
import { LOOKBOOK_ITEMS, STUDIO_CATALOG } from './data/verifiedData.js'

const FAQS = [
  {
    q: 'What types of Pakistani outfits work best?',
    a: 'FashionFit-PK is purpose-built for women’s stitched kurtas, straight kameez, printed lawn, embroidered festive wear, and kurta-dupatta combinations—preserving full knee-length hems and neckline embroidery.',
  },
  {
    q: 'Do I have to upload my own photo to try it?',
    a: 'Not at all. You can preview kurtas immediately on our privacy-safe studio models without sharing any personal photos, or upload your own full-body photo whenever you like.',
  },
  {
    q: 'What if my garment photo has a hanger, wall, or model in it?',
    a: 'Our built-in AI Studio Cleaner automatically removes hangers, backgrounds, and occlusions to create a clean garment reference before trying it on—keeping colors, prints, and borders true to the original.',
  },
  {
    q: 'What views can shoppers preview?',
    a: 'Every try-on supports three studio angles: a crisp Front Studio view, a 3/4 Editorial angle to inspect sleeve and side-slit drape, and a Back & Detail view.',
  },
]

const STORAGE_KEY = 'fashionfit_colab_gpu_url'

export default function App() {
  const [health, setHealth] = useState({ mode: 'standby', colab_gpu_url: null })
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioTab, setStudioTab] = useState('avatar')
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

  const openStudio = (tab = 'avatar') => {
    setStudioTab(tab)
    setStudioOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      {/* Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F5C4D] to-[#9B1D4A] text-white font-display font-bold text-base flex items-center justify-center shadow-sm">
              F
            </span>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              FashionFit<span className="text-[#9B1D4A]">-PK</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#lookbook" className="hover:text-slate-900 transition">Lookbook</a>
            <a href="#why-us" className="hover:text-slate-900 transition">Why FashionFit</a>
            <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
          </nav>

          <button
            onClick={() => openStudio('photo')}
            className="px-5 py-2 rounded-full bg-[#9B1D4A] text-white text-sm font-semibold hover:bg-[#7d163b] shadow-sm transition cursor-pointer"
          >
            Try On Now
          </button>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F7] via-[#FAF8F5] to-white pt-16 pb-24 lg:pt-24 lg:pb-28">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-14 items-center">
          <div className="lg:col-span-6 space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-200/80 text-xs font-semibold text-[#9B1D4A] shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Virtual Try-On for Pakistani Fashion
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              See Every Kurta on You{' '}
              <span className="bg-gradient-to-r from-[#0F5C4D] to-[#9B1D4A] bg-clip-text text-transparent">
                Before You Buy.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">
              Upload your photo or choose a studio model, pick any Pakistani kurta, and preview the drape, embroidery, and fit from three studio angles in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={() => openStudio('photo')}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0F5C4D] text-white font-semibold text-sm hover:bg-[#0b473b] shadow-md transition cursor-pointer"
              >
                Start Virtual Try-On
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => openStudio('avatar')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-slate-300 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                Preview on Studio Models
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-slate-500">
              <span>✓ True knee-length drape</span>
              <span>✓ Embroidery preserved</span>
              <span>✓ 3 studio angles</span>
            </div>
          </div>

          {/* Visual Hero Showcase */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl p-3 bg-white border border-rose-100 shadow-2xl shadow-rose-900/5">
              <div
                onClick={() => openStudio('avatar')}
                className="group relative rounded-2xl overflow-hidden bg-slate-100 cursor-pointer"
              >
                <img
                  src="/showcase/blind_012.jpg"
                  alt="Pakistani Kurta Virtual Try-On Preview"
                  className="w-full h-auto object-cover group-hover:scale-[1.015] transition duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent p-5 flex items-end justify-between text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Instant Studio Preview
                    </p>
                    <p className="text-sm font-bold mt-0.5">Mint Vine Embroidered Kurta</p>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold shadow-sm group-hover:bg-rose-50 transition">
                    Open Studio →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — 3 Simple Steps */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F5C4D] mb-2">Effortless Experience</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              Try On in Three Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Pick a Model or Upload',
                desc: 'Use your own full-body photo for a personal fit, or start privately with our inclusive studio models.',
                accent: 'text-[#0F5C4D] bg-emerald-50',
              },
              {
                num: '02',
                title: 'Add Any Kurta Photo',
                desc: 'Flat-lay, hanger, or catalog look—our AI automatically cleans the background and isolates the garment.',
                accent: 'text-[#9B1D4A] bg-rose-50',
              },
              {
                num: '03',
                title: 'Explore 3 Studio Angles',
                desc: 'Inspect the Front Studio view, 3/4 Editorial drape, and Back & Embroidery detail before ordering.',
                accent: 'text-amber-800 bg-amber-50',
              },
            ].map((step) => (
              <div key={step.num} className="rounded-3xl p-8 bg-[#FAF8F5] border border-slate-200/70 space-y-4">
                <span className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl text-sm font-extrabold ${step.accent}`}>
                  {step.num}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Lookbook */}
      <section id="lookbook" className="py-24 bg-[#FAF8F5] border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#9B1D4A] mb-2">Curated Lookbook</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                Real Pakistani Kurta Previews
              </h2>
            </div>
            <button
              onClick={() => openStudio('avatar')}
              className="text-sm font-semibold text-[#0F5C4D] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              Open Interactive Studio <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {LOOKBOOK_ITEMS.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxItem(item)}
                className="group rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition duration-300 cursor-pointer flex flex-col"
              >
                <div className="relative bg-slate-100 aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-800 backdrop-blur-sm">
                    {item.fabric}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Crafted for Pakistani Fashion — 3 Clean Pillars */}
      <section id="why-us" className="py-24 bg-white border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F5C4D] mb-2">Designed for Local Apparel</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              Built Specifically for Pakistani Brands
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Scissors,
                title: 'True Kurta Proportions',
                desc: 'Unlike generic Western try-on tools that crop shirts at the waist, FashionFit-PK respects full knee-length hems, straight cuts, and modest necklines.',
                color: 'bg-[#0F5C4D]',
              },
              {
                icon: Camera,
                title: 'Embroidery & Border Clarity',
                desc: 'Preserves intricate gala work, floral prints, sleeve cuffs, and daaman borders while keeping trousers and personal identity untouched.',
                color: 'bg-[#9B1D4A]',
              },
              {
                icon: Heart,
                title: 'Inclusive & Privacy-First',
                desc: 'Shoppers can preview outfits on diverse studio body profiles instantly without uploading personal photos—boosting confidence and reducing returns.',
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
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Ready to Preview Your Next Kurta?
          </h2>
          <p className="text-sm sm:text-base text-white/85 max-w-xl mx-auto">
            Launch the interactive studio to test our lookbook models or try on your own Pakistani outfit in seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => openStudio('photo')}
              className="px-7 py-3.5 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-rose-50 shadow-lg transition cursor-pointer"
            >
              Launch Virtual Try-On Studio
            </button>
          </div>
        </div>
      </section>

      {/* Simple FAQ */}
      <section id="faq" className="py-24 bg-[#FAF8F5]">
        <div className="max-w-2xl mx-auto px-6">
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
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-white text-sm">
              FashionFit<span className="text-rose-400">-PK</span>
            </p>
            <p className="mt-1">AI Virtual Try-On for Pakistani Ethnic Wear • Mutee Ur Rehman &amp; Hafiz Abdullah Muhammad</p>
          </div>
          <button
            onClick={() => openStudio('photo')}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Studio &amp; Server Settings
          </button>
        </div>
      </footer>

      {/* Clean Lightbox Modal */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-3xl bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-900">{lightboxItem.title}</p>
                <p className="text-xs text-slate-500">{lightboxItem.fabric} • Studio Model Preview</p>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={lightboxItem.image} alt={lightboxItem.title} className="w-full max-h-[70vh] object-contain bg-[#FAF8F5]" />
            <div className="px-6 py-4 bg-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <p className="text-xs text-slate-600">{lightboxItem.caption}</p>
              <button
                onClick={() => {
                  setLightboxItem(null)
                  openStudio('photo')
                }}
                className="px-4 py-2 rounded-full bg-[#0F5C4D] text-white text-xs font-semibold hover:bg-[#0b473b] cursor-pointer"
              >
                Try Your Own Photo →
              </button>
            </div>
          </div>
        </div>
      )}

      <TryOnStudioModal
        isOpen={studioOpen}
        initialTab={studioTab}
        onClose={() => setStudioOpen(false)}
        health={health}
        catalog={STUDIO_CATALOG}
        colabUrlInput={colabUrlInput}
        setColabUrlInput={setColabUrlInput}
        colabStatusMsg={colabStatusMsg}
        onSaveColabUrl={handleSaveColabUrl}
      />
    </div>
  )
}
