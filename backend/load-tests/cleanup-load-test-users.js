// @ts-nocheck
/**
 * Cleanup script for load test users
 * Removes all load test users from the database
 *
 * Usage: node backend/load-tests/cleanup-load-test-users.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupLoadTestUsers() {
  console.log('🧹 Starting load test user cleanup...\n');

  // Find all load test users
  const loadTestUsers = await prisma.profile.findMany({
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

  if (loadTestUsers.length === 0) {
    console.log('No load test users found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${loadTestUsers.length} load test users to delete...`);

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
