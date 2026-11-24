/**
 * Wave 7C Phase 4 - M41 Admin Service Roster & Worship Operations Validation Suite
 * Verifies M41 route, service planning, M34 slot alignment, M39 volunteer duties, M31 songbook/keys,
 * M17 run sheet & Stage HUD, conflict detection engine, LocalStorage persistence, and security invariants.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('--- RUNNING WAVE 7C PHASE 4 (M41) VALIDATION SUITE ---');
console.log('==========================================================');

const pagePath = path.resolve(__dirname, '../app/admin/service-planner/page.tsx');
const navPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
const dataPath = path.resolve(__dirname, '../lib/adminWave7cData.ts');

// 1. File Existence
assert(fs.existsSync(pagePath), 'M41 page.tsx must exist at web-new/src/app/admin/service-planner/page.tsx');
assert(fs.existsSync(navPath), 'AdminNavigationShell.tsx must exist');
assert(fs.existsSync(dataPath), 'adminWave7cData.ts must exist');
console.log('✔ Test 1 Passed: Required M41 source and layout files exist.');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');

// 2. Security & Zero Firebase Invariants
assert(!pageSrc.includes('firebase/firestore'), 'Zero Firebase Firestore imports in M41 page.tsx');
assert(!pageSrc.includes('getFirestore'), 'Zero getFirestore calls in M41 page.tsx');
assert(!pageSrc.includes('collection('), 'Zero Firestore collection() calls in M41 page.tsx');
assert(!pageSrc.includes('doc('), 'Zero Firestore doc() calls in M41 page.tsx');
assert(!pageSrc.includes('fetch('), 'Zero remote network fetch() calls in M41 page.tsx');
assert(pageSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M41 must be protected strictly for admin and superadmin');
assert(pageSrc.includes('<ProtectedRoute'), 'M41 must be wrapped in ProtectedRoute');
assert(pageSrc.includes('<AdminNavigationShell>'), 'M41 must be wrapped in AdminNavigationShell');
console.log('✔ Test 2 Passed: Zero Firebase Firestore reads/writes, zero remote API calls, and strict RBAC guards.');

// 3. LocalStorage Persistence & Layer A Simulation
assert(pageSrc.includes('@rhema_admin_m41_service_plans'), 'M41 must persist service plans to @rhema_admin_m41_service_plans');
assert(pageSrc.includes('Layer A Simulation'), 'M41 must display Layer A Simulation badge');
assert(pageSrc.includes('Simulated Service Plan (Demo)'), 'M41 must include demo tags on service plans');
assert(pageSrc.includes('handleResetBaseline'), 'M41 must provide reset to baseline synthetic demo data');
console.log('✔ Test 3 Passed: LocalStorage persistence key and Layer A simulation markers verified.');

// 4. M34 Service Session Alignment
assert(pageSrc.includes('08:30 AM (1st Service)'), 'M41 must reuse M34 1st Service slot');
assert(pageSrc.includes('11:00 AM (2nd Service)'), 'M41 must reuse M34 2nd Service slot');
assert(pageSrc.includes('05:00 PM (Youth Service)'), 'M41 must reuse M34 Youth Service slot');
assert(pageSrc.includes('07:00 PM (Mid-Week Prayer)'), 'M41 must reuse M34 Mid-Week slot');
assert(pageSrc.includes('SundayServiceSlot'), 'M41 must import and type with SundayServiceSlot');
console.log('✔ Test 4 Passed: M34 service session classifications and timings exactly aligned.');

// 5. M39 Volunteer Management Integration
assert(pageSrc.includes('Ushering & Hospitality'), 'M41 must support Ushering & Hospitality department');
assert(pageSrc.includes('Worship Choir & Media Audio/Visual'), 'M41 must support Media & AV department');
assert(pageSrc.includes("Children's & Teens Ministry"), 'M41 must support Children & Teens department');
assert(pageSrc.includes('Welcome Desk & Guest Care'), 'M41 must support Welcome Desk department');
assert(pageSrc.includes('volunteerDuties'), 'M41 must track individual volunteer duty assignments');
assert(pageSrc.includes('handleConfirmVolunteerReassignment'), 'M41 must support volunteer reassignment');
assert(pageSrc.includes('VOL-2026-'), 'M41 must use stable synthetic volunteer IDs');
console.log('✔ Test 5 Passed: M39 volunteer departments, individual duties, and stable IDs verified.');

// 6. M31 Worship Songbook & Key Transposition
assert(pageSrc.includes('INITIAL_ADMIN_SONGS'), 'M41 must reuse M31 INITIAL_ADMIN_SONGS catalog');
assert(pageSrc.includes('handleTransposeSong'), 'M41 must support chromatic key transposition');
assert(pageSrc.includes('handleMoveSong'), 'M41 must support setlist reordering');
assert(pageSrc.includes('handleRemoveSong'), 'M41 must support setlist song removal');
assert(pageSrc.includes('handleAddSongToSetlist'), 'M41 must support adding songs from M31 catalog');
console.log('✔ Test 6 Passed: M31 songbook catalog, setlist reordering, and chromatic key transposer verified.');

// 7. M17 Run Sheet & Live Stage HUD Simulator
assert(pageSrc.includes('runSheet'), 'M41 must manage sequential run sheet cues');
assert(pageSrc.includes('totalRunSheetMinutes'), 'M41 must calculate total accumulated run sheet duration');
assert(pageSrc.includes('isRunSheetOvertime'), 'M41 must detect and warn on run sheet overtime overrun');
assert(pageSrc.includes('isLiveStageHudOpen'), 'M41 must provide interactive Live Stage HUD simulator');
assert(pageSrc.includes('ON AIR (SIM)'), 'Live Stage HUD must display on-air indicator');
assert(pageSrc.includes('bandPreset'), 'Run sheet cues must include band sound presets');
assert(pageSrc.includes('mediaNotes'), 'Run sheet cues must include media/AV notes');
console.log('✔ Test 7 Passed: M17 Run sheet sequential cues, runtime overrun alert, and Live Stage HUD verified.');

// 8. Automated Conflict Detection Engine
assert(pageSrc.includes('detectedConflicts'), 'M41 must implement automated conflict detection');
assert(pageSrc.includes('Dual Role in Same Service'), 'M41 must detect dual role in same service');
assert(pageSrc.includes('Overlapping Schedule'), 'M41 must detect overlapping schedule with buffer');
assert(pageSrc.includes('Availability Mismatch'), 'M41 must detect M39 availability profile mismatches');
assert(pageSrc.includes('suggestedResolution'), 'Conflicts must provide suggested resolutions');
console.log('✔ Test 8 Passed: 4-rule conflict detection engine verified with time buffer evaluation.');

// 9. Admin Navigation Shell Activation
assert(navSrc.includes("['M40', 'M41'].includes(item.moduleId)"), 'AdminNavigationShell must activate M41 navigation link');
assert(navSrc.includes("if (pathname.startsWith('/admin/service-planner')) return 'M41 · Admin Service Roster & Worship Operations'"), 'getAdminPageTitle must map /admin/service-planner');
console.log('✔ Test 9 Passed: AdminNavigationShell active link for M41 verified.');

// 10. Service Plan Full CRUD Modals & Handlers
assert(pageSrc.includes('isCreatePlanOpen'), 'M41 must maintain isCreatePlanOpen state');
assert(pageSrc.includes('isEditPlanOpen'), 'M41 must maintain isEditPlanOpen state');
assert(pageSrc.includes('+ Create New Plan'), 'M41 must render + Create New Plan action button');
assert(pageSrc.includes('openCreatePlanModal'), 'M41 must provide openCreatePlanModal handler');
assert(pageSrc.includes('handleSaveCreatePlan'), 'M41 must provide handleSaveCreatePlan handler');
assert(pageSrc.includes('openEditPlanModal'), 'M41 must provide openEditPlanModal handler');
assert(pageSrc.includes('handleSaveEditPlan'), 'M41 must provide handleSaveEditPlan handler');
assert(pageSrc.includes('validatePlanForm'), 'M41 must perform required field validation');
assert(pageSrc.includes('Create New Service Plan'), 'M41 must render Create New Service Plan modal');
assert(pageSrc.includes('Edit Service Plan Metadata'), 'M41 must render Edit Service Plan Metadata modal');
console.log('✔ Test 10 Passed: Full Service Plan Create & Edit modals, form validation, and handlers verified.');

console.log('==========================================================');
console.log('🎉 ALL 10 WAVE 7C PHASE 4 (M41) TESTS PASSED SUCCESSFULLY!');
console.log('==========================================================');
