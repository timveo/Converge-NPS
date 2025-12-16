// @ts-nocheck
/**
 * Seed script for load test users
 * Creates 250 test users for load testing the conference simulation
 *
 * IMPORTANT: This script should ONLY be run against local Docker database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/seed-load-test-users.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

// Safety check: Only allow running against localhost databases
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1')) {
  console.error('❌ SAFETY ERROR: This script can only run against localhost databases.');
  console.error('   Current DATABASE_URL does not contain "localhost" or "127.0.0.1".');
  console.error('   Load testing should NEVER run against development, staging, or production.');
  console.error('\n   To run against Docker:');
  console.error('   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/seed-load-test-users.js');
  process.exit(1);
}

const prisma = new PrismaClient();

// Load test user email pattern: loadtest{1-250}@nps.edu
const LOAD_TEST_EMAIL_REGEX = /^loadtest\d+@nps\.edu$/;

const LOAD_TEST_USER_COUNT = 250;
const LOAD_TEST_PASSWORD = 'LoadTest123!';

// Sample data for realistic user profiles
const ORGANIZATIONS = [
  'Naval Postgraduate School',
  'MIT',
  'Stanford University',
  'Georgia Tech',
  'Lockheed Martin',
  'Northrop Grumman',
  'Raytheon',
  'DARPA',
  'ONR',
  'US Navy',
];

const INTERESTS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Cybersecurity',
  'Autonomous Systems',
  'Data Science',
  'Robotics',
  'Quantum Computing',
  'Maritime Operations',
  'Network Security',
  'Defense Technology',
];

const ROLES = ['student', 'student', 'student', 'faculty', 'industry']; // Weighted towards students

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedLoadTestUsers() {
  console.log('🚀 Starting load test user seeding...\n');

  // Check for existing load test users
  const existingCount = await prisma.profile.count({
    where: {
      email: {
        startsWith: 'loadtest',
      },
    },
  });

  if (existingCount >= LOAD_TEST_USER_COUNT) {
    console.log(`✅ ${existingCount} load test users already exist. Skipping seeding.`);
    console.log('   To re-seed, first run: node backend/load-tests/cleanup-load-test-users.js');
    return;
  }

  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing load test users. Creating remaining ${LOAD_TEST_USER_COUNT - existingCount}...`);
  }

  const passwordHash = await bcrypt.hash(LOAD_TEST_PASSWORD, 12);
  const now = new Date();

  console.log(`Creating ${LOAD_TEST_USER_COUNT} load test users...`);
  console.log('This may take a minute...\n');

  let created = 0;
  let skipped = 0;
  const batchSize = 50;

  for (let batch = 0; batch < Math.ceil(LOAD_TEST_USER_COUNT / batchSize); batch++) {
    const startIdx = batch * batchSize + 1;
    const endIdx = Math.min((batch + 1) * batchSize, LOAD_TEST_USER_COUNT);

    const usersToCreate = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const email = `loadtest${i}@nps.edu`;

      // Check if user already exists
      const existing = await prisma.profile.findUnique({
        where: { email },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const role = ROLES[i % ROLES.length];
      const org = ORGANIZATIONS[i % ORGANIZATIONS.length];
      const interests = getRandomItems(INTERESTS, 3 + (i % 3));

      usersToCreate.push({
        id: randomUUID(),
        email,
        fullName: `Load Test User ${i}`,
        role,
        organization: org,
        bio: `Test user ${i} for load testing - ${role} at ${org}`,
        accelerationInterests: interests,
        profileVisibility: 'public',
        allowQrScanning: true,
        allowMessaging: true,
      });
    }

    // Create users in this batch
    for (const userData of usersToCreate) {
      try {
        const user = await prisma.profile.create({
          data: userData,
        });

        // Create password record
        await prisma.userPassword.create({
          data: {
            userId: user.id,
            passwordHash,
          },
        });

        // Create user role
        await prisma.userRole.create({
          data: {
            userId: user.id,
            role: userData.role,
          },
        });

        // Create email verification (mark as verified)
        await prisma.emailVerification.create({
          data: {
            userId: user.id,
            tokenHash: 'loadtest-verified',
            expiresAt: now,
            verifiedAt: now,
          },
        });

        // Create QR code
        await prisma.qrCode.create({
          data: {
            userId: user.id,
            qrCodeData: `QR-LOADTEST-${user.id}`,
          },
        });

        created++;

        if (created % 50 === 0) {
          console.log(`  Created ${created}/${LOAD_TEST_USER_COUNT} users...`);
        }
      } catch (error) {
        console.error(`  Error creating user ${userData.email}:`, error.message);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Load test user seeding complete!');
  console.log(`   Created: ${created} users`);
  console.log(`   Skipped: ${skipped} users (already existed)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Load Test Credentials:');
  console.log(`   Email pattern: loadtest1@nps.edu through loadtest${LOAD_TEST_USER_COUNT}@nps.edu`);
  console.log(`   Password: ${LOAD_TEST_PASSWORD}`);
  console.log('\n✨ Ready for load testing!\n');
}

async function main() {
  try {
    await seedLoadTestUsers();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
