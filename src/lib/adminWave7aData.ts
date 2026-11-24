/**
 * Wave 7A (M27–M32) Shared Demonstration Datasets & Pure Utilities
 * Strictly Layer A Frontend Simulation Mode — ZERO Firebase imports, reads, or writes.
 */

export const ADMIN_DEMO_BRANCHES = [
  { id: 'rhema-central', name: 'Rhema Central Sanctuary (Demo)', city: 'Bangalore', membersDemo: 1248 },
  { id: 'rhema-north', name: 'Rhema North Campus (Demo)', city: 'Hebbal', membersDemo: 412 },
  { id: 'rhema-south', name: 'Rhema South Fellowship (Demo)', city: 'Electronic City', membersDemo: 286 },
] as const;

export interface AdminPromiseItem {
  id: string;
  date: string; // YYYY-MM-DD
  titleEn: string;
  titleTe: string;
  verseRef: string;
  verseTextEn: string;
  verseTextTe: string;
  devotionalEn: string;
  youtubeId?: string;
  status: 'Published (Sim)' | 'Scheduled (Sim)' | 'Draft (Sim)' | 'Published' | 'Draft' | string;
  paletteIndex: number;
  updatedAt: string;
}

export const INITIAL_ADMIN_PROMISES: AdminPromiseItem[] = [
  {
    id: 'prom-1',
    date: '2026-11-19',
    titleEn: 'Strength Renewed Like Eagles',
    titleTe: 'పక్షిరాజులవలె నూతన బలము',
    verseRef: 'Isaiah 40:31',
    verseTextEn: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
    verseTextTe: 'యెహోవా కొరకు ఎదురు చూచువారు నూతన బలము పొందుదురు; వారు పక్షిరాజులవలె రెక్కలు చాపి పైకి ఎగురుదురు.',
    devotionalEn: 'Waiting upon God is never wasted time. In stillness and prayer, His Spirit exchanges human weariness for supernatural endurance.',
    youtubeId: 'dQw4w9WgXcQ',
    status: 'Published (Sim)',
    paletteIndex: 0,
    updatedAt: '2026-11-18',
  },
  {
    id: 'prom-2',
    date: '2026-11-20',
    titleEn: 'Peace That Guards Your Heart',
    titleTe: 'హృదయమును కాపాడు దేవుని సమాధానము',
    verseRef: 'Philippians 4:6-7',
    verseTextEn: 'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
    verseTextTe: 'అప్పుడు సమస్త జ్ఞానమునకు మించిన దేవుని సమాధానము యేసుక్రీస్తు వలన మీ హృదయములకును మీ తలంపులకును కావలియుండును.',
    devotionalEn: 'Bring every anxiety to the throne of grace with thanksgiving. Christ stands sentinel over the surrendered mind.',
    status: 'Scheduled (Sim)',
    paletteIndex: 2,
    updatedAt: '2026-11-18',
  },
  {
    id: 'prom-3',
    date: '2026-11-21',
    titleEn: 'The Lord Is My Shepherd',
    titleTe: 'యెహోవా నా కాపరి',
    verseRef: 'Psalm 23:1-3',
    verseTextEn: 'The Lord is my shepherd, I lack nothing. He refreshes my soul and guides me along the right paths.',
    verseTextTe: 'యెహోవా నా కాపరి, నాకు లేమి కలుగదు. ఆయన నా ప్రాణమునకు సేదదీర్చుచున్నాడు.',
    devotionalEn: 'Walk confidently knowing the Good Shepherd goes ahead of you to prepare still waters and green pastures.',
    status: 'Draft (Sim)',
    paletteIndex: 1,
    updatedAt: '2026-11-19',
  },
];

