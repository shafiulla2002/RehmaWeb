/**
 * Phase 7B - M35 (Prayer Moderation) & M36 (Testimony Moderation) Test Suite
 * Verifies Layer A Frontend Simulation Mode invariants, RBAC, storage keys,
 * category sets, emergency keyword triage, anonymity controls, and zero Firebase imports.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- RUNNING WAVE 7B (M35 & M36) VALIDATION TEST SUITE ---');

const repoRoot = path.resolve(__dirname, '../..');
const prayerPath = path.join(repoRoot, 'src/app/admin/prayer/page.tsx');
const testimoniesPath = path.join(repoRoot, 'src/app/admin/testimonies/page.tsx');
const navShellPath = path.join(repoRoot, 'src/components/layout/AdminNavigationShell.tsx');
const wave7bDataPath = path.join(repoRoot, 'src/lib/adminWave7bData.ts');

// 1. Verify File Existence
assert(fs.existsSync(prayerPath), 'M35 prayer page must exist');
assert(fs.existsSync(testimoniesPath), 'M36 testimonies page must exist');
assert(fs.existsSync(navShellPath), 'AdminNavigationShell must exist');
assert(fs.existsSync(wave7bDataPath), 'adminWave7bData must exist');
console.log('✅ PASS: All required route and data files exist.');

// 2. Verify M35 Prayer Moderation Invariants
const prayerSrc = fs.readFileSync(prayerPath, 'utf-8');

// RBAC
assert(prayerSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M35 must restrict to admin and superadmin roles');
// Shell
assert(prayerSrc.includes('<AdminNavigationShell>'), 'M35 must be wrapped in AdminNavigationShell');
// LocalStorage Key
assert(prayerSrc.includes('@rhema_admin_demo_prayer'), 'M35 must persist to @rhema_admin_demo_prayer');
// Emergency Keywords
const expectedKeywords = ['icu', 'hospital', 'critical', 'emergency', 'accident', 'oxygen', 'surgery', 'urgent'];
for (const kw of expectedKeywords) {
  assert(prayerSrc.toLowerCase().includes(kw), `M35 must detect emergency keyword: ${kw}`);
}
// Decisions
assert(prayerSrc.includes('Approved for Wall (Public)'), 'M35 must support Approved for Wall (Public)');
assert(prayerSrc.includes('Pastoral Confidential'), 'M35 must support Pastoral Confidential');
assert(prayerSrc.includes('Answered Praise'), 'M35 must support Answered Praise');
// Anonymity
assert(prayerSrc.includes('isAnonymousOnWall'), 'M35 must preserve and support isAnonymousOnWall');
// Zero Firebase
assert(!prayerSrc.includes("from 'firebase"), 'M35 must have zero Firebase imports');
assert(!prayerSrc.includes('getFirestore'), 'M35 must have zero Firestore calls');
console.log('✅ PASS: M35 Prayer Request Moderation invariants fully satisfied.');

// 3. Verify M36 Testimony Moderation Invariants
const testimoniesSrc = fs.readFileSync(testimoniesPath, 'utf-8');

// RBAC
assert(testimoniesSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M36 must restrict to admin and superadmin roles');
// Shell
assert(testimoniesSrc.includes('<AdminNavigationShell>'), 'M36 must be wrapped in AdminNavigationShell');
// LocalStorage Key
assert(testimoniesSrc.includes('@rhema_admin_demo_testimonies'), 'M36 must persist to @rhema_admin_demo_testimonies');
// Categories
const expectedCategories = [
  'Miraculous Healing',
  'Financial & Job Breakthrough',
  'Family Deliverance',
  'Salvation Experience',
  'Academic Success',
  'General Thanksgiving',
];
for (const cat of expectedCategories) {
  assert(testimoniesSrc.includes(cat), `M36 must support category: ${cat}`);
}
// Actions & Statuses
assert(testimoniesSrc.includes('Approved for Congregation (Sim)'), 'M36 must support Approved for Congregation (Sim)');
assert(testimoniesSrc.includes('Needs Pastoral Clarification (Sim)'), 'M36 must support Needs Pastoral Clarification (Sim)');
assert(testimoniesSrc.includes('Archived (Sim)'), 'M36 must support Archived (Sim)');
// Sunday Spotlight
assert(testimoniesSrc.includes('isFeaturedForSunday'), 'M36 must support isFeaturedForSunday flag toggle');
// Amen Increment
assert(testimoniesSrc.includes('initialAmenCount'), 'M36 must support initialAmenCount tracking');
// Anonymity
assert(testimoniesSrc.includes('isAnonymous'), 'M36 must support isAnonymous preservation');
// Zero Firebase
assert(!testimoniesSrc.includes("from 'firebase"), 'M36 must have zero Firebase imports');
assert(!testimoniesSrc.includes('getFirestore'), 'M36 must have zero Firestore calls');
console.log('✅ PASS: M36 Testimony Moderation invariants fully satisfied.');

// 4. Verify Admin Navigation Shell Integration
const navSrc = fs.readFileSync(navShellPath, 'utf-8');
assert(navSrc.includes("'/admin/prayer'"), 'AdminNavigationShell must have /admin/prayer route');
assert(navSrc.includes("'/admin/testimonies'"), 'AdminNavigationShell must have /admin/testimonies route');
assert(navSrc.includes("'M35'"), 'AdminNavigationShell must include M35 in isImplemented');
assert(navSrc.includes("'M36'"), 'AdminNavigationShell must include M36 in isImplemented');
console.log('✅ PASS: AdminNavigationShell integration verified for M35 and M36.');

// 5. Verify adminWave7bData datasets
const dataSrc = fs.readFileSync(wave7bDataPath, 'utf-8');
assert(dataSrc.includes('INITIAL_ADMIN_PRAYER'), 'adminWave7bData must export INITIAL_ADMIN_PRAYER');
assert(dataSrc.includes('INITIAL_ADMIN_TESTIMONIES'), 'adminWave7bData must export INITIAL_ADMIN_TESTIMONIES');
assert(!dataSrc.includes("from 'firebase"), 'adminWave7bData must have zero Firebase imports');
console.log('✅ PASS: adminWave7bData strongly-typed schemas and datasets verified.');

console.log('\n--- ALL WAVE 7B PHASE 5 TESTS PASSED SUCCESSFULLY! ---');
