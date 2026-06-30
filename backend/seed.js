const Database = require('better-sqlite3');
const API = 'https://api.usaspending.gov/api/v2';

async function main() {
  const db = new Database('data/dev.db');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS agency (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      abbreviation TEXT,
      toptierCode TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geo_spending_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stateCode TEXT NOT NULL,
      stateName TEXT NOT NULL,
      fiscalYear INTEGER NOT NULL,
      agencyId INTEGER,
      scope TEXT NOT NULL,
      obligatedAmount INTEGER NOT NULL,
      awardCount INTEGER DEFAULT 0,
      population INTEGER DEFAULT 0,
      perCapita INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS disaster_funding_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      defGroup TEXT NOT NULL,
      defCodes TEXT,
      stateCode TEXT NOT NULL,
      stateName TEXT,
      obligatedAmount INTEGER DEFAULT 0,
      outlayAmount INTEGER DEFAULT 0,
      awardCount INTEGER DEFAULT 0,
      perCapita INTEGER DEFAULT 0,
      population INTEGER DEFAULT 0
    );
  `);

  console.log('Fetching agencies...');
  const agencyRes = await fetch(`${API}/references/toptier_agencies/`);
  const agencyBody = await agencyRes.json();
  const insertAgency = db.prepare('INSERT OR REPLACE INTO agency (name, abbreviation, toptierCode) VALUES (?, ?, ?)');
  let agencyCount = 0;
  for (const a of agencyBody.results) {
    insertAgency.run(a.agency_name, a.abbreviation || '', a.toptier_code);
    agencyCount++;
  }
  console.log(`  Inserted ${agencyCount} agencies`);

  console.log('Fetching geography (FY2024)...');
  const geoRes = await fetch(`${API}/search/spending_by_geography/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { time_period: [{ start_date: '2024-10-01', end_date: '2025-09-30' }] },
      geo_layer: 'state',
      scope: 'recipient_location',
    }),
  });
  const geoBody = await geoRes.json();
  const insertGeo = db.prepare(`INSERT INTO geo_spending_snapshot
    (stateCode, stateName, fiscalYear, agencyId, scope, obligatedAmount, awardCount, population, perCapita)
    VALUES (?, ?, 2024, NULL, 'recipient', ?, 0, ?, ?)`);
  let geoCount = 0;
  for (const s of geoBody.results) {
    insertGeo.run(
      s.shape_code || '',
      s.display_name || s.shape_code || '',
      Math.round((s.aggregated_amount || 0) * 100),
      s.population || 0,
      Math.round((s.per_capita || 0) * 100),
    );
    geoCount++;
  }
  console.log(`  Inserted ${geoCount} state snapshots`);

  console.log('Fetching disaster (COVID-19 def code L)...');
  const disRes = await fetch(`${API}/search/spending_by_geography/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        time_period: [{ start_date: '2024-10-01', end_date: '2025-09-30' }],
        def_codes: ['L'],
      },
      geo_layer: 'state',
      scope: 'recipient_location',
    }),
  });
  const disBody = await disRes.json();
  const insertDis = db.prepare(`INSERT INTO disaster_funding_record
    (defGroup, defCodes, stateCode, stateName, obligatedAmount, awardCount, perCapita, population)
    VALUES ('L', 'L', ?, ?, ?, 0, 0, ?)`);
  let disCount = 0;
  for (const s of disBody.results) {
    insertDis.run(s.shape_code || '', s.display_name || s.shape_code || 'Unknown', Math.round((s.aggregated_amount || 0) * 100), s.population || 0);
    disCount++;
  }
  console.log(`  Inserted ${disCount} disaster records`);

  console.log('\nDone! Summary:');
  for (const [t, c] of [['agency', agencyCount], ['geo_spending_snapshot', geoCount], ['disaster_funding_record', disCount]]) {
    console.log(`  ${t}: ${c} rows`);
  }

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