export const THUMBNAIL_PALETTES = [
  { name: 'Royal Navy & Gold', bg1: '#0B192C', bg2: '#132A4A', accent: '#E5C158', text: '#FFFFFF' },
  { name: 'Forest Sanctuary', bg1: '#0F3823', bg2: '#1E6F43', accent: '#F3D27A', text: '#FFFFFF' },
  { name: 'Warm Ivory & Olive', bg1: '#F7F5EE', bg2: '#EAE3D2', accent: '#1E6F43', text: '#18221B' },
  { name: 'Midnight Velvet', bg1: '#14112A', bg2: '#2B1F4E', accent: '#F59E0B', text: '#FFFFFF' },
  { name: 'Dawn Amber', bg1: '#451A03', bg2: '#92400E', accent: '#FDE68A', text: '#FFFFFF' },
  { name: 'Deep Crimson Grace', bg1: '#3B0A16', bg2: '#7F1D1D', accent: '#FCD34D', text: '#FFFFFF' },
  { name: 'Ocean Covenant', bg1: '#082F49', bg2: '#0369A1', accent: '#BAE6FD', text: '#FFFFFF' },
  { name: 'Cedar & Parchment', bg1: '#292524', bg2: '#44403C', accent: '#D6B15E', text: '#FAFAF9' },
  { name: 'Emerald Twilight', bg1: '#064E3B', bg2: '#0B192C', accent: '#34D399', text: '#FFFFFF' },
  { name: 'Golden Cathedral', bg1: '#1C1917', bg2: '#3F2E12', accent: '#EAB308', text: '#FEF9C3' },
  { name: 'Sky Morning', bg1: '#0C4A6E', bg2: '#1E3A8A', accent: '#FDE047', text: '#FFFFFF' },
  { name: 'Plum Intercession', bg1: '#3B0764', bg2: '#1E1B4B', accent: '#E9D5FF', text: '#FFFFFF' },
  { name: 'Olive Harvest', bg1: '#1A2E05', bg2: '#365314', accent: '#D9F99D', text: '#FFFFFF' },
  { name: 'Slate & Silver', bg1: '#0F172A', bg2: '#334155', accent: '#E2E8F0', text: '#FFFFFF' },
  { name: 'Rose Covenant', bg1: '#4C0519', bg2: '#881337', accent: '#FDA4AF', text: '#FFFFFF' },
  { name: 'Saffron Light', bg1: '#78350F', bg2: '#B45309', accent: '#FEF3C7', text: '#FFFFFF' },
];

export interface DailyVerseRecord {
  index: number; // 0..5862 representation
  reference: string;
  book: string;
  category: 'Promise' | 'Strength' | 'Peace' | 'Praise' | 'Wisdom' | 'Faith';
  textEn: string;
  textTe: string;
  themeColor: string;
  assignedDate?: string;
  assignedSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  isModifiedLocally?: boolean;
}

