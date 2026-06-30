const Database = require('better-sqlite3');
const db = new Database('data/dev.db');

const targetAgencies = [
  { match: 'Department of Defense', amounts: { Contracts: 600000000, Grants: 100000000, DirectPayments: 50000000 } },
  { match: 'Department of Health%', amounts: { Contracts: 50000000, Grants: 1200000000, DirectPayments: 200000000 } },
  { match: 'Department of Education', amounts: { Contracts: 10000000, Grants: 150000000, DirectPayments: 40000000 } },
  { match: 'National Aeronautics%', amounts: { Contracts: 22000000, Grants: 2000000, DirectPayments: 1000000 } },
  { match: 'Department of Homeland%', amounts: { Contracts: 60000000, Grants: 30000000, DirectPayments: 10000000 } },
  { match: 'Department of Energy', amounts: { Contracts: 35000000, Grants: 10000000, DirectPayments: 5000000 } },
];

const insert = db.prepare(
  'INSERT INTO spending_record (agencyId, fiscalYear, quarter, awardTypeLabel, awardTypeCodes, obligatedAmount, outlayAmount, awardCount) VALUES (?, ?, 1, ?, ?, ?, ?, 1)'
);

let count = 0;
for (const target of targetAgencies) {
  const agency = db.prepare('SELECT id, name FROM agency WHERE name LIKE ? LIMIT 1').get(target.match);
  if (!agency) { console.log('NOT FOUND:', target.match); continue; }
  console.log('Seeding:', agency.name);

  for (let fy = 2020; fy <= 2024; fy++) {
    for (const [awardType, baseAmount] of Object.entries(target.amounts)) {
      const variance = 0.85 + Math.random() * 0.3;
      const cents = Math.round(baseAmount * 100 * variance);
      insert.run(agency.id, fy, awardType, '', cents, cents);
      count++;
    }
  }
}

console.log('\nInserted ' + count + ' spending records');

const sample = db.prepare(
  'SELECT a.name, s.fiscalYear, s.awardTypeLabel, s.obligatedAmount FROM spending_record s JOIN agency a ON s.agencyId = a.id ORDER BY s.obligatedAmount DESC LIMIT 5'
).all();
console.log('\nTop 5 records:');
for (const r of sample) {
  const name = r.name.substring(0, 25).padEnd(25);
  const type = r.awardTypeLabel.padEnd(15);
  console.log('  ' + name + ' FY' + r.fiscalYear + ' ' + type + ' $' + (r.obligatedAmount / 100).toLocaleString());
}

db.close();
