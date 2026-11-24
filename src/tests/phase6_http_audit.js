/**
 * Phase 6 HTTP Live Route Verification Audit
 */

const http = require('http');
const assert = require('assert');

const ROUTES = [
  { path: '/service-duties', label: 'M17 Service Duties Roster' },
  { path: '/service-duties/live-hud', label: 'M17 LiveStageHUD' },
  { path: '/testimonies', label: 'M18 Testimonies Feed' },
  { path: '/volunteering', label: 'M19 Church Volunteering' },
  { path: '/jobs', label: 'M20 Job Circle' },
  { path: '/baptism', label: 'M21 Baptism Portal' },
  { path: '/online-meetings', label: 'M22 Online Meetings & YouTube Live' },
  { path: '/celebrations', label: 'M23 Celebrations & Benedictions Wall' },
  { path: '/gallery', label: 'M24 Member Photo Gallery' },
  { path: '/gallery/easter-revival-2026', label: 'M24 Album Detail Lightbox' },
  { path: '/notifications', label: 'M25 Notifications Center' },
  { path: '/profile', label: 'M26 Member Profile & Household' },
];

function fetchRoute(routePath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${routePath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    }).on('error', (err) => reject(err));
  });
}

async function runAudit() {
  console.log('--- Phase 6 HTTP Live Route Audit Starting ---\n');
  let passed = 0;

  for (const r of ROUTES) {
    try {
      const res = await fetchRoute(r.path);
      assert.strictEqual(res.statusCode, 200, `Expected HTTP 200 for ${r.path}, got ${res.statusCode}`);
      assert(res.body.length > 500, `Expected non-empty HTML for ${r.path}`);
      console.log(`✔ [HTTP 200] ${r.path.padEnd(30)} — ${r.label} (${res.body.length} bytes)`);
      passed++;
    } catch (err) {
      console.error(`✖ [FAILED] ${r.path}:`, err.message);
    }
  }

  console.log(`\nAudit Complete: ${passed} / ${ROUTES.length} routes verified with HTTP 200 OK.`);
}

runAudit();