export const SAMPLE_DAILY_VERSES: DailyVerseRecord[] = [
  {
    index: 0,
    reference: 'Lamentations 3:22-23',
    book: 'Lamentations',
    category: 'Promise',
    textEn: 'Because of the Lord’s great love we are not consumed, for his compassions never fail. They are new every morning.',
    textTe: 'యెహోవా కృప ఎడతెగక నిలుచును; అనుదినము ఉదయమున అవి నూతనముగా పుట్టుచున్నవి.',
    themeColor: '#0B192C',
  },
  {
    index: 1,
    reference: 'Joshua 1:9',
    book: 'Joshua',
    category: 'Strength',
    textEn: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
    textTe: 'నిబ్బరము కలిగి ధైర్యముగా నుండుము; దిగులుపడకుము, జడియకుము. నీవు నడుచు మార్గమంతటిలో నీ దేవుడైన యెహోవా నీకు తోడైయుండును.',
    themeColor: '#1E6F43',
  },
  {
    index: 2,
    reference: 'Psalm 121:1-2',
    book: 'Psalms',
    category: 'Peace',
    textEn: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.',
    textTe: 'కొండలతట్టు నా కన్నులెత్తుచున్నాను; నాకు సహాయము ఎక్కడనుండి వచ్చును? భూమ్యాకాశములను సృజించిన యెహోవా వలననే నాకు సహాయము కలుగును.',
    themeColor: '#132A4A',
  },
  {
    index: 3,
    reference: 'Psalm 4:8',
    book: 'Psalms',
    category: 'Peace',
    textEn: 'In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.',
    textTe: 'యెహోవా, నీవే నన్ను సురక్షితముగా నివసింపజేయువాడవు; నెమ్మదితో పండుకొని నిద్రపోవుదును.',
    themeColor: '#1E293B',
  },
  {
    index: 4,
    reference: 'Proverbs 3:5-6',
    book: 'Proverbs',
    category: 'Wisdom',
    textEn: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him.',
    textTe: 'నీ స్వబుద్ధిని ఆధారము చేసికొనక నీ పూర్ణహృదయముతో యెహోవాయందు నమ్మకముంచుము.',
    themeColor: '#78350F',
  },
  {
    index: 5,
    reference: 'Romans 8:28',
    book: 'Romans',
    category: 'Promise',
    textEn: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    textTe: 'దేవుని ప్రేమించువారికి అనగా ఆయన సంకల్పము చొప్పున పిలువబడినవారికి మేలు కలుగుటకై సమస్తమును సమకూడి జరుగుచున్నవని ఎరుగుదుము.',
    themeColor: '#064E3B',
  },
  {
    index: 6,
    reference: 'Hebrews 11:1',
    book: 'Hebrews',
    category: 'Faith',
    textEn: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
    textTe: 'విశ్వాసమనునది నిరీక్షింపబడు వాటియొక్క నిజస్వరూపమును, అదృశ్యమైనవి యున్నవనుటకు రుజువునై యున్నది.',
    themeColor: '#3B0764',
  },
  {
    index: 7,
    reference: 'Psalm 100:4',
    book: 'Psalms',
    category: 'Praise',
    textEn: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.',
    textTe: 'కృతజ్ఞతార్పణలు చెల్లించుచు ఆయన గుమ్మములలో ప్రవేశించుడి; కీర్తనలు పాడుచు ఆయన ఆవరణములలో ప్రవేశించుడి.',
    themeColor: '#082F49',
  },
  {
    index: 8,
    reference: 'Isaiah 41:10',
    book: 'Isaiah',
    category: 'Strength',
    textEn: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.',
    textTe: 'నీకు తోడైయున్నాను భయపడకుము; నేను నీ దేవుడనై యున్నాను దిగులుపడకుము; నేను నిన్ను బలపరతును, నీకు సహాయము చేయువాడను నేనే.',
    themeColor: '#0B192C',
  },
  {
    index: 9,
    reference: 'Jeremiah 29:11',
    book: 'Jeremiah',
    category: 'Promise',
    textEn: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
    textTe: 'నేను మిమ్మును గూర్చి ఉద్దేశించిన సంగతులను నేనెరుగుదును; రాబోవు కాలమందు మీకు నిరీక్షణ కలుగునట్లుగా అవి సమాధానకరమైన ఉద్దేశములే.',
    themeColor: '#1E6F43',
  },
  {
    index: 10,
    reference: 'Matthew 11:28',
    book: 'Matthew',
    category: 'Peace',
    textEn: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    textTe: 'ప్రయాసపడి భారము మోసికొనుచున్న సమస్త జనులారా, నా యొద్దకు రండి; నేను మీకు విశ్రాంతి కలుగజేతును.',
    themeColor: '#132A4A',
  },
  {
    index: 11,
    reference: '2 Corinthians 12:9',
    book: '2 Corinthians',
    category: 'Strength',
    textEn: 'My grace is sufficient for you, for my power is made perfect in weakness.',
    textTe: 'నా కృప నీకు చాలును; బలహీనతయందు నా శక్తి పరిపూర్ణమగుచున్నది.',
    themeColor: '#4C0519',
  },
];

export const DAILY_VERSES_EPOCH = '2026-10-30';
export const DAILY_VERSES_CANON_TOTAL = 5863;

export function computeFourSlotIndices(dateStr: string, totalVerses: number): number[] {
  const base = new Date(`${DAILY_VERSES_EPOCH}T00:00:00Z`).getTime();
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const diffDays = Math.floor((target - base) / (1000 * 60 * 60 * 24));
  const safeTotal = Math.max(4, totalVerses);
  return [0, 1, 2, 3].map((slot) => {
    const raw = diffDays * 4 + slot;
    return ((raw % safeTotal) + safeTotal) % safeTotal;
  });
}

export interface AdminSermonItem {
  id: string;
  title: string;
  speaker: string;
  category: string;
  date: string;
  duration: string;
  youtubeUrl: string;
  status: 'Published (Sim)' | 'Scheduled (Sim)' | 'Draft (Sim)' | 'Published' | 'Draft' | string;
  scriptureRef: string;
  studyNotesText: string;
  attachedFileName?: string;
  attachedFileSizeKb?: number;
}

export const INITIAL_SERMON_CATEGORIES = [
  'Sunday Worship',
  'Book of Romans Series',
  'Faith & Prayer',
  'Youth Revival',
  'Family & Stewardship',
];

