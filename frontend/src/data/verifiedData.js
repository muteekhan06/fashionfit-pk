export const STUDIO_POSES = [
  {
    id: 'front',
    label: 'Front Portrait',
    desc: 'Straight-on full-body fit & neckline',
    demoImage: '/brand/pose_front.jpg',
  },
  {
    id: 'three_quarter',
    label: 'Angled Runway',
    desc: '3/4 editorial drape, sleeves & chaak',
    demoImage: '/brand/pose_angled.jpg',
  },
  {
    id: 'back_detail',
    label: 'Back Silhouette',
    desc: 'Rear length fall & lower border',
    demoImage: '/brand/pose_back.jpg',
  },
]

export const STUDIO_MODELS = [
  {
    id: 'adult',
    label: 'Adult Model',
    ageGroup: 'adult',
    image: '/brand/model_base.jpg',
    filename: 'studio_model_adult.jpg',
    caption: 'Adult women’s studio model',
  },
  {
    id: 'child',
    label: 'Girl Child',
    ageGroup: 'child',
    image: '/brand/model_girl_child.jpg',
    filename: 'studio_model_girl_child.jpg',
    caption: 'Girl child synthetic studio model',
  },
]

export const PREDEFINED_KURTAS = [
  {
    id: 'emerald-zari',
    category: 'kurta',
    ageGroup: 'adult',
    name: 'Emerald Zari Embroidered Kurta',
    fabric: 'Embroidered Cotton Lawn',
    color: 'Deep Emerald',
    image: '/brand/kurta_emerald.jpg',
    caption: 'Intricate ivory-gold neckline gala, embroidered cuffs, and scalloped daaman border.',
  },
  {
    id: 'royal-maroon',
    category: 'kurta',
    ageGroup: 'adult',
    name: 'Royal Maroon Festive Kurta',
    fabric: 'Festive Jacquard & Zari',
    color: 'Royal Maroon',
    image: '/brand/kurta_maroon.jpg',
    caption: 'Rich crimson festive tone with antique-gold floral embroidery along the placket and hem.',
  },
  {
    id: 'ivory-sapphire',
    category: 'kurta',
    ageGroup: 'adult',
    name: 'Ivory & Sapphire Classic Lawn',
    fabric: 'Printed Summer Lawn',
    color: 'Ivory & Royal Blue',
    image: '/brand/kurta_ivory_blue.jpg',
    caption: 'Breezy ivory lawn accented with royal sapphire botanical prints and crisp blue cuffs.',
  },
]

export const PREDEFINED_KIDS_OUTFITS = [
  {
    id: 'kids-ivory-frock',
    category: 'kids',
    ageGroup: 'child',
    name: 'Ivory Gold Festive Pishwas',
    fabric: 'Kids Embroidered Organza',
    color: 'Ivory & Gold',
    image: '/brand/kids_festive_frock.jpg',
    caption: 'Flared festive girl’s pishwas with delicate resham florals and antique-gold gota hem.',
  },
  {
    id: 'kids-plum-kurta',
    category: 'kids',
    ageGroup: 'child',
    name: 'Plum Embroidered Kids Kurta',
    fabric: 'Kids Soft Cotton Lawn',
    color: 'Deep Plum',
    image: '/brand/kids_plum_kurta.jpg',
    caption: 'Tailored plum kurta with silver-gold neckline motif paired with matching straight shalwar.',
  },
  {
    id: 'kids-pastel-sharara',
    category: 'kids',
    ageGroup: 'child',
    name: 'Rose & Mint Gota Sharara',
    fabric: 'Kids Festive Chiffon',
    color: 'Rose Pink & Mint',
    image: '/brand/kids_pastel_sharara.jpg',
    caption: 'Playful pastel rose kurta trimmed with fine gota patti and flared mint sharara.',
  },
]

export const PREDEFINED_LEHENGAS = [
  {
    id: 'lehenga-crimson-bridal',
    category: 'lehenga',
    ageGroup: 'adult',
    name: 'Crimson Zardozi Bridal Lehenga',
    fabric: 'Bridal Raw Silk & Zardozi',
    color: 'Regal Crimson',
    image: '/brand/lehenga_crimson_bridal.jpg',
    caption: 'Heavily embellished antique-gold zardozi choli with a grand A-line flared crimson bridal skirt.',
  },
  {
    id: 'lehenga-emerald-mehndi',
    category: 'lehenga',
    ageGroup: 'adult',
    name: 'Emerald Gota Mehndi Lehenga',
    fabric: 'Festive Silk & Mirror Work',
    color: 'Emerald & Marigold',
    image: '/brand/lehenga_emerald_mehndi.jpg',
    caption: 'Vibrant emerald choli and wide flared mehndi lehenga finished with marigold-gold border bands.',
  },
  {
    id: 'lehenga-ivory-walima',
    category: 'lehenga',
    ageGroup: 'adult',
    name: 'Ivory Pearl Walima Lehenga',
    fabric: 'Net, Dabka & Pearl Couture',
    color: 'Ivory & Champagne',
    image: '/brand/lehenga_ivory_walima.jpg',
    caption: 'Luminous ivory and champagne-gold pearl couture choli paired with a scalloped flared lehenga.',
  },
]

export const WARDROBE_CATEGORIES = [
  { id: 'kurta', label: "Women's Kurtas", items: PREDEFINED_KURTAS },
  { id: 'kids', label: 'Kids (Girls)', items: PREDEFINED_KIDS_OUTFITS },
  { id: 'lehenga', label: 'Wedding Lehengas', items: PREDEFINED_LEHENGAS },
]

export const ALL_WARDROBE_ITEMS = [
  ...PREDEFINED_KURTAS,
  ...PREDEFINED_KIDS_OUTFITS,
  ...PREDEFINED_LEHENGAS,
]

export const STUDIO_TIPS = [
  'Use a well-lit, clear full-body photo',
  'Stand in front of a plain, uncluttered background',
  'Face the camera directly with arms relaxed at your sides',
  'Try Cross-Age mode by pairing Adult Model with Kids outfits (or Girl Child with Kurtas & Lehengas)',
]
