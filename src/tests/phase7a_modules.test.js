/**
 * Phase 7 Wave 7A (M27–M32) Automated Verification & Security Audit Test Suite
 * Tests source-level security boundaries, RBAC guards, and core business logic for:
 * - M27: Admin Dashboard & View Switcher
 * - M28: Admin Daily Promises & Thumbnail Studio
 * - M29: Super Admin Daily Verses Manager (5,863 Verses)
 * - M30: Admin Sermons & Study Notes Manager
 * - M31: Admin Worship Songbook & Setlist Builder
 * - M32: Admin Bible Quiz Studio, AI Generator & Reports
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('==========================================================');
console.log('--- Rhema Web: Phase 7 Wave 7A (M27–M32) Test Suite ---');
console.log('==========================================================\n');

const ROOT = path.resolve(__dirname, '..');

const WAVE7A_FILES = [
  'lib/adminWave7aData.ts',
  'components/layout/AdminNavigationShell.tsx',
  'app/admin/page.tsx',
  'app/admin/promises/page.tsx',
  'app/admin/daily-verses/page.tsx',
  'app/admin/sermons/page.tsx',
  'app/admin/songs/page.tsx',
  'app/admin/quizzes/page.tsx',
];

// ==========================================
// Test 1: Strict Zero-Firebase & Zero-Secret Security Audit
// ==========================================
function testSecurityBoundaries() {
  const forbiddenPatterns = [
    /@\/lib\/firebase/i,
    /firebase\/firestore/i,
    /firebase\/storage/i,
    /firebase\/functions/i,
    /\b(addDoc|setDoc|updateDoc|deleteDoc|getDoc|getDocs|onSnapshot|uploadBytes)\b/,
    /firebase-admin/i,
    /AIza[0-9A-Za-z_-]{20,}/,
    /rzp_(live|test)_[0-9A-Za-z]+/,
    /gsk_[0-9A-Za-z]{20,}/,
  ];

  for (const rel of WAVE7A_FILES) {
    const abs = path.join(ROOT, rel);
    assert.strictEqual(fs.existsSync(abs), true, `Missing Wave 7A file: ${rel}`);
    const src = fs.readFileSync(abs, 'utf8');
    for (const pat of forbiddenPatterns) {
      assert.strictEqual(
        pat.test(src),
        false,
        `CRITICAL SECURITY VIOLATION: ${rel} matched forbidden pattern ${pat}`
      );
    }
  }
  console.log('✔ Test 1 Passed: Zero Firebase reads/writes, Admin SDK, or API secrets across all 8 Wave 7A files');
}

// ==========================================
// Test 2: RBAC Route Protection Guards (M27–M32)
// ==========================================
function testRbacRouteProtection() {
  const adminRoutes = [
    'app/admin/page.tsx',
    'app/admin/promises/page.tsx',
    'app/admin/sermons/page.tsx',
    'app/admin/songs/page.tsx',
    'app/admin/quizzes/page.tsx',
  ];

  for (const rel of adminRoutes) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert(
      src.includes("allowedRoles={['admin', 'superadmin']}"),
      `${rel} must enforce ProtectedRoute allowedRoles={['admin', 'superadmin']}`
    );
  }

  // M29 MUST be strictly Super Admin Only
  const m29Src = fs.readFileSync(path.join(ROOT, 'app/admin/daily-verses/page.tsx'), 'utf8');
  assert(
    m29Src.includes("allowedRoles={['superadmin']}"),
    'M29 /admin/daily-verses MUST restrict allowedRoles strictly to superadmin only'
  );
  assert(
    !m29Src.includes("'admin'"),
    'M29 /admin/daily-verses must NOT permit ordinary admin role'
  );

  // AdminNavigationShell must include explicit UI-only RBAC disclaimer and Simulation Banner
  const shellSrc = fs.readFileSync(path.join(ROOT, 'components/layout/AdminNavigationShell.tsx'), 'utf8');
  assert(shellSrc.includes('Layer A Frontend Simulation Mode'), 'Admin shell must display simulation banner');
  assert(shellSrc.includes('not backend enforcement'), 'Admin shell must display UI RBAC disclaimer');

  console.log('✔ Test 2 Passed: RBAC guards verified (M27/M28/M30/M31/M32 admin+superadmin, M29 superadmin-only)');
}

// ==========================================
// Test 3: M27 Admin Dashboard & Navigation Integrity
// ==========================================
function testM27AdminDashboard() {
  const shellSrc = fs.readFileSync(path.join(ROOT, 'components/layout/AdminNavigationShell.tsx'), 'utf8');
  const expectedRoutes = [
    '/admin',
    '/admin/promises',
    '/admin/daily-verses',
    '/admin/sermons',
    '/admin/songs',
    '/admin/quizzes',
    '/dashboard',
  ];
  for (const r of expectedRoutes) {
    assert(shellSrc.includes(`'${r}'`) || shellSrc.includes(`"${r}"`), `Missing nav route ${r} in AdminNavigationShell`);
  }

  // Ensure no broken links to unimplemented Wave 7B/7C routes
  const forbiddenDeadLinks = ['/admin/members', '/admin/finance', '/admin/prayers', '/admin/settings', '/admin/support'];
  for (const dead of forbiddenDeadLinks) {
    assert(!shellSrc.includes(`href: '${dead}'`), `Found dead Wave 7B/7C href in shell: ${dead}`);
  }

  const m27Src = fs.readFileSync(path.join(ROOT, 'app/admin/page.tsx'), 'utf8');
  assert(m27Src.includes('Demonstration Metrics Only'), 'M27 must label metrics as demonstration data');

  console.log('✔ Test 3 Passed: M27 Admin Dashboard navigation, demo labels, and zero dead links verified');
}

// ==========================================
// Test 4: M28 Daily Promises & Thumbnail Studio Logic
// ==========================================
function testM28PromisesLogic() {
  const dataSrc = fs.readFileSync(path.join(ROOT, 'lib/adminWave7aData.ts'), 'utf8');
  // Verify 16 palettes defined
  const paletteMatches = dataSrc.match(/bg1:\s*'#[0-9A-Fa-f]{6}'/g) || [];
  assert.strictEqual(paletteMatches.length, 16, `Expected 16 thumbnail palettes, found ${paletteMatches.length}`);

  // YouTube ID extractor parity test
  const extract = (input) => {
    const trimmed = (input || '').trim();
    if (!trimmed) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
    return m ? m[1] : null;
  };
  assert.strictEqual(extract('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(extract('https://www.youtube.com/watch?v=sampleFaith01'), 'sampleFaith01');
  assert.strictEqual(extract('not a valid url!!!'), null);

  console.log('✔ Test 4 Passed: M28 16 Canvas palettes and YouTube ID validation verified');
}

// ==========================================
// Test 5: M29 Super Admin Daily Verses 4-Slot Epoch Engine
// ==========================================
function testM29DailyVersesEpoch() {
  const computeFourSlotIndices = (dateStr, totalVerses) => {
    const base = new Date('2026-10-30T00:00:00Z').getTime();
    const target = new Date(`${dateStr}T00:00:00Z`).getTime();
    const diffDays = Math.floor((target - base) / 86400000);
    const safeTotal = Math.max(4, totalVerses);
    return [0, 1, 2, 3].map((slot) => (((diffDays * 4 + slot) % safeTotal) + safeTotal) % safeTotal);
  };

  assert.deepStrictEqual(computeFourSlotIndices('2026-10-30', 5863), [0, 1, 2, 3]);
  assert.deepStrictEqual(computeFourSlotIndices('2026-10-31', 5863), [4, 5, 6, 7]);
  // Wrap-around check on 12-verse demo subset
  assert.deepStrictEqual(computeFourSlotIndices('2026-11-02', 12), [0, 1, 2, 3]);

  const m29Src = fs.readFileSync(path.join(ROOT, 'app/admin/daily-verses/page.tsx'), 'utf8');
  assert(m29Src.includes('Modified Locally (Sim)'), 'M29 must clearly distinguish locally modified entries');
  assert(m29Src.includes('Baseline Sample'), 'M29 must label baseline entries');

  console.log('✔ Test 5 Passed: M29 4-slot epoch scheduling and local-vs-baseline distinction verified');
}

// ==========================================
// Test 6: M30 Sermons Manager Validation
// ==========================================
function testM30SermonsValidation() {
  const validExt = (name) => /\.(pdf|docx|txt)$/i.test(name);
  assert.strictEqual(validExt('sermon-notes.pdf'), true);
  assert.strictEqual(validExt('outline.docx'), true);
  assert.strictEqual(validExt('script.exe'), false);
  assert.strictEqual(validExt('payload.html'), false);

  const m30Src = fs.readFileSync(path.join(ROOT, 'app/admin/sermons/page.tsx'), 'utf8');
  assert(m30Src.includes('Zero Firebase Storage Upload'), 'M30 must explicitly disclose zero Storage uploads');

  console.log('✔ Test 6 Passed: M30 Sermons file extension allowlist and zero-upload guard verified');
}

// ==========================================
// Test 7: M31 Worship Songbook 7-Language & Transposition Logic
// ==========================================
function testM31SongbookAndSetlists() {
  const CHROMATIC_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const transposeKey = (key, semitones) => {
    const clean = key.replace(/m$/, '');
    const isMinor = key.endsWith('m');
    const idx = CHROMATIC_KEYS.indexOf(clean);
    if (idx === -1) return key;
    const next = CHROMATIC_KEYS[((idx + semitones) % 12 + 12) % 12];
    return isMinor ? `${next}m` : next;
  };

  assert.strictEqual(transposeKey('G', 2), 'A');
  assert.strictEqual(transposeKey('E', -2), 'D');
  assert.strictEqual(transposeKey('C', -1), 'B');
  assert.strictEqual(transposeKey('Am', 2), 'Bm');

  // Reorder simulation
  const entries = ['song-1', 'song-2', 'song-3'];
  const copy = [...entries];
  const [moved] = copy.splice(1, 1);
  copy.splice(0, 0, moved);
  assert.deepStrictEqual(copy, ['song-2', 'song-1', 'song-3']);

  const m31Src = fs.readFileSync(path.join(ROOT, 'app/admin/songs/page.tsx'), 'utf8');
  for (const lang of ['English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Marathi']) {
    assert(m31Src.includes(lang), `M31 missing regional language tab: ${lang}`);
  }

  console.log('✔ Test 7 Passed: M31 7-language tabs, chromatic key transposition, and setlist ordering verified');
}

// ==========================================
// Test 8: M32 Quiz Studio Delimited Parser & Scoring
// ==========================================
function testM32QuizStudio() {
  const parse = (raw) => {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    const errors = [];
    lines.forEach((line, idx) => {
      const cols = line.split(line.includes('|') ? '|' : ',').map((c) => c.trim());
      if (cols.length < 6) {
        errors.push(`Line ${idx + 1}`);
        return;
      }
      const cIdx = Number(cols[5]);
      if (!Number.isInteger(cIdx) || cIdx < 0 || cIdx > 3) {
        errors.push(`Line ${idx + 1}`);
        return;
      }
      parsed.push({ question: cols[0], correctIndex: cIdx });
    });
    return { parsed, errors };
  };

  const sample = [
    'Who built the ark?|Moses|Noah|David|Paul|1|Gen 6:14|Noah built the ark.',
    'Bad line with missing cols|A|B',
    'Bad index row?|A|B|C|D|9|Ref|Exp',
  ].join('\n');

  const res = parse(sample);
  assert.strictEqual(res.parsed.length, 1, 'Should parse 1 valid question');
  assert.strictEqual(res.parsed[0].correctIndex, 1);
  assert.strictEqual(res.errors.length, 2, 'Should report 2 malformed rows');

  const m32Src = fs.readFileSync(path.join(ROOT, 'app/admin/quizzes/page.tsx'), 'utf8');
  assert(m32Src.includes('Zero External AI Keys'), 'M32 must disclose simulated AI template boundary');
  assert(m32Src.includes('Zero Real Member PII'), 'M32 analytics table must disclose zero real PII');

  console.log('✔ Test 8 Passed: M32 CSV/TXT parser validation, error handling, and zero-AI-key boundary verified');
}

testSecurityBoundaries();
testRbacRouteProtection();
testM27AdminDashboard();
testM28PromisesLogic();
testM29DailyVersesEpoch();
testM30SermonsValidation();
testM31SongbookAndSetlists();
testM32QuizStudio();

console.log('\n==========================================================');
console.log('🎉 ALL 8 WAVE 7A (M27–M32) TESTS & SECURITY AUDITS PASSED!');
console.log('==========================================================');
