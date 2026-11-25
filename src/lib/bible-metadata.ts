export const ENGLISH_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

export const TELUGU_NAMES = [
  'ఆదికాండము', 'నిర్గమకాండము', 'లేవీయకాండము', 'సంఖ్యాకాండము', 'ద్వితీయోపదేశకాండము', 'యెహోషువ', 'న్యాయాధిపతులు', 'రూతు', 'సమూయేలు మొదటి గ్రంథము', 'సమూయేలు రెండవ గ్రంథము',
  'రాజులు మొదటి గ్రంథము', 'రాజులు రెండవ గ్రంథము', 'దినవృత్తాంతములు మొదటి గ్రంథము', 'దినవృత్తాంతములు రెండవ గ్రంథము', 'ఎజ్రా', 'నెహెమ్యా', 'ఎస్తేరు', 'యోబు', 'కీర్తనల గ్రంథము', 'సామెతలు',
  'ప్రసంగి', 'పరమగీతము', 'యెషయా', 'యిర్మీయా', 'విలాపవాక్యములు', 'యెహెజ్కేలు', 'దానియేలు', 'హోషేయ', 'యోవేలు', 'ఆమోసు',
  'ఓబద్యా', 'యోనా', 'మీకా', 'నహూము', 'హబక్కూకు', 'జెఫన్యా', 'హగ్గయి', 'జెకర్యా', 'మలాకీ',
  'మత్తయి సువార్త', 'మార్కు సువార్త', 'లూకా సువార్త', 'యోహాను సువార్త', 'అపొస్తలుల కార్యములు', 'రోమీయులకు', 'కొరింథీయులకు 1వ పత్రిక', 'కొరింథీయులకు 2వ పత్రిక', 'గలతీయులకు', 'ఎఫెసీయులకు',
  'ఫిలిప్పీయులకు', 'కొలొస్సయులకు', 'థెస్సలొనీకయులకు 1వ పత్రిక', 'థెస్సలొనీకయులకు 2వ పత్రిక', 'తిమోతికి 1వ పత్రిక', 'తిమోతికి 2వ పత్రిక', 'తీతుకు', 'ఫిలేమోనుకు', 'హెబ్రీయులకు', 'యాకోబు',
  'పేతురు 1వ పత్రిక', 'పేతురు 2వ పత్రిక', 'యోహాను 1వ పత్రిక', 'యోహాను 2వ పత్రిక', 'యోహాను 3వ పత్రిక', 'యూదా', 'ప్రకటన గ్రంథము'
];

import BIBLE_STRUCTURE from './bible-structure.json';

export function getChapterCount(bookIdx: number): number {
  if (bookIdx < 0 || bookIdx >= BIBLE_STRUCTURE.length) return 0;
  return BIBLE_STRUCTURE[bookIdx].length;
}

export function getVerseCount(bookIdx: number, chapterNum: number): number {
  if (bookIdx < 0 || bookIdx >= BIBLE_STRUCTURE.length) return 0;
  const chapters = BIBLE_STRUCTURE[bookIdx];
  if (chapterNum < 1 || chapterNum > chapters.length) return 0;
  return chapters[chapterNum - 1];
}
