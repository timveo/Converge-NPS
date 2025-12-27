// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// Helper function to upsert a profile by email
async function upsertProfile(data) {
  return prisma.profile.upsert({
    where: { email: data.email },
    update: {
      fullName: data.fullName,
      role: data.role,
      organization: data.organization,
      bio: data.bio,
      accelerationInterests: data.accelerationInterests,
      profileVisibility: data.profileVisibility,
      allowQrScanning: data.allowQrScanning,
      allowMessaging: data.allowMessaging,
    },
    create: {
      id: randomUUID(),
      ...data,
    },
  });
}

// Helper function to upsert password
async function upsertPassword(userId, passwordHash) {
  const existing = await prisma.userPassword.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.userPassword.create({ data: { userId, passwordHash } });
  }
}

// Helper function to upsert email verification
async function upsertEmailVerification(userId) {
  const existing = await prisma.emailVerification.findFirst({ where: { userId } });
  if (!existing) {
    const now = new Date();
    await prisma.emailVerification.create({
      data: { userId, tokenHash: 'verified', expiresAt: now, verifiedAt: now }
    });
  }
}

// Helper function to upsert user role
async function upsertUserRole(userId, role) {
  const existing = await prisma.userRole.findFirst({ where: { userId, role } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, role } });
  }
}

// Helper function to upsert QR code
async function upsertQrCode(userId) {
  const existing = await prisma.qrCode.findFirst({ where: { userId } });
  if (!existing) {
    await prisma.qrCode.create({ data: { userId, qrCodeData: `QR-${userId.slice(0, 8)}-${Date.now()}` } });
  }
}

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Check if this is a fresh database or existing
  const existingUsers = await prisma.profile.count();
  const isFreshDb = existingUsers === 0;

  if (isFreshDb && process.env.NODE_ENV !== 'production') {
    console.log('Fresh database detected. Clearing any partial data...');
    await prisma.projectInterest.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.rsvp.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.qrCode.deleteMany();
    await prisma.session.deleteMany();
    await prisma.opportunity.deleteMany();
    await prisma.project.deleteMany();
    await prisma.partnerFavorite.deleteMany();
    await prisma.partner.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.userPassword.deleteMany();
    await prisma.emailVerification.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.profile.deleteMany();
  }

  // Upsert test users (will create if not exists, update if exists)
  console.log('Upserting test users...');

  const staff = await upsertProfile({
    fullName: 'Admin User',
    email: 'admin@converge-nps.com',
    role: 'admin',
    organization: 'Naval Postgraduate School',
    bio: 'System administrator and event organizer',
    accelerationInterests: ['Event Management', 'Technology Integration'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const student1 = await upsertProfile({
    fullName: 'Alice Johnson',
    email: 'alice@nps.edu',
    role: 'student',
    organization: 'Naval Postgraduate School',
    bio: 'PhD candidate specializing in AI/ML',
    accelerationInterests: ['Artificial Intelligence', 'Machine Learning', 'Autonomous Systems', 'Data Science'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const student2 = await upsertProfile({
    fullName: 'Bob Smith',
    email: 'bob@nps.edu',
    role: 'student',
    organization: 'Naval Postgraduate School',
    bio: 'Graduate student in cybersecurity',
    accelerationInterests: ['Cybersecurity', 'Network Security', 'Threat Detection', 'Cryptography'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const faculty = await upsertProfile({
    fullName: 'Dr. Carol Williams',
    email: 'carol@nps.edu',
    role: 'faculty',
    organization: 'Naval Postgraduate School',
    bio: 'Professor specializing in autonomous systems',
    accelerationInterests: ['Autonomous Systems', 'Robotics', 'AI/ML', 'Maritime Operations'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const industry1 = await upsertProfile({
    fullName: 'David Chen',
    email: 'david@techcorp.com',
    role: 'industry',
    organization: 'TechCorp Solutions',
    bio: 'Defense contractor specializing in AI/ML solutions',
    accelerationInterests: ['Defense Technology', 'AI/ML', 'Government Contracts', 'Research Partnerships'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const staff1 = await upsertProfile({
    fullName: 'Desiree Dillehay',
    email: 'ddillehay@npsfoundation.org',
    role: 'admin',
    organization: 'NPSF',
    bio: 'System administrator',
    accelerationInterests: ['Event Management', 'Technology Integration'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const staff2 = await upsertProfile({
    fullName: 'Todd Lyons',
    email: 'tlyons@npsfoundation.org',
    role: 'admin',
    organization: 'NPSF',
    bio: 'System administrator',
    accelerationInterests: ['Event Management', 'Technology Integration'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  const staff3 = await upsertProfile({
    fullName: 'Tim Martin',
    email: 'tmartin@npsfoundation.org',
    role: 'admin',
    organization: 'NPSF',
    bio: 'System administrator',
    accelerationInterests: ['Event Management', 'Technology Integration'],
    profileVisibility: 'public',
    allowQrScanning: true,
    allowMessaging: true,
  });

  console.log('✅ Upserted 8 test users');

  // Upsert password records for all users
  console.log('Upserting password records...');

  const allUsers = [staff, student1, student2, faculty, industry1, staff1, staff2, staff3];
  for (const user of allUsers) {
    await upsertPassword(user.id, passwordHash);
  }
  console.log('✅ Upserted password records');

  // Upsert user roles
  console.log('Upserting user roles...');
  await upsertUserRole(staff.id, 'admin');
  await upsertUserRole(staff.id, 'staff');
  await upsertUserRole(student1.id, 'student');
  await upsertUserRole(student2.id, 'student');
  await upsertUserRole(faculty.id, 'faculty');
  await upsertUserRole(industry1.id, 'industry');
  await upsertUserRole(staff1.id, 'admin');
  await upsertUserRole(staff1.id, 'staff');
  await upsertUserRole(staff2.id, 'admin');
  await upsertUserRole(staff2.id, 'staff');
  await upsertUserRole(staff3.id, 'admin');
  await upsertUserRole(staff3.id, 'staff');
  console.log('✅ Upserted user roles');

  // Upsert email verifications (mark all as verified for test accounts)
  console.log('Upserting email verifications...');
  for (const user of allUsers) {
    await upsertEmailVerification(user.id);
  }
  console.log('✅ Upserted email verifications');

  // Upsert QR codes for users
  console.log('Upserting QR codes...');
  for (const user of allUsers) {
    await upsertQrCode(user.id);
  }
  console.log('✅ Upserted QR codes');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:     admin@converge-nps.com / password123');
  console.log('Student 1: alice@nps.edu / password123');
  console.log('Student 2: bob@nps.edu / password123');
  console.log('Faculty:   carol@nps.edu / password123');
  console.log('Industry:  david@techcorp.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Database is ready for testing!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
