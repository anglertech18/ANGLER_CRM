import { readFileSync, writeFileSync } from 'fs';

const file = 'client/src/pages/renewals/RenewalFollowUps.tsx';
let c = readFileSync(file, 'utf8');

// ── 1. Add Internal Notes field in the CALL outcome form ─────────────────────
// Insert between "Customer Feedback" </div>\r\n\r\n and "Next Call Back Date" <div>
const callOld = [
  '                        </div>\r\n',
  '\r\n',
  '                        <div>\r\n',
  '                          <label className="block text-xs font-bold text-slate-700 mb-1">Next Call Back Date</label>\r\n',
].join('');

const callNew = [
  '                        </div>\r\n',
  '\r\n',
  '                        <div>\r\n',
  '                          <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes / Action Taken</label>\r\n',
  '                          <input\r\n',
  '                            type="text"\r\n',
  '                            value={notes}\r\n',
  '                            onChange={e => setNotes(e.target.value)}\r\n',
  '                            placeholder="e.g. Spoke with client, shared quotation, left voicemail"\r\n',
  '                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-slate-50 focus:bg-white"\r\n',
  '                          />\r\n',
  '                        </div>\r\n',
  '\r\n',
  '                        <div>\r\n',
  '                          <label className="block text-xs font-bold text-slate-700 mb-1">Next Call Back Date</label>\r\n',
].join('');

if (c.includes(callOld)) {
  c = c.replace(callOld, callNew);
  console.log('✅ Call form Internal Notes field inserted');
} else {
  console.error('❌ Call form target NOT found');
  // Find a shorter anchor to debug
  const anchor = 'Next Call Back Date</label>';
  const idx = c.indexOf(anchor);
  console.log('Anchor index:', idx);
  if (idx !== -1) {
    console.log('Context:', JSON.stringify(c.slice(idx - 200, idx + 100)));
  }
}

writeFileSync(file, c, 'utf8');
console.log('File saved');