export const INITIAL_ADMIN_SERMONS: AdminSermonItem[] = [
  {
    id: 'serm-1',
    title: 'Walking in Unshakeable Faith',
    speaker: 'Senior Pastor John (Demo)',
    category: 'Faith & Prayer',
    date: '2026-11-16',
    duration: '38:45',
    youtubeUrl: 'https://www.youtube.com/watch?v=sampleFaith01',
    status: 'Published (Sim)',
    scriptureRef: 'Hebrews 11:1-6',
    studyNotesText: '1. Faith anchors the soul in unseen promises.\n2. Obedience turns hearing the Word into transformation.\n3. Perseverance matures spiritual fruit in seasons of testing.',
    attachedFileName: 'walking-in-faith-notes.pdf',
    attachedFileSizeKb: 248,
  },
  {
    id: 'serm-2',
    title: 'The Power of Persistent Intercession',
    speaker: 'Pastor Gabriel (Demo)',
    category: 'Sunday Worship',
    date: '2026-11-09',
    duration: '42:10',
    youtubeUrl: 'https://www.youtube.com/watch?v=samplePray02',
    status: 'Published (Sim)',
    scriptureRef: 'James 5:16-18',
    studyNotesText: '1. Prayer aligns our desires with God’s kingdom purpose.\n2. Corporate intercession strengthens the local church family.\n3. Thanksgiving seals every petition with expectancy.',
    attachedFileName: 'intercession-study-guide.docx',
    attachedFileSizeKb: 184,
  },
  {
    id: 'serm-3',
    title: 'Living Sacrifices in Everyday Work',
    speaker: 'Pastor Samuel (Demo)',
    category: 'Book of Romans Series',
    date: '2026-11-23',
    duration: '35:00',
    youtubeUrl: '',
    status: 'Scheduled (Sim)',
    scriptureRef: 'Romans 12:1-2',
    studyNotesText: 'Outline draft: Renewal of the mind, discerning God’s good and pleasing will, and honoring Christ in vocation.',
  },
];

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
  return match ? match[1] : null;
}

export interface AdminSongItem {
  id: string;
  title: string;
  category: 'Praise' | 'Worship' | 'Communion' | 'Altar Call' | 'Hymn';
  musicalKey: string;
  tempoBpm: number;
  timeSignature: string;
  worshipLeader: string;
  chords: string;
  lyrics: {
    en: string;
    te: string;
    hi: string;
    ta: string;
    kn: string;
    ml: string;
    mr: string;
  };
}

export interface AdminSetlistItem {
  id: string;
  serviceName: string;
  serviceDate: string;
  leader: string;
  entries: { songId: string; keyOverride?: string; notes?: string }[];
}

export const CHROMATIC_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function transposeKey(key: string, semitones: number): string {
  const clean = key.replace(/m$/, '');
  const isMinor = key.endsWith('m');
  const idx = CHROMATIC_KEYS.indexOf(clean);
  if (idx === -1) return key;
  const next = CHROMATIC_KEYS[((idx + semitones) % 12 + 12) % 12];
  return isMinor ? `${next}m` : next;
}

