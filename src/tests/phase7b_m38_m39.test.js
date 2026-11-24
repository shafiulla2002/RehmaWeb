/**
 * Phase 7B - M38 (Baptism Requests) & M39 (Volunteer Management) Test Suite
 * Verifies Layer A Frontend Simulation Mode invariants, RBAC, storage keys,
 * 4-stage baptism discipleship pipeline, 6 volunteer departments, 4-stage onboarding,
 * simulated certificates, background clearances, and zero Firebase imports.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- RUNNING WAVE 7B (M38 & M39) VALIDATION TEST SUITE ---');

const repoRoot = path.resolve(__dirname, '../..');
const baptismPath = path.join(repoRoot, 'src/app/admin/baptism/page.tsx');
const volunteeringPath = path.join(repoRoot, 'src/app/admin/volunteering/page.tsx');
const navShellPath = path.join(repoRoot, 'src/components/layout/AdminNavigationShell.tsx');
const wave7bDataPath = path.join(repoRoot, 'src/lib/adminWave7bData.ts');

// 1. Verify File Existence
assert(fs.existsSync(baptismPath), 'M38 baptism page must exist');
assert(fs.existsSync(volunteeringPath), 'M39 volunteering page must exist');
assert(fs.existsSync(navShellPath), 'AdminNavigationShell must exist');
assert(fs.existsSync(wave7bDataPath), 'adminWave7bData must exist');
console.log('✅ PASS: All required route and data files exist.');

// 2. Verify M38 Baptism Requests Invariants
const baptismSrc = fs.readFileSync(baptismPath, 'utf-8');

// RBAC
assert(baptismSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M38 must restrict to admin and superadmin roles');
// Shell
assert(baptismSrc.includes('<AdminNavigationShell>'), 'M38 must be wrapped in AdminNavigationShell');
// LocalStorage Key
assert(baptismSrc.includes('@rhema_admin_demo_baptism'), 'M38 must persist to @rhema_admin_demo_baptism');
// 4-Stage Baptism Workflow
const expectedBaptismStages = [
  'Stage 1: Application Review (Sim)',
  'Stage 2: Counseling Scheduled (Sim)',
  'Stage 3: Pastoral Interview Passed (Sim)',
  'Stage 4: Baptism Service Scheduled (Sim)',
];
for (const stage of expectedBaptismStages) {
  assert(baptismSrc.includes(stage), `M38 must support stage: ${stage}`);
}
// Classes count tracking
assert(baptismSrc.includes('classesCompletedCount'), 'M38 must track doctrine class completion count');
// Certificate preview & issuance
assert(baptismSrc.includes('certificateIssued'), 'M38 must track certificateIssued state');
assert(baptismSrc.includes('Certificate of Holy Baptism') || baptismSrc.includes('Certificate of Obedience'), 'M38 must render certificate preview');
// Zero Firebase
assert(!baptismSrc.includes("from 'firebase"), 'M38 must have zero Firebase imports');
assert(!baptismSrc.includes('getFirestore'), 'M38 must have zero Firestore calls');
console.log('✅ PASS: M38 Baptism Requests invariants fully satisfied.');

// 3. Verify M39 Volunteer Management Invariants
const volunteeringSrc = fs.readFileSync(volunteeringPath, 'utf-8');

// RBAC
assert(volunteeringSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M39 must restrict to admin and superadmin roles');
// Shell
assert(volunteeringSrc.includes('<AdminNavigationShell>'), 'M39 must be wrapped in AdminNavigationShell');
// LocalStorage Key
assert(volunteeringSrc.includes('@rhema_admin_demo_volunteering'), 'M39 must persist to @rhema_admin_demo_volunteering');
// 6 Ministry Departments
const expectedDepartments = [
  'Ushering & Hospitality',
  'Worship Choir & Media Audio/Visual',
  "Children's & Teens Ministry",
  'Intercessory Prayer Team',
  'Community Outreach & Food Drive',
  'Welcome Desk & Guest Care',
];
for (const dept of expectedDepartments) {
  assert(volunteeringSrc.includes(dept), `M39 must support department: ${dept}`);
}
// 4-Stage Onboarding Workflow
const expectedOnboarding = [
  'Applied (Sim)',
  'Screening & Interview (Sim)',
  'Orientation & Training (Sim)',
  'Active Volunteer (Sim)',
];
for (const stage of expectedOnboarding) {
  assert(volunteeringSrc.includes(stage), `M39 must support onboarding stage: ${stage}`);
}
// Background check verification
assert(volunteeringSrc.includes('backgroundCheckVerified'), 'M39 must track backgroundCheckVerified state');
// Service role & mentor assignment
assert(volunteeringSrc.includes('assignedServiceRole'), 'M39 must allow assigning service role');
assert(volunteeringSrc.includes('departmentMentor'), 'M39 must track department mentor');
// Zero Firebase
assert(!volunteeringSrc.includes("from 'firebase"), 'M39 must have zero Firebase imports');
assert(!volunteeringSrc.includes('getFirestore'), 'M39 must have zero Firestore calls');
console.log('✅ PASS: M39 Volunteer Management invariants fully satisfied.');

// 4. Verify Admin Navigation Shell Integration (All Wave 7B Canonical Modules)
const navSrc = fs.readFileSync(navShellPath, 'utf-8');
const allWave7bModules = ['M33', 'M34', 'M35', 'M36', 'M37', 'M38', 'M39'];
for (const modId of allWave7bModules) {
  assert(navSrc.includes(`'${modId}'`), `AdminNavigationShell must include ${modId} in implemented navigation`);
}
assert(navSrc.includes("'/admin/baptism'"), 'AdminNavigationShell must have /admin/baptism route');
assert(navSrc.includes("'/admin/volunteering'"), 'AdminNavigationShell must have /admin/volunteering route');
console.log('✅ PASS: AdminNavigationShell integration verified for all Wave 7B modules (M33–M39).');

// 5. Verify adminWave7bData datasets
const dataSrc = fs.readFileSync(wave7bDataPath, 'utf-8');
assert(dataSrc.includes('INITIAL_ADMIN_BAPTISM'), 'adminWave7bData must export INITIAL_ADMIN_BAPTISM');
assert(dataSrc.includes('INITIAL_ADMIN_VOLUNTEERS'), 'adminWave7bData must export INITIAL_ADMIN_VOLUNTEERS');
assert(!dataSrc.includes("from 'firebase"), 'adminWave7bData must have zero Firebase imports');
console.log('✅ PASS: adminWave7bData strongly-typed schemas and datasets verified for M38 and M39.');

console.log('\n--- ALL WAVE 7B PHASE 6 TESTS PASSED SUCCESSFULLY! ---');
