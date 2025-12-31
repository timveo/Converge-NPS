// @ts-nocheck
/**
 * Test Seed Script for E2E Testing
 * Creates users with various privacy settings and check-in states
 * to test networking and messaging features
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function upsertProfile(data) {
  return prisma.profile.upsert({
    where: { email: data.email },
    update: {
      fullName: data.fullName,
      role: data.role,
      organization: data.organization,
      department: data.department,
      bio: data.bio,
      accelerationInterests: data.accelerationInterests,
      profileVisibility: data.profileVisibility,
      allowQrScanning: data.allowQrScanning,
      allowMessaging: data.allowMessaging,
      hideContactInfo: data.hideContactInfo,
      showProfileAllowConnections: data.showProfileAllowConnections,
      isCheckedIn: data.isCheckedIn,
    },
    create: {
      id: randomUUID(),
      ...data,
    },
  });
}

async function upsertPassword(userId, passwordHash) {
  const existing = await prisma.userPassword.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.userPassword.create({ data: { userId, passwordHash } });
  }
}

async function upsertEmailVerification(userId) {
  const existing = await prisma.emailVerification.findFirst({ where: { userId } });
  if (!existing) {
    const now = new Date();
    await prisma.emailVerification.create({
      data: { userId, tokenHash: 'verified', expiresAt: now, verifiedAt: now }
    });
  }
}

async function upsertUserRole(userId, role) {
  const existing = await prisma.userRole.findFirst({ where: { userId, role } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, role } });
  }
}

async function upsertQrCode(userId) {
  const existing = await prisma.qrCode.findFirst({ where: { userId } });
  if (!existing) {
    await prisma.qrCode.create({ data: { userId, qrCodeData: `QR-${userId.slice(0, 8)}-${Date.now()}` } });
  }
}

async function main() {
  console.log('🧪 Starting E2E Test Seed...\n');

  const passwordHash = await bcrypt.hash('test123', 12);

  // Test Users with various privacy/check-in configurations
  const testUsers = [
    // CHECKED IN + PUBLIC (should appear in NPS Community and recommendations)
    {
      fullName: 'Test User Public Checked-In',
      email: 'test-public-checkedin@test.com',
      role: 'Software Engineer',
      organization: 'Test Corp',
      department: 'Engineering',
      bio: 'Public profile, checked in at event',
      accelerationInterests: ['AI/ML', 'Cybersecurity', 'Data Science'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: false,
      showProfileAllowConnections: true,
      isCheckedIn: true,
    },
    // CHECKED IN + PUBLIC but hideContactInfo
    {
      fullName: 'Test User Hidden Contact',
      email: 'test-hidden-contact@test.com',
      role: 'Data Scientist',
      organization: 'Test Corp',
      department: 'Data',
      bio: 'Public profile but contact info hidden',
      accelerationInterests: ['Data Science', 'AI/ML', 'Analytics'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: true,
      showProfileAllowConnections: true,
      isCheckedIn: true,
    },
    // CHECKED IN but showProfileAllowConnections FALSE (should NOT appear to non-connections)
    {
      fullName: 'Test User No Discovery',
      email: 'test-no-discovery@test.com',
      role: 'Security Analyst',
      organization: 'Secure Inc',
      department: 'Security',
      bio: 'Does not want to be discovered by non-connections',
      accelerationInterests: ['Cybersecurity', 'Network Security'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: false,
      showProfileAllowConnections: false,
      isCheckedIn: true,
    },
    // NOT CHECKED IN (should NOT appear in NPS Community or recommendations)
    {
      fullName: 'Test User Not Checked In',
      email: 'test-not-checkedin@test.com',
      role: 'Product Manager',
      organization: 'Test Corp',
      department: 'Product',
      bio: 'Not checked in at the event',
      accelerationInterests: ['AI/ML', 'Product Development'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: false,
      showProfileAllowConnections: true,
      isCheckedIn: false,
    },
    // PRIVATE profile (should NOT appear anywhere except admin)
    {
      fullName: 'Test User Private',
      email: 'test-private@test.com',
      role: 'Executive',
      organization: 'Private Corp',
      department: 'Leadership',
      bio: 'Private profile',
      accelerationInterests: ['Strategy'],
      profileVisibility: 'private',
      allowQrScanning: false,
      allowMessaging: false,
      hideContactInfo: true,
      showProfileAllowConnections: false,
      isCheckedIn: true,
    },
    // CHECKED IN + allowMessaging FALSE
    {
      fullName: 'Test User No Messaging',
      email: 'test-no-messaging@test.com',
      role: 'Researcher',
      organization: 'Research Lab',
      department: 'R&D',
      bio: 'Does not want to receive messages from non-connections',
      accelerationInterests: ['Research', 'AI/ML'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: false,
      hideContactInfo: false,
      showProfileAllowConnections: true,
      isCheckedIn: true,
    },
    // Another checked-in user for messaging tests
    {
      fullName: 'Test User Messenger',
      email: 'test-messenger@test.com',
      role: 'Community Manager',
      organization: 'Test Corp',
      department: 'Community',
      bio: 'Loves connecting with people',
      accelerationInterests: ['AI/ML', 'Community Building', 'Events'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: false,
      showProfileAllowConnections: true,
      isCheckedIn: true,
    },
    // Same org as alice for recommendation testing
    {
      fullName: 'Test NPS Student',
      email: 'test-nps-student@nps.edu',
      role: 'Graduate Student',
      organization: 'Naval Postgraduate School',
      department: 'Computer Science',
      bio: 'NPS student studying AI',
      accelerationInterests: ['AI/ML', 'Machine Learning', 'Defense Technology'],
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
      hideContactInfo: false,
      showProfileAllowConnections: true,
      isCheckedIn: true,
    },
  ];

  console.log('Creating test users...\n');
  const createdUsers = [];

  for (const userData of testUsers) {
    const user = await upsertProfile(userData);
    await upsertPassword(user.id, passwordHash);
    await upsertEmailVerification(user.id);
    await upsertUserRole(user.id, 'student');
    await upsertQrCode(user.id);
    createdUsers.push(user);

    const checkedInStatus = userData.isCheckedIn ? '✓ Checked In' : '✗ Not Checked In';
    const privacyStatus = userData.profileVisibility === 'private' ? 'PRIVATE' :
                         !userData.showProfileAllowConnections ? 'NO DISCOVERY' :
                         !userData.allowMessaging ? 'NO MESSAGING' : 'PUBLIC';

    console.log(`  ${user.fullName}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Status: ${checkedInStatus} | ${privacyStatus}`);
    console.log(`    ID: ${user.id.substring(0, 8)}...`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 E2E Test Seed Completed!\n');
  console.log('Test Accounts (all use password: test123):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const user of createdUsers) {
    console.log(`  ${user.email}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nExpected Test Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('NPS Community Tab should show: 5 users (public + checked-in + showProfileAllowConnections)');
  console.log('  - Test User Public Checked-In');
  console.log('  - Test User Hidden Contact');
  console.log('  - Test User No Messaging');
  console.log('  - Test User Messenger');
  console.log('  - Test NPS Student');
  console.log('');
  console.log('Should NOT appear in NPS Community:');
  console.log('  - Test User No Discovery (showProfileAllowConnections: false)');
  console.log('  - Test User Not Checked In (isCheckedIn: false)');
  console.log('  - Test User Private (profileVisibility: private)');
  console.log('');
  console.log('Recommendations should only show checked-in participants');
  console.log('Messaging should be blocked for Test User No Messaging unless connected');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Test seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