export const INITIAL_ADMIN_SONGS: AdminSongItem[] = [
  {
    id: 'song-1',
    title: 'Way Maker (Bilingual)',
    category: 'Worship',
    musicalKey: 'E',
    tempoBpm: 68,
    timeSignature: '4/4',
    worshipLeader: 'Worship Team (Demo)',
    chords: 'A  E  B  C#m  |  Chorus: A  E  B  C#m',
    lyrics: {
      en: 'You are here, moving in our midst\nI worship You, I worship You\nWay maker, miracle worker, promise keeper, light in the darkness',
      te: 'నీవు ఇక్కడ ఉన్నావు, మా మధ్య కదులుచున్నావు\nనిన్ను ఆరాధింతును, నిన్ను ఆరాధింతును\nమార్గము చేయువాడా, అద్భుతకరుడా, వాగ్దానము నెరవేర్చువాడా',
      hi: 'तू यहाँ है, हमारे बीच काम कर रहा है\nमैं तेरी आराधना करता हूँ',
      ta: 'நீர் இங்கே இருக்கிறீர், எங்கள் நடுவில் கிரியை செய்கிறீர்',
      kn: 'ನೀನು ಇಲ್ಲಿದ್ದೀಯೆ, ನಮ್ಮ ಮಧ್ಯೆ ಕಾರ್ಯ ಮಾಡುತ್ತಿದ್ದೀಯೆ',
      ml: 'നീ ഇവിടെയുണ്ട്, ഞങ്ങളുടെ മദ്ധ്യേ പ്രവർത്തിക്കുന്നു',
      mr: 'तू येथे आहेस, आमच्यामध्ये कार्य करत आहेस',
    },
  },
  {
    id: 'song-2',
    title: '10,000 Reasons (Bless the Lord)',
    category: 'Praise',
    musicalKey: 'G',
    tempoBpm: 73,
    timeSignature: '4/4',
    worshipLeader: 'Choir Lead (Demo)',
    chords: 'C  G  D  Em  |  C  G  D  G',
    lyrics: {
      en: 'Bless the Lord, O my soul, O my soul\nWorship His holy name\nSing like never before, O my soul',
      te: 'నా ప్రాణమా యెహోవాను సన్నుతించుము\nఆయన పరిశుద్ధ నామమును ఆరాధించుము',
      hi: 'हे मेरे मन यहोवा को धन्य कह\nउसके पवित्र नाम की स्तुति कर',
      ta: 'என் ஆத்துமாவே கர்த்தரை ஸ்தோத்திரி',
      kn: 'ನನ್ನ ಆತ್ಮವೇ ಕರ್ತನನ್ನು ಸ್ತುತಿಸು',
      ml: 'എന്റെ ആത്മാവേ യഹോവയെ വാഴ്ത്തുക',
      mr: 'हे माझ्या जिवा परमेश्वराचा धन्यवाद कर',
    },
  },
  {
    id: 'song-3',
    title: 'Great Is Thy Faithfulness',
    category: 'Hymn',
    musicalKey: 'D',
    tempoBpm: 88,
    timeSignature: '3/4',
    worshipLeader: 'Sanctuary Choir (Demo)',
    chords: 'D  G  A7  D  |  Bm  Em  A  D',
    lyrics: {
      en: 'Great is Thy faithfulness, O God my Father\nThere is no shadow of turning with Thee\nMorning by morning new mercies I see',
      te: 'నీ విశ్వాస్యత గొప్పది, నా తండ్రి దేవా\nప్రతి ఉదయము నూతన కృపలను చూచుచున్నాను',
      hi: 'तेरी विश्वासयोग्यता महान है, हे पिता परमेश्वर',
      ta: 'உமது உண்மை எவ்வளவு பெரியது பிதாவே',
      kn: 'ನಿನ್ನ ನಂಬಿಗಸ್ತಿಕೆಯು ಮಹತ್ತಾದುದು ತಂದೆಯೇ',
      ml: 'നിന്റെ വിശ്വസ്തത എത്ര വലിയത് പിതാവേ',
      mr: 'तुझी विश्वासार्हता महान आहे हे पित्या',
    },
  },
  {
    id: 'song-4',
    title: 'Goodness of God',
    category: 'Altar Call',
    musicalKey: 'A',
    tempoBpm: 63,
    timeSignature: '4/4',
    worshipLeader: 'Worship Team (Demo)',
    chords: 'A  D  E  F#m  |  D  A  E  A',
    lyrics: {
      en: 'All my life You have been faithful\nAll my life You have been so, so good\nWith every breath that I am able, I will sing of the goodness of God',
      te: 'నా జీవితమంతా నీవు నమ్మకముగా ఉన్నావు\nనా జీవితమంతా నీవు ఎంతో మంచివాడవు',
      hi: 'मेरे पूरे जीवन में तू विश्वासयोग्य रहा है',
      ta: 'என் வாழ்நாள் முழுவதும் நீர் உண்மையுள்ளவர்',
      kn: 'ನನ್ನ ಜೀವನವೆಲ್ಲಾ ನೀನು ನಂಬಿಗಸ್ತನಾಗಿದ್ದೀಯೆ',
      ml: 'എന്റെ ജീവിതകാലം മുഴുവൻ നീ വിശ്വസ്തനാണ്',
      mr: 'माझ्या संपूर्ण आयुष्यात तू विश्वासू राहिला आहेस',
    },
  },
];

