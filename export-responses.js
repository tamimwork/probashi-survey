// Firestore survey_responses -> responses.csv + responses.json
// Setup (একবার):
//   1. npm install firebase-admin
//   2. Firebase Console > Project settings > Service accounts > "Generate new private key"
//      ফাইলটির নাম দিন serviceAccountKey.json এবং এই ফোল্ডারে রাখুন (কাউকে দেবেন না)
//   3. node export-responses.js

const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });
const db = admin.firestore();

const COLUMNS = [
  'id','createdAt','name','whatsapp','email','countryBn','countryEn','countryCode','yearsAbroad','job',
  'methods','service','timesPerMonth','timesPerMonthNum','currency','currencyName','avgAmount','monthlyVolume',
  'feePerTransfer','feePercent','transferTime','rateFeeling','problems','incentiveAware','wants','interest','note'
];

const csvCell = v => {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) v = v.join('; ');
  v = String(v).replace(/"/g, '""');
  return /[",\n\r]/.test(v) ? `"${v}"` : v;
};

(async () => {
  const snap = await db.collection('survey_responses').orderBy('createdAt', 'asc').get();
  const rows = snap.docs.map(d => {
    const r = d.data();
    const n = r.timesPerMonth === '4+' ? 4 : Number(r.timesPerMonth) || null;
    return {
      id: d.id,
      ...r,
      createdAt: r.createdAt ? r.createdAt.toDate().toISOString() : '',
      timesPerMonthNum: n,
      // মাসে মোট কত পাঠায় (নিজ মুদ্রায়) এবং ফি কত শতাংশ: তুলনার জন্য কাজে লাগবে
      monthlyVolume: n && r.avgAmount ? n * r.avgAmount : null,
      feePercent: r.avgAmount && r.feePerTransfer != null ? +(r.feePerTransfer / r.avgAmount * 100).toFixed(2) : null
    };
  });

  fs.writeFileSync('responses.json', JSON.stringify(rows, null, 2), 'utf8');
  const csv = [COLUMNS.join(',')].concat(rows.map(r => COLUMNS.map(c => csvCell(r[c])).join(','))).join('\n');
  fs.writeFileSync('responses.csv', '\ufeff' + csv, 'utf8'); // BOM: Excel-এ বাংলা ঠিক দেখাবে
  console.log(`Done: ${rows.length} responses -> responses.csv, responses.json`);
})();
