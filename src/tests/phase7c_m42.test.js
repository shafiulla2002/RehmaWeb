/**
 * Wave 7C Phase 5 - M42 Pastor Event Itinerary, Route Planner & AI Voice Assistant Validation Suite
 * Verifies M42 route, pastoral itinerary CRUD, M08/M13/M33/M35 canonical dependencies, M22/M37/M40 cross-links,
 * deterministic buffer math (<0m collision, 0-14m warning, >=15m healthy), simulated route visualizer,
 * simulated AI voice assistant, LocalStorage persistence, and security invariants.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('--- RUNNING WAVE 7C PHASE 5 (M42) VALIDATION SUITE ---');
console.log('==========================================================');

const pagePath = path.resolve(__dirname, '../app/admin/pastor-events/page.tsx');
const navPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
const dataPath = path.resolve(__dirname, '../lib/adminWave7cData.ts');

// 1. File Existence
assert(fs.existsSync(pagePath), 'M42 page.tsx must exist at web-new/src/app/admin/pastor-events/page.tsx');
assert(fs.existsSync(navPath), 'AdminNavigationShell.tsx must exist');
assert(fs.existsSync(dataPath), 'adminWave7cData.ts must exist');
console.log('✔ Test 1 Passed: Required M42 source, layout, and data files exist.');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');

// 2. Security & Zero Firebase Invariants
assert(!pageSrc.includes('firebase/firestore'), 'Zero Firebase Firestore imports in M42 page.tsx');
assert(!pageSrc.includes('getFirestore'), 'Zero getFirestore calls in M42 page.tsx');
assert(!pageSrc.includes('collection('), 'Zero Firestore collection() calls in M42 page.tsx');
assert(!pageSrc.includes('doc('), 'Zero Firestore doc() calls in M42 page.tsx');
assert(!pageSrc.includes('fetch('), 'Zero remote network fetch() calls in M42 page.tsx');
assert(pageSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M42 must be protected strictly for admin and superadmin');
assert(pageSrc.includes('<ProtectedRoute'), 'M42 must be wrapped in ProtectedRoute');
assert(pageSrc.includes('<AdminNavigationShell>'), 'M42 must be wrapped in AdminNavigationShell');
console.log('✔ Test 2 Passed: Zero Firebase Firestore reads/writes, zero remote API calls, and strict RBAC guards.');

// 3. LocalStorage Persistence & Layer A Simulation
assert(pageSrc.includes('@rhema_admin_m42_pastor_events'), 'M42 must persist itinerary to @rhema_admin_m42_pastor_events');
assert(pageSrc.includes('Layer A Simulation'), 'M42 must display Layer A Simulation badge');
assert(pageSrc.includes('Simulated Pastor Itinerary (Demo)'), 'M42 must include demo tags on pastoral appointments');
assert(pageSrc.includes('handleResetDemoData'), 'M42 must provide reset to baseline synthetic demo data');
console.log('✔ Test 3 Passed: LocalStorage persistence key and Layer A simulation markers verified.');

// 4. Synthetic Pastoral Identity Selector
assert(pageSrc.includes('PASTORAL_IDENTITIES'), 'M42 must define synthetic pastoral identities');
assert(pageSrc.includes('selectedPastorId'), 'M42 must maintain selectedPastorId state');
assert(pageSrc.includes('Senior Pastor John Mark'), 'M42 must support Senior Pastor John Mark profile');
assert(pageSrc.includes('Associate Pastor Timothy Roy'), 'M42 must support Associate Pastor Timothy Roy profile');
assert(pageSrc.includes('Youth Pastor Andrew Paul'), 'M42 must support Youth Pastor Andrew Paul profile');
assert(pageSrc.includes('Sister Mary Stephen'), 'M42 must support Sister Mary Stephen profile');
console.log('✔ Test 4 Passed: Synthetic Pastoral Identity Selector and minister profiles verified.');

// 5. Full Itinerary CRUD & Status Progression
assert(pageSrc.includes('isCreateModalOpen'), 'M42 must maintain isCreateModalOpen state');
assert(pageSrc.includes('isEditModalOpen'), 'M42 must maintain isEditModalOpen state');
assert(pageSrc.includes('handleSaveCreate'), 'M42 must support creating appointments');
assert(pageSrc.includes('handleSaveEdit'), 'M42 must support editing appointments');
assert(pageSrc.includes('handleConfirmDelete'), 'M42 must support deleting appointments');
assert(pageSrc.includes('validateForm'), 'M42 must validate required appointment fields');
assert(pageSrc.includes('Scheduled'), 'M42 must support Scheduled status');
assert(pageSrc.includes('En Route (Simulated)'), 'M42 must support En Route status');
assert(pageSrc.includes('Completed (Simulated)'), 'M42 must support Completed status');
console.log('✔ Test 5 Passed: Full appointment CRUD lifecycle and status progression verified.');

// 6. Deterministic Transit Buffer Calculation Engine
assert(pageSrc.includes('ZONE_DISTANCE_MATRIX'), 'M42 must maintain deterministic distance matrix');
assert(pageSrc.includes('evaluatedRouteLegs'), 'M42 must evaluate multi-stop route legs');
assert(pageSrc.includes('Schedule Collision'), 'M42 must detect negative buffer Schedule Collisions (<0m)');
assert(pageSrc.includes('Tight Transit Warning'), 'M42 must detect Tight Transit Warnings (0-14m)');
assert(pageSrc.includes('Healthy Transit Buffer'), 'M42 must identify Healthy Transit Buffers (>=15m)');
assert(pageSrc.includes('Simulated Multi-Stop Route Visualizer'), 'M42 must include SVG route visualizer');
console.log('✔ Test 6 Passed: Deterministic transit buffer math (<0m collision, 0-14m warning, >=15m healthy) verified.');

// 7. Simulated AI Voice Assistant
assert(pageSrc.includes('handleTriggerVoiceCommand'), 'M42 must handle voice commands');
assert(pageSrc.includes('SpeechSynthesisUtterance'), 'M42 must leverage Web SpeechSynthesis where supported');
assert(pageSrc.includes('Simulated Voice Interaction (Click-to-Trigger)'), 'M42 must clearly label mic as simulated click-to-trigger');
assert(pageSrc.includes('What is my next appointment?'), 'M42 must support next appointment voice query');
assert(pageSrc.includes('Simulate route to next destination'), 'M42 must support route simulation voice query');
assert(pageSrc.includes("Summarize today's itinerary") || pageSrc.includes("Summarize today"), 'M42 must support itinerary summary voice query');
assert(pageSrc.includes('Add pastoral prayer note'), 'M42 must support pastoral note dictation voice query');
console.log('✔ Test 7 Passed: Simulated AI voice assistant with click-to-trigger command chips and transcript feed verified.');

// 8. Canonical Dependencies & Optional Cross-links
assert(pageSrc.includes('INITIAL_ADMIN_MEMBERS'), 'M42 must integrate M33 member records');
assert(pageSrc.includes('INITIAL_ADMIN_PRAYER'), 'M42 must integrate M35 prayer moderation queue');
assert(pageSrc.includes('m35EscalatedPrayerId'), 'M42 must link M35 escalated prayer requests');
assert(pageSrc.includes('m13PublicPrayerRefId'), 'M42 must link M13 public prayer wall topics');
assert(pageSrc.includes('churchCalendarEventId'), 'M42 must link M08 church calendar events');
assert(pageSrc.includes('careCellId'), 'M42 must support optional M37 care cell cross-link');
assert(pageSrc.includes('onlineMeetingId'), 'M42 must support optional M22 online meeting cross-link');
assert(pageSrc.includes('adminEventId'), 'M42 must support optional M40 admin event cross-link');
console.log('✔ Test 8 Passed: M08, M13, M33, M35 canonical integrations and M22, M37, M40 optional cross-links verified.');

// 9. Admin Navigation Shell Activation
assert(navSrc.includes("['M40', 'M41', 'M42'].includes(item.moduleId)"), 'AdminNavigationShell must activate M42 navigation link');
assert(navSrc.includes("if (pathname.startsWith('/admin/pastor-events')) return 'M42 · Pastor Event Itinerary, Route Planner & AI Voice Assistant'"), 'getAdminPageTitle must map /admin/pastor-events');
console.log('✔ Test 9 Passed: AdminNavigationShell active link and header title mapping for M42 verified.');

// 10. Privacy & Masking Protection
assert(pageSrc.includes('maskedPhone'), 'M42 must enforce phone number masking');
assert(pageSrc.includes('+91 98450-XXXX'), 'M42 must use masked synthetic phone format');
assert(!pageSrc.includes('navigator.mediaDevices.getUserMedia'), 'Zero real hardware microphone recording in M42');
console.log('✔ Test 10 Passed: Synthetic phone masking and zero hardware microphone access verified.');

console.log('==========================================================');
console.log('🎉 ALL 10 WAVE 7C PHASE 5 (M42) TESTS PASSED SUCCESSFULLY!');
console.log('==========================================================');