export const INITIAL_ADMIN_SETLISTS: AdminSetlistItem[] = [
  {
    id: 'set-1',
    serviceName: 'Sunday Morning Worship Service (Sample)',
    serviceDate: '2026-11-23',
    leader: 'Pastor Gabriel (Demo)',
    entries: [
      { songId: 'song-2', keyOverride: 'G', notes: 'Upbeat opening praise' },
      { songId: 'song-1', keyOverride: 'E', notes: 'Flow into Telugu chorus' },
      { songId: 'song-4', keyOverride: 'A', notes: 'Altar call & benediction' },
    ],
  },
];

export interface AdminQuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
  scriptureRef: string;
  explanation: string;
}

export interface AdminQuizItem {
  id: string;
  title: string;
  category: 'Old Testament' | 'New Testament' | 'Gospels' | 'Epistles' | 'Psalms & Wisdom';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeLimitMinutes: number;
  passingScorePct: number;
  status: 'Published (Sim)' | 'Scheduled (Sim)' | 'Draft (Sim)' | 'Published' | 'Draft' | string;
  questions: AdminQuizQuestion[];
}

export const INITIAL_ADMIN_QUIZZES: AdminQuizItem[] = [
  {
    id: 'quiz-1',
    title: 'Foundations of Faith — Hebrews 11',
    category: 'Epistles',
    difficulty: 'Intermediate',
    timeLimitMinutes: 10,
    passingScorePct: 70,
    status: 'Published (Sim)',
    questions: [
      {
        id: 'q1',
        question: 'How does Hebrews 11:1 define faith?',
        options: [
          'Confidence in what we hope for and assurance about what we do not see',
          'Observing all ceremonial laws without exception',
          'Knowing every mystery of prophecy',
          'Speaking in multiple languages',
        ],
        correctIndex: 0,
        scriptureRef: 'Hebrews 11:1',
        explanation: 'Hebrews 11:1 defines faith as the substance (confidence) of things hoped for and the evidence (assurance) of things unseen.',
      },
      {
        id: 'q2',
        question: 'According to Hebrews 11:6, what is impossible without faith?',
        options: ['Building an altar', 'Pleasing God', 'Fasting forty days', 'Leading a choir'],
        correctIndex: 1,
        scriptureRef: 'Hebrews 11:6',
        explanation: 'Hebrews 11:6 states that without faith it is impossible to please God, because anyone who comes to Him must believe that He exists.',
      },
    ],
  },
  {
    id: 'quiz-2',
    title: 'Parables of the Kingdom — Gospel of Matthew',
    category: 'Gospels',
    difficulty: 'Beginner',
    timeLimitMinutes: 8,
    passingScorePct: 60,
    status: 'Draft (Sim)',
    questions: [
      {
        id: 'q3',
        question: 'In the Parable of the Sower (Matthew 13), what represents the seed?',
        options: ['Silver coins', 'The Word of the Kingdom', 'Mustard leaves', 'Temple oil'],
        correctIndex: 1,
        scriptureRef: 'Matthew 13:19',
        explanation: 'Jesus explains that the seed sown is the message/Word about the Kingdom of Heaven.',
      },
    ],
  },
];

/**
 * Pure client-side CSV/pipe-delimited question parser for M32.
 * Expected columns: question | optA | optB | optC | optD | correctIndex(0-3) | scriptureRef | explanation
 */
export function parseQuizQuestionsFromDelimitedText(raw: string): {
  parsed: AdminQuizQuestion[];
  errors: string[];
} {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('question|') && !l.toLowerCase().startsWith('question,'));

  const parsed: AdminQuizQuestion[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const delimiter = line.includes('|') ? '|' : ',';
    const cols = line.split(delimiter).map((c) => c.trim());
    if (cols.length < 6) {
      errors.push(`Line ${idx + 1}: expected at least 6 columns (Question, 4 Options, Correct Index 0-3).`);
      return;
    }
    const correctIdx = Number(cols[5]);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) {
      errors.push(`Line ${idx + 1}: correctIndex "${cols[5]}" must be 0, 1, 2, or 3.`);
      return;
    }
    parsed.push({
      id: `imp-${Date.now()}-${idx}`,
      question: cols[0],
      options: [cols[1], cols[2], cols[3], cols[4]],
      correctIndex: correctIdx,
      scriptureRef: cols[6] || 'Scripture Reference',
      explanation: cols[7] || 'Imported question (local parser simulation).',
    });
  });

  return { parsed, errors };
}
