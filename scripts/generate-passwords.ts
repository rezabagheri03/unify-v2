/**
 * scripts/generate-passwords.ts — Standalone script to generate a batch of
 * strong passwords for manual account setup.
 * Run with: npx ts-node scripts/generate-passwords.ts [count]
 */

import { generateRandomPassword } from '../apps/api/src/utils/bcrypt';
import fs from 'fs';

const count = parseInt(process.argv[2] || '50', 10);
const passwords: Array<{ username: string; password: string }> = [];

for (let i = 1; i <= count; i++) {
  passwords.push({
    username: `user${i.toString().padStart(4, '0')}`,
    password: generateRandomPassword(12),
  });
}

const csv = 'username,password\n' + passwords.map((p) => `${p.username},${p.password}`).join('\n');
const outFile = `scripts/generated-passwords-${Date.now()}.csv`;
fs.writeFileSync(outFile, csv, { encoding: 'utf-8' });
console.log(`✅ Generated ${count} passwords to: ${outFile}`);
console.log(`   ⚠️  This file contains credentials. Store securely and delete after distribution.`);
