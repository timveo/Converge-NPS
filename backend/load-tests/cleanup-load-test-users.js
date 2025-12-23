// @ts-nocheck
/**
 * Cleanup script for load test users
 * Removes all load test users from the database
 *
 * IMPORTANT: This script should ONLY be run against local Docker database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/cleanup-load-test-users.js
 */

const { PrismaClient } = require('@prisma/client');

// Safety check: Only allow running against localhost databases
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1')) {
  console.error('❌ SAFETY ERROR: This script can only run against localhost databases.');
  console.error('   Current DATABASE_URL does not contain "localhost" or "127.0.0.1".');
  console.error('   Load testing should NEVER run against development, staging, or production.');
  console.error('\n   To run against Docker:');
  console.error('   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/cleanup-load-test-users.js');
  process.exit(1);
}

const prisma = new PrismaClient();

// Strict regex pattern: only matches loadtest{number}@nps.edu
const LOAD_TEST_EMAIL_REGEX = /^loadtest\d+@nps\.edu$/;

async function cleanupLoadTestUsers() {
  console.log('🧹 Starting load test user cleanup...\n');
  console.log(`📍 Connected to: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  // Find all users with emails starting with 'loadtest'
  const potentialLoadTestUsers = await prisma.profile.findMany({
    where: {
      email: {
        startsWith: 'loadtest',
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  // Apply strict regex filter to ensure we ONLY delete loadtest{number}@nps.edu users
  const loadTestUsers = potentialLoadTestUsers.filter((user) =>
    LOAD_TEST_EMAIL_REGEX.test(user.email)
  );

  // Warn if there are users that matched startsWith but not the strict regex
  const skippedUsers = potentialLoadTestUsers.filter(
    (user) => !LOAD_TEST_EMAIL_REGEX.test(user.email)
  );
  if (skippedUsers.length > 0) {
    console.log(`⚠️  Skipping ${skippedUsers.length} users that don't match strict pattern:`);
    skippedUsers.forEach((u) => console.log(`     - ${u.email}`));
    console.log('');
  }

  if (loadTestUsers.length === 0) {
    console.log('No load test users found matching pattern loadtest{number}@nps.edu. Nothing to clean up.');
    return;
  }

  console.log(`Found ${loadTestUsers.length} load test users to delete...`);
  console.log(`   Pattern: loadtest{1-250}@nps.edu\n`);

  const userIds = loadTestUsers.map((u) => u.id);

  // Delete in order to respect foreign key constraints
  console.log('  Deleting related records...');

  // Delete messages sent by load test users
  await prisma.message.deleteMany({
    where: { senderId: { in: userIds } },
  });

  // Delete conversation participants
  await prisma.conversationParticipant.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete RSVPs
  await prisma.rsvp.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete connections (both directions)
  await prisma.connection.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { connectedUserId: { in: userIds } }],
    },
  });

  // Delete project interests
  await prisma.projectInterest.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete partner favorites
  await prisma.partnerFavorite.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete QR codes
  await prisma.qrCode.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete email verifications
  await prisma.emailVerification.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete user sessions
  await prisma.userSession.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete user roles
  await prisma.userRole.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Delete user passwords
  await prisma.userPassword.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Finally, delete the profiles
  console.log('  Deleting user profiles...');
  const deleted = await prisma.profile.deleteMany({
    where: { id: { in: userIds } },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Cleanup complete! Deleted ${deleted.count} load test users.`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  try {
    await cleanupLoadTestUsers();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
