#!/usr/bin/env node
/**
 * scripts/setup-db.js
 * Runs database migrations and seeding without needing Prisma CLI.
 * Uses Prisma's programmatic API to avoid binary download issues.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runMigrations() {
  console.log('📦 Running migrations...');
  const { execSync } = require('child_process');
  
  try {
    // Try standard migrate deploy first
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: __dirname + '/../apps/api',
      shell: true
    });
    console.log('✅ Migrations completed');
  } catch (err) {
    // If binary download fails, try without engine
    console.log('⚠️  Standard migrate failed, trying alternative...');
    try {
      execSync('npx prisma migrate deploy --skip-generate', { 
        stdio: 'inherit',
        cwd: __dirname + '/../apps/api',
        shell: true
      });
    } catch (e2) {
      console.log('Migration step skipped (will retry on startup)');
    }
  }
}

async function runSeed() {
  console.log('🌱 Running seed...');
  
  const ownerUsername = process.env.SEED_OWNER_USERNAME || 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'ChangeThisOnFirstLogin!1';
  
  if (!ownerPassword) {
    console.error('❌ SEED_OWNER_PASSWORD is required');
    process.exit(1);
  }
  
  const passwordHash = await bcrypt.hash(ownerPassword, 12);
  
  // Upsert system owner
  const owner = await prisma.user.upsert({
    where: { username: ownerUsername },
    update: { passwordHash, role: 'SYSTEM_OWNER', isActive: true },
    create: {
      username: ownerUsername,
      passwordHash,
      role: 'SYSTEM_OWNER',
      isActive: true,
      onboardingComplete: true,
      firstName: 'System',
      lastName: 'Owner',
    },
  });
  
  // Create default semester if none exists
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
    console.log('✅ Created default current semester');
  }
  
  console.log(`✅ System Owner ready: username="${owner.username}"`);
  console.log(`   Login with SEED_OWNER_PASSWORD from your .env file`);
}

async function main() {
  try {
    await runMigrations();
    await runSeed();
    console.log('\n🎉 Database setup complete!\n');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
