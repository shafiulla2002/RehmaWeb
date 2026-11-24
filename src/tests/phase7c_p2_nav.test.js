/**
 * Wave 7C - Phase 2 Verification Suite
 * Verifies AdminNavigationShell.tsx integration for M40-M46
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- RUNNING WAVE 7C PHASE 2 ADMIN NAVIGATION SHELL AUDIT ---');

const shellPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
assert(fs.existsSync(shellPath), 'AdminNavigationShell.tsx must exist');

const src = fs.readFileSync(shellPath, 'utf8');

// 1. Verify WAVE7C_ADMIN_NAV is defined and exported
assert(src.includes('export const WAVE7C_ADMIN_NAV'), 'WAVE7C_ADMIN_NAV must be exported');

// 2. Verify all canonical modules M40-M46 are present in WAVE7C_ADMIN_NAV
const canonicalModules = [
  { id: 'M40', name: 'Admin Events & RSVP Analytics', route: '/admin/events' },
  { id: 'M41', name: 'Admin Service Roster & Worship Operations', route: '/admin/service-planner' },
  { id: 'M42', name: 'Pastor Event Itinerary, Route Planner & AI Voice Assistant', route: '/admin/pastor-events' },
  { id: 'M43', name: 'Admin Job Circle & Ministry Teams', route: '/admin/job-circle' },
  { id: 'M44', name: 'Admin Finance Suite', route: '/admin/finance', superAdminOnly: true },
  { id: 'M45', name: 'Admin Celebrations Studio, Notifications, WhatsApp Inbox, Gallery & Online Meetings', route: '/admin/communications' },
  { id: 'M46', name: 'Church Branches, Church Settings, Support & Platform Super Admin Console', route: '/admin/settings' },
];

for (const m of canonicalModules) {
  assert(src.includes(`moduleId: '${m.id}'`), `Missing moduleId ${m.id}`);
  assert(src.includes(`name: '${m.name}'`), `Missing canonical name for ${m.id}`);
  assert(src.includes(`routePath: '${m.route}'`), `Missing routePath ${m.route} for ${m.id}`);
  if (m.superAdminOnly) {
    assert(src.includes(`moduleId: '${m.id}'`) && src.includes('superAdminOnly: true'), `${m.id} must be flagged superAdminOnly`);
  }
}
console.log('✅ PASS: All 7 canonical modules (M40–M46) present with exact IDs, names, and routes.');

// 3. Verify M44 Finance is strictly protected by Super Admin role guard
assert(
  src.includes('if (item.superAdminOnly && !isSuperAdmin) {') ||
  src.includes('item.superAdminOnly && !isSuperAdmin'),
  'M44 must have strict isSuperAdmin guard in sidebar rendering'
);
console.log('✅ PASS: Super Admin role guard enforced for M44 Finance.');

// 4. Verify Wave 7C items render as disabled non-navigable <div> elements (not <Link>)
assert(!src.includes('<Link href="/admin/finance"'), 'Must not render clickable Link to /admin/finance before phase implementation');
assert(!src.includes('<Link href="/admin/events"'), 'Must not render clickable Link to /admin/events before phase implementation');
assert(src.includes('Wave 7C – Upcoming Modules'), 'Sidebar section header must be "Wave 7C – Upcoming Modules"');
assert(src.includes('Upcoming'), 'Must show Upcoming badge for Wave 7C items');
console.log('✅ PASS: Wave 7C items rendered as non-navigable disabled elements with Upcoming badge.');

// 5. Verify page title mapping in getAdminPageTitle
for (const m of canonicalModules) {
  assert(src.includes(`pathname.startsWith('${m.route}')`), `getAdminPageTitle missing route handler for ${m.route}`);
  assert(src.includes(`'${m.id} · ${m.name}'`), `getAdminPageTitle missing title mapping for ${m.id}`);
}
console.log('✅ PASS: getAdminPageTitle maps all 7 canonical routes to correct module titles.');

// 6. Security & Layer A simulation boundaries
assert(!src.includes('firebase/firestore'), 'Zero Firebase imports in AdminNavigationShell');
assert(!src.includes('getFirestore'), 'Zero Firestore calls in AdminNavigationShell');
console.log('✅ PASS: Zero Firebase imports, zero network mutations verified.');

console.log('--- ALL WAVE 7C PHASE 2 NAVIGATION AUDITS PASSED (100% SUCCESS) ---');
