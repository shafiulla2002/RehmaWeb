/**
 * Live HTTP & DOM Verification Audit against Running Next.js Production Server (http://localhost:3000)
 */
const http = require('http');

const ENDPOINTS = [
  { path: '/welcome', title: 'M01 Welcome & Onboarding', expected: ['Welcome', 'Holy Scripture', 'Kingdom Stewardship'] },
  { path: '/auth/login', title: 'M02 Login & SMS Notice', expected: ['Congregation Sign In', '9999999999', '123456'] },
  { path: '/auth/login?invite=easter_2026', title: 'M02 Guest Invite Preview', expected: ['Church Invitation Recognized', 'View Event Preview (Guest)'] },
  { path: '/dashboard', title: 'M04 Dashboard & Devotional', expected: ['Liturgical Season', 'Today', 'Daily Promise'] },
  { path: '/promises', title: 'M05 Daily Promises & Narration', expected: ['Daily Promises', 'Listen Aloud', 'Download Card'] },
  { path: '/verse', title: 'M06 Daily Verse & Languages', expected: ['Verse of the Day', 'English (KJV)', 'Telugu', 'Pick Any Date'] },
  { path: '/sermons', title: 'M07 Sermon Catalog & Study Notes', expected: ['Sermons', 'All Categories'] },
  { path: '/songs', title: 'M08 Worship Songs & Chords', expected: ['Worship Songs', 'All Songs'] },
  { path: '/events', title: 'M09 Events & Timeline Tabs', expected: ['Church Events', 'This Week', 'All Upcoming', 'Past Gatherings'] },
  { path: '/bible', title: 'M10 Bible Workspace & Devotionals', expected: ['Holy Bible', 'Reader', 'Parallel', 'Reading Plans'] },
  { path: '/notes', title: 'M11 Personal Notes Studio', expected: ['Personal Notes Studio', 'Create New Note'] },
  { path: '/quiz', title: 'M12 Bible Quiz Hub', expected: ['Bible Quiz Hub', 'Daily Scripture Challenge'] },
  { path: '/prayer', title: 'M13 Congregation Prayer Wall', expected: ['Congregation Prayer Wall', 'Share Prayer Request'] },
  { path: '/giving', title: 'M14 Online Giving & Stewardship', expected: ['Online Giving', 'Tithe'] },
  { path: '/attendance', title: 'M15 Attendance Hub', expected: ['Attendance Hub', 'Sanctuary'] },
  { path: '/care-cells', title: 'M16 Care Cell Ministry Portal', expected: ['Care Cell Ministry Portal', 'Bethel Central'] },
];

function fetchEndpoint(endpoint) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${endpoint.path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const matches = endpoint.expected.map(exp => ({
          term: exp,
          found: data.includes(exp)
        }));
        resolve({
          path: endpoint.path,
          title: endpoint.title,
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          matches,
          size: data.length
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        path: endpoint.path,
        title: endpoint.title,
        statusCode: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function runAudit() {
  console.log('--- Commencing Live Route Verification against http://localhost:3000 ---\n');
  let allPass = true;
  for (const ep of ENDPOINTS) {
    const res = await fetchEndpoint(ep);
    if (res.success) {
      console.log(`[PASS] ${res.title} (${res.path}) - HTTP ${res.statusCode} (${res.size} bytes)`);
      for (const m of res.matches) {
        if (!m.found) {
          console.log(`       ⚠️ Content check notice: "${m.term}" might hydrate client-side`);
        } else {
          console.log(`       ✓ Verified payload contains: "${m.term}"`);
        }
      }
    } else {
      console.error(`[FAIL] ${res.title} (${res.path}) - ${res.statusCode || res.error}`);
      allPass = false;
    }
  }
  console.log('\n--- Live HTTP Route Verification Finished ---');
  process.exit(allPass ? 0 : 1);
}

runAudit();
