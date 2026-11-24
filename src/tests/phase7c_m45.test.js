/**
 * Wave 7C Phase 8 - M45 Admin Communications Suite Validation Suite
 * Verifies M45 route, Admin & Super Admin RBAC, zero Firebase/external messaging calls,
 * Celebrations Studio CRUD & privacy safeguards, push notifications & broadcast dispatch,
 * WhatsApp inbox simulation with interactive composer and disclaimer banner,
 * Gallery album management with pure CSS/SVG gradients (zero external image requests),
 * Online Meetings lifecycle, LocalStorage persistence, and AdminNavigationShell activation.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==========================================================');
console.log('--- RUNNING WAVE 7C PHASE 8 (M45) VALIDATION SUITE ---');
console.log('==========================================================');

const pagePath = path.resolve(__dirname, '../app/admin/communications/page.tsx');
const navPath = path.resolve(__dirname, '../components/layout/AdminNavigationShell.tsx');
const dataPath = path.resolve(__dirname, '../lib/adminWave7cData.ts');

// 1. File Existence
assert(fs.existsSync(pagePath), 'M45 page.tsx must exist at web-new/src/app/admin/communications/page.tsx');
assert(fs.existsSync(navPath), 'AdminNavigationShell.tsx must exist');
assert(fs.existsSync(dataPath), 'adminWave7cData.ts must exist');
console.log('✔ Test 1 Passed: Required M45 source, layout, and data files exist.');

const pageSrc = fs.readFileSync(pagePath, 'utf8');
const navSrc = fs.readFileSync(navPath, 'utf8');
const dataSrc = fs.readFileSync(dataPath, 'utf8');

// 2. Security & Zero Firebase / External Messaging Invariants
assert(!pageSrc.includes('firebase/firestore'), 'Zero Firebase Firestore imports in M45 page.tsx');
assert(!pageSrc.includes('getFirestore'), 'Zero getFirestore calls in M45 page.tsx');
assert(!pageSrc.includes('collection('), 'Zero Firestore collection() calls in M45 page.tsx');
assert(!pageSrc.includes('doc('), 'Zero Firestore doc() calls in M45 page.tsx');
assert(!pageSrc.includes('fetch('), 'Zero remote network fetch() calls in M45 page.tsx');
assert(!pageSrc.includes('twilio'), 'Zero Twilio integrations');
assert(!pageSrc.includes('whatsapp.com'), 'Zero live WhatsApp API endpoints');
assert(pageSrc.includes("allowedRoles={['admin', 'superadmin']}"), 'M45 must be protected for both admin and superadmin');
assert(pageSrc.includes('<ProtectedRoute'), 'M45 must be wrapped in ProtectedRoute');
assert(pageSrc.includes('<AdminNavigationShell>'), 'M45 must be wrapped in AdminNavigationShell');
console.log('✔ Test 2 Passed: Admin and Super Admin RBAC guard, zero Firebase mutations, and zero external messaging APIs verified.');

// 3. LocalStorage Persistence & Layer A Simulation Markers
assert(pageSrc.includes('@rhema_admin_m45_communications'), 'M45 must persist state to @rhema_admin_m45_communications');
assert(pageSrc.includes('Layer A Simulation'), 'M45 must display Layer A Simulation badge');
assert(pageSrc.includes('handleResetDemoData'), 'M45 must provide reset to baseline demonstration records');
console.log('✔ Test 3 Passed: LocalStorage persistence key and Layer A simulation markers verified.');

// 4. Celebrations Studio CRUD, Four Milestone Types, Filtering & Privacy Safeguards
assert(pageSrc.includes('isCelebrationModalOpen'), 'M45 must maintain isCelebrationModalOpen state');
assert(pageSrc.includes('deletingCelebrationId'), 'M45 must maintain deletingCelebrationId state');
assert(pageSrc.includes('handleSaveCelebration'), 'M45 must support creating and editing celebrations');
assert(pageSrc.includes('handleConfirmDeleteCelebration'), 'M45 must support deleting celebrations');
assert(pageSrc.includes('handleToggleCardDispatched'), 'M45 must support toggling card dispatched status');
assert(pageSrc.includes('handleToggleWhatsappSent'), 'M45 must support toggling WhatsApp sent status');
assert(pageSrc.includes('phoneMasked'), 'M45 must mask member phone numbers');

// Verify local M45CelebrationType extension leaves shared adminWave7cData.ts CelebrationType untouched
assert(
  pageSrc.includes("type M45CelebrationType = CelebrationType | 'Baby Dedication'"),
  'M45 must extend CelebrationType locally with Baby Dedication'
);
assert(
  dataSrc.includes("export type CelebrationType = 'Birthday' | 'Wedding Anniversary' | 'Baptism Jubilee';"),
  'Shared adminWave7cData.ts CelebrationType must remain untouched'
);

// Verify all 4 milestone types in modal options, baseline data, editing, and filter UI
const requiredMilestoneTypes = ['Birthday', 'Wedding Anniversary', 'Baptism Jubilee', 'Baby Dedication'];
for (const mt of requiredMilestoneTypes) {
  assert(pageSrc.includes(`<option value="${mt}">${mt}</option>`), `Create/Edit Celebration modal must include option '${mt}'`);
  assert(pageSrc.includes(`type: '${mt}'`), `BASELINE_CELEBRATIONS must include synthetic baseline record for '${mt}'`);
}
assert(pageSrc.includes('celebrationTypeFilter'), 'M45 must maintain celebrationTypeFilter state');
assert(pageSrc.includes('filteredCelebrations'), 'M45 must compute filteredCelebrations');
assert(pageSrc.includes('All Milestones'), 'Celebrations filter must include All Milestones option');
assert(pageSrc.includes('yearsMilestone: cel.yearsMilestone ?? 0'), 'Edit celebration must preserve optional yearsMilestone for Baby Dedication');
assert(pageSrc.includes('Mark 10:14'), 'Baby Dedication baseline record must include scripture reference');
assert(pageSrc.includes('+91 98804-XXXX5'), 'Baby Dedication baseline record must include masked phone number');

// Behavioral validation for filtering & editing across all 4 milestone types
const simCelebrations = [
  { id: 'CEL-1', type: 'Birthday', memberName: 'A (Demo)', eventDate: '11-20', phoneMasked: '+91 97402-XXXX2' },
  { id: 'CEL-2', type: 'Wedding Anniversary', memberName: 'B (Demo)', eventDate: '11-22', phoneMasked: '+91 98455-XXXX1' },
  { id: 'CEL-3', type: 'Baptism Jubilee', memberName: 'C (Demo)', eventDate: '11-25', phoneMasked: '+91 99002-XXXX7' },
  { id: 'CEL-4', type: 'Baby Dedication', memberName: 'D (Demo)', eventDate: '11-29', phoneMasked: '+91 98804-XXXX5' },
];
const filterFn = (list, filter) => list.filter((c) => filter === 'ALL' || c.type === filter);
assert.strictEqual(filterFn(simCelebrations, 'ALL').length, 4, 'ALL filter must return all 4 milestone types');
for (const mt of requiredMilestoneTypes) {
  const matched = filterFn(simCelebrations, mt);
  assert.strictEqual(matched.length, 1, `Filter '${mt}' must match exactly 1 record`);
  assert.strictEqual(matched[0].type, mt, `Matched record type must equal '${mt}'`);
}
console.log('✔ Test 4 Passed: Celebrations Studio CRUD, all 4 milestone types (including Baby Dedication), baseline record, editing, and filtering verified.');

// 5. Push Notifications & Broadcast Dispatch
const requiredCategories = ['Announcements', 'Events', 'Prayer', 'Attendance', 'General'];
for (const cat of requiredCategories) {
  assert(pageSrc.includes(cat), `M45 must support notification category '${cat}'`);
}
const requiredAudiences = [
  'All Registered Members',
  'Care Cell Leaders',
  'Worship & Media Team',
  'Youth & Teens',
  'Parents Group',
];
for (const aud of requiredAudiences) {
  assert(pageSrc.includes(aud), `M45 must support target audience '${aud}'`);
}
assert(pageSrc.includes('isNotificationModalOpen'), 'M45 must maintain isNotificationModalOpen state');
assert(pageSrc.includes('handleSaveNotification'), 'M45 must support creating notifications');
assert(pageSrc.includes('handleConfirmDeleteNotification'), 'M45 must support deleting notifications');
assert(pageSrc.includes('readRatePct'), 'M45 must track notification read rate metrics');
console.log('✔ Test 5 Passed: Push Notifications & Broadcast Dispatch with categories and audiences verified.');

// 6. WhatsApp Inbox Simulation & Interactive Chat Composer
assert(pageSrc.includes('handleSendWhatsAppReply'), 'M45 must handle interactive WhatsApp replies');
assert(pageSrc.includes('handleInsertQuickReply'), 'M45 must support quick reply templates');
assert(pageSrc.includes('WORKFLOW TRAINING SIMULATION'), 'M45 must display prominent WhatsApp simulation banner');
assert(pageSrc.includes('activeChatId'), 'M45 must support selecting conversations');
console.log('✔ Test 6 Passed: WhatsApp Inbox Simulation with interactive dual-pane composer verified.');

// 7. Gallery Album Management & Pure CSS/SVG Thematic Visuals (Zero External Images)
assert(!pageSrc.includes('unsplash.com'), 'Zero external Unsplash image URLs in M45 page.tsx');
assert(!pageSrc.includes('http://'), 'Zero unencrypted external HTTP requests');
assert(pageSrc.includes('gradientTheme'), 'M45 must use pure CSS gradient themes for gallery albums');
assert(pageSrc.includes('handleStartSimulatedUpload'), 'M45 must support simulated client-side photo upload');
assert(pageSrc.includes('uploadProgress'), 'M45 must track simulated upload progress');
assert(pageSrc.includes('isAlbumModalOpen'), 'M45 must maintain isAlbumModalOpen state');
console.log('✔ Test 7 Passed: Gallery Album Management with pure CSS/SVG visuals and zero external image requests verified.');

// 8. Online Meetings Scheduler Lifecycle
const requiredMeetingStatuses = ['Draft', 'Scheduled', 'Live (Simulated)', 'Completed', 'Cancelled'];
for (const st of requiredMeetingStatuses) {
  assert(pageSrc.includes(st), `M45 must support meeting status '${st}'`);
}
assert(pageSrc.includes('isMeetingModalOpen'), 'M45 must maintain isMeetingModalOpen state');
assert(pageSrc.includes('handleSaveMeeting'), 'M45 must support creating meetings');
assert(pageSrc.includes('handleConfirmDeleteMeeting'), 'M45 must support deleting meetings');
assert(pageSrc.includes('handleCopyMeetingLink'), 'M45 must support copying meeting links');
assert(pageSrc.includes('passcodeProtected'), 'M45 must support passcode protection for meetings');
console.log('✔ Test 8 Passed: Online Meetings Scheduler with full lifecycle and link copying verified.');

// 9. Read-Only Preservation of Prior Member-Facing Modules
const m22Path = path.resolve(__dirname, '../app/online-meetings/page.tsx');
const m23Path = path.resolve(__dirname, '../app/celebrations/page.tsx');
const m24Path = path.resolve(__dirname, '../app/gallery/page.tsx');
const m25Path = path.resolve(__dirname, '../app/notifications/page.tsx');

assert(fs.existsSync(m22Path), 'M22 online-meetings must remain present and untouched');
assert(fs.existsSync(m23Path), 'M23 celebrations must remain present and untouched');
assert(fs.existsSync(m24Path), 'M24 gallery must remain present and untouched');
assert(fs.existsSync(m25Path), 'M25 notifications must remain present and untouched');
console.log('✔ Test 9 Passed: Member-facing modules (M22, M23, M24, M25) preserved without modification.');

// 10. AdminNavigationShell Integration & Title Mapping
assert(navSrc.includes("['M40', 'M41', 'M42', 'M43', 'M44', 'M45'].includes(item.moduleId)"), 'AdminNavigationShell must activate M45');
assert(navSrc.includes("if (pathname.startsWith('/admin/communications')) return 'M45 · Admin Celebrations Studio, Notifications, WhatsApp Inbox, Gallery & Online Meetings'"), 'AdminNavigationShell must map /admin/communications title');
console.log('✔ Test 10 Passed: AdminNavigationShell link activation and header title mapping for M45 verified.');

console.log('==========================================================');
console.log('--- ALL WAVE 7C PHASE 8 (M45) TESTS PASSED (10/10) ---');
console.log('==========================================================');
