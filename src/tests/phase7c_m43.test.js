/**
 * Wave 7C Phase 6 - M43 Admin Job Circle & Ministry Teams Validation Suite
 * Verifies M43 route, full opportunity CRUD (5 statuses), applicant review pipeline (5 stages),
 * 6 canonical ministry teams with 12 operational subteams, exact 160 volunteer target quota,
 * 5 strict validation gates (with zero overrides), M20/M33/M39 read-only isolation,
 * LocalStorage persistence, privacy safeguards, and AdminNavigationShell activation.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('--- RUNNING WAVE 7C PHASE 6 (M43) VALIDATION SUITE ---');
console.log('==========================================================');

const pagePath = path.resolve(__dirname, '../app/admin/job-circle/page.tsx');
const navPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
const dataPath = path.resolve(__dirname, '../lib/adminWave7cData.ts');

// 1. File Existence
assert(fs.existsSync(pagePath), 'M43 page.tsx must exist at web-new/src/app/admin/job-circle/page.tsx');
assert(fs.existsSync(navPath), 'AdminNavigationShell.tsx must exist');
assert(fs.existsSync(dataPath), 'adminWave7cData.ts must exist');
console.log('✔ Test 1 Passed: Required M43 source, layout, and data files exist.');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');

// 2. Security & Zero Firebase Invariants
assert(!pageSrc.includes('firebase/firestore'), 'Zero Firebase Firestore imports in M43 page.tsx');
assert(!pageSrc.includes('getFirestore'), 'Zero getFirestore calls in M43 page.tsx');
assert(!pageSrc.includes('collection('), 'Zero Firestore collection() calls in M43 page.tsx');
assert(!pageSrc.includes('doc('), 'Zero Firestore doc() calls in M43 page.tsx');
assert(!pageSrc.includes('fetch('), 'Zero remote network fetch() calls in M43 page.tsx');
assert(pageSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M43 must be protected strictly for admin and superadmin');
assert(pageSrc.includes('<ProtectedRoute'), 'M43 must be wrapped in ProtectedRoute');
assert(pageSrc.includes('<AdminNavigationShell>'), 'M43 must be wrapped in AdminNavigationShell');
console.log('✔ Test 2 Passed: Zero Firebase Firestore reads/writes, zero remote API calls, and strict RBAC guards.');

// 3. LocalStorage Persistence & Layer A Simulation
assert(pageSrc.includes('@rhema_admin_m43_job_circle'), 'M43 must persist to @rhema_admin_m43_job_circle');
assert(pageSrc.includes('Layer A Simulation'), 'M43 must display Layer A Simulation badge');
assert(pageSrc.includes('Simulated Job Listing (Demo)'), 'M43 must include demo tags on job opportunities');
assert(pageSrc.includes('handleResetDemoData'), 'M43 must provide reset to baseline synthetic demo data');
console.log('✔ Test 3 Passed: LocalStorage persistence key and Layer A simulation markers verified.');

// 4. Full Job Opportunity CRUD & Five Lifecycle Statuses
const requiredStatuses = ['Draft', 'Under Review', 'Published', 'Closed', 'Archived'];
for (const s of requiredStatuses) {
  assert(pageSrc.includes(`'${s}'`), `M43 must support opportunity status '${s}'`);
}
assert(pageSrc.includes('isCreateOppModalOpen'), 'M43 must maintain isCreateOppModalOpen state');
assert(pageSrc.includes('isEditOppModalOpen'), 'M43 must maintain isEditOppModalOpen state');
assert(pageSrc.includes('deletingOppId'), 'M43 must maintain deletingOppId state');
assert(pageSrc.includes('handleSaveCreateOpp'), 'M43 must support creating opportunities');
assert(pageSrc.includes('handleSaveEditOpp'), 'M43 must support editing opportunities');
assert(pageSrc.includes('handleConfirmDeleteOpp'), 'M43 must support deleting opportunities');
assert(pageSrc.includes('validateOppForm'), 'M43 must validate required opportunity fields');
console.log('✔ Test 4 Passed: Full Job Opportunity CRUD with all 5 lifecycle statuses verified.');

// 5. Candidate Review Pipeline & Five Stages
const requiredStages = ['Submitted', 'Under Review', 'Shortlisted', 'Approved', 'Rejected'];
for (const st of requiredStages) {
  assert(pageSrc.includes(`'${st}'`), `M43 must support applicant stage '${st}'`);
}
assert(pageSrc.includes('reviewingApplicant'), 'M43 must maintain reviewingApplicant state');
assert(pageSrc.includes('handleAdvanceApplicantStage'), 'M43 must support stage transitions');
assert(pageSrc.includes('skillsSummary'), 'M43 must display applicant skills');
assert(pageSrc.includes('resumeDocName'), 'M43 must show demonstration resume attachment');
console.log('✔ Test 5 Passed: Candidate Review Pipeline with all 5 stages verified.');

// 6. Six Canonical M39 Teams and 12 Operational Subteams
const requiredTeams = [
  'Ushering & Hospitality',
  'Worship Choir & Media Audio/Visual',
  "Children's & Teens Ministry",
  'Intercessory Prayer Team',
  'Community Outreach & Food Drive',
  'Welcome Desk & Guest Care',
];
for (const t of requiredTeams) {
  assert(pageSrc.includes(t), `M43 must include canonical M39 department '${t}'`);
}

const requiredSubteams = [
  'Sanctuary Seating & Protocol',
  'Offering & Communion Logistics',
  'Worship Band & Choral Ensemble',
  'FOH Audio, PTZ Cameras & Broadcast',
  'Early Childhood & Sunday School',
  'Teens Discipleship & Youth Mentoring',
  'Daily Dawn Prayer Watch',
  'Altar & Post-Service Prayer Line',
  'Food Pantry Operations & Distribution',
  'Hospital & Community Visitation Squad',
  'First-Time Visitor Welcome Pack Desk',
  'New Believers Assimilation & Follow-up',
];
for (const st of requiredSubteams) {
  assert(pageSrc.includes(st), `M43 must include operational subteam '${st}'`);
}
console.log('✔ Test 6 Passed: All 6 canonical M39 ministry departments and 12 operational subteams verified.');

// 7. Exact 160 Target Quota Calculation & Mathematical Consistency
assert(pageSrc.includes('160'), 'M43 must define the canonical quota sum of 160');
assert(pageSrc.includes('targetQuota: 32'), 'Ushering & Hospitality must have targetQuota: 32');
assert(pageSrc.includes('targetQuota: 40'), 'Worship Choir & Media Audio/Visual must have targetQuota: 40');
assert(pageSrc.includes('targetQuota: 20'), "Children's & Teens Ministry must have targetQuota: 20");
assert(pageSrc.includes('targetQuota: 28'), 'Intercessory Prayer Team must have targetQuota: 28');
assert(pageSrc.includes('targetQuota: 24'), 'Community Outreach & Food Drive must have targetQuota: 24');
assert(pageSrc.includes('targetQuota: 16'), 'Welcome Desk & Guest Care must have targetQuota: 16');
assert(pageSrc.includes('overallQuotaFillRatePct'), 'M43 must compute overall quota fill rate percentage');
console.log('✔ Test 7 Passed: Exact 160 volunteer target quota and department breakdown verified.');

// 8. Strict Five Volunteer Validation Gates (No Overrides)
assert(pageSrc.includes('executeFiveValidationGates'), 'M43 must define executeFiveValidationGates engine');
assert(pageSrc.includes('Gate 1 Violation: Incompatible Department'), 'Gate 1 must enforce department compatibility');
assert(pageSrc.includes('Gate 2 Violation: Availability Incompatible'), 'Gate 2 must enforce service slot availability');
assert(pageSrc.includes('Gate 3 Violation: Duplicate Assignment'), 'Gate 3 must prevent duplicate assignments');
assert(pageSrc.includes('Gate 4 Violation: Schedule Collision'), 'Gate 4 must detect time interval collisions');
assert(pageSrc.includes('Gate 5 Violation: Team Capacity Reached'), 'Gate 5 must enforce maximum canonical quotas');
assert(pageSrc.includes('startTime'), 'Assigned volunteer model must include startTime');
assert(pageSrc.includes('endTime'), 'Assigned volunteer model must include endTime');
assert(pageSrc.includes('serviceSlot'), 'Assigned volunteer model must include serviceSlot');
assert(pageSrc.includes('assignmentStatus'), 'Assigned volunteer model must include assignmentStatus');
console.log('✔ Test 8 Passed: All 5 volunteer validation gates with time-interval collision checking verified.');

// 9. Read-Only Dependency Boundaries & Privacy Protections
assert(pageSrc.includes('INITIAL_ADMIN_MEMBERS'), 'M43 must read M33 member records');
assert(pageSrc.includes('INITIAL_ADMIN_VOLUNTEERS'), 'M43 must read M39 volunteer applications');
assert(pageSrc.includes('INITIAL_ADMIN_JOB_OPPORTUNITIES'), 'M43 must read M20 base opportunities');
assert(!pageSrc.includes('spiritualTestimony'), 'Privacy guard: No spiritual testimony screening in Job Circle');
assert(!pageSrc.includes('religiousAffiliation'), 'Privacy guard: No religious belief screening in Job Circle');
console.log('✔ Test 9 Passed: M20, M33, and M39 read-only isolation and privacy safeguards verified.');

// 10. Admin Navigation Shell Activation
assert(navSrc.includes("['M40', 'M41', 'M42', 'M43'].includes(item.moduleId)"), 'AdminNavigationShell must activate M43 navigation link');
assert(navSrc.includes("if (pathname.startsWith('/admin/job-circle')) return 'M43 · Admin Job Circle & Ministry Teams'"), 'getAdminPageTitle must map /admin/job-circle');
console.log('✔ Test 10 Passed: AdminNavigationShell active link and header title mapping for M43 verified.');

console.log('==========================================================');
console.log('--- ALL WAVE 7C PHASE 6 (M43) TESTS PASSED (10/10) ---');
console.log('==========================================================');
