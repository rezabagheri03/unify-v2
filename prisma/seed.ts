/**
 * prisma/seed.ts
 * Seeds the System Owner account (Agent Guide Rule 3: only seed files contain hardcoded data).
 * Owner password is read from process.env.SEED_OWNER_PASSWORD.
 * Uses bcrypt for password hashing (Agent Guide Rule: never store plaintext).
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const ownerUsername = process.env.SEED_OWNER_USERNAME || 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!ownerPassword) {
    throw new Error('SEED_OWNER_PASSWORD environment variable is required. Aborting seed.');
  }

  if (ownerPassword.length < 8) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 8 characters. Aborting seed.');
  }

  const passwordHash = await bcrypt.hash(ownerPassword, parseInt(process.env.BCRYPT_COST_FACTOR || '12', 10));

  const owner = await prisma.user.upsert({
    where: { username: ownerUsername },
    update: {
      passwordHash,
      role: Role.SYSTEM_OWNER,
      isActive: true,
    },
    create: {
      username: ownerUsername,
      passwordHash,
      role: Role.SYSTEM_OWNER,
      isActive: true,
      onboardingComplete: true, // Owner has no onboarding
      firstName: 'System',
      lastName: 'Owner',
      themePreference: 'default',
      darkMode: false,
    },
  });

  // Create a default current semester so the system has something to show
  const currentSemester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!currentSemester) {
    const now = new Date();
    const start = new Date(now);
    start.setUTCMonth(start.getUTCMonth() - 1);
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 4);

    await prisma.semester.create({
      data: {
        name: 'نیم‌سال جاری',
        startDate: start,
        endDate: end,
        isCurrent: true,
        currentPhase: 'ENROLLMENT',
      },
    });
    console.log('✅ Created default current semester.');
  }

  console.log(`✅ System Owner account ready: username="${owner.username}", id=${owner.id}`);
  console.log(`   First login: use SEED_OWNER_PASSWORD from your .env file.`);
  console.log(`   Change the password immediately from the Owner panel.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
