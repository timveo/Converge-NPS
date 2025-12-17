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

  // Only create sessions, projects, etc. on fresh database
  if (!isFreshDb) {
    console.log('\n🎉 Seed completed (upserted users only - other data already exists)!');
    console.log('\n📋 Test Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:     admin@converge-nps.com / password123');
    console.log('Student 1: alice@nps.edu / password123');
    console.log('Student 2: bob@nps.edu / password123');
    console.log('Faculty:   carol@nps.edu / password123');
    console.log('Industry:  david@techcorp.com / password123');
    console.log('Staff 1:   ddillehay@npsfoundation.org / password123');
    console.log('Staff 2:   tlyons@npsfoundation.org / password123');
    console.log('Staff 3:   tmartin@npsfoundation.org / password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // Create sessions
  console.log('Creating event sessions...');

  const eventDate = new Date('2026-01-28T09:00:00Z');

  const sessions = await Promise.all([
    prisma.session.create({
      data: {
        title: 'Opening Keynote: The Future of Defense Technology',
        description: 'Join us for an inspiring keynote address on emerging defense technologies and their impact on national security.',
        speaker: 'Admiral James Rodriguez',
        startTime: new Date('2026-01-28T09:00:00Z'),
        endTime: new Date('2026-01-28T10:00:00Z'),
        location: 'Main Auditorium',
        sessionType: 'Other',
        capacity: 500,
        status: 'scheduled',
      },
    }),
    prisma.session.create({
      data: {
        title: 'AI/ML in Autonomous Systems',
        description: 'Exploring the latest advances in AI and machine learning for autonomous military systems.',
        speaker: 'Dr. Sarah Martinez',
        startTime: new Date('2026-01-28T10:30:00Z'),
        endTime: new Date('2026-01-28T11:30:00Z'),
        location: 'Room 101',
        sessionType: 'AI/ML',
        capacity: 50,
        status: 'scheduled',
      },
    }),
    prisma.session.create({
      data: {
        title: 'Cybersecurity Threats and Mitigation',
        description: 'A deep dive into current cybersecurity threats facing defense systems and mitigation strategies.',
        speaker: 'Colonel Mike Thompson',
        startTime: new Date('2026-01-28T10:30:00Z'),
        endTime: new Date('2026-01-28T11:30:00Z'),
        location: 'Room 102',
        sessionType: 'Cybersecurity',
        capacity: 40,
        status: 'scheduled',
      },
    }),
    prisma.session.create({
      data: {
        title: 'Data Science for Maritime Operations',
        description: 'Leveraging data science and analytics to enhance maritime operational effectiveness.',
        speaker: 'Dr. Lisa Wang',
        startTime: new Date('2026-01-28T13:00:00Z'),
        endTime: new Date('2026-01-28T14:00:00Z'),
        location: 'Room 103',
        sessionType: 'Data Science',
        capacity: 45,
        status: 'scheduled',
      },
    }),
    prisma.session.create({
      data: {
        title: 'Autonomous Underwater Vehicles',
        description: 'The latest developments in autonomous underwater vehicle technology and applications.',
        speaker: 'Dr. Robert Kim',
        startTime: new Date('2026-01-28T14:30:00Z'),
        endTime: new Date('2026-01-28T15:30:00Z'),
        location: 'Room 101',
        sessionType: 'Autonomous Systems',
        capacity: 35,
        status: 'scheduled',
      },
    }),
    prisma.session.create({
      data: {
        title: 'Networking Reception',
        description: 'Join fellow attendees, speakers, and industry partners for networking and refreshments.',
        speaker: 'Event Staff',
        startTime: new Date('2026-01-28T17:00:00Z'),
        endTime: new Date('2026-01-28T19:00:00Z'),
        location: 'Terrace',
        sessionType: 'Other',
        capacity: 200,
        status: 'scheduled',
      },
    }),
  ]);

  console.log('✅ Created 6 event sessions');

  // Create RSVPs
  console.log('Creating RSVPs...');

  await prisma.rsvp.createMany({
    data: [
      { userId: student1.id, sessionId: sessions[0].id, status: 'confirmed' },
      { userId: student1.id, sessionId: sessions[1].id, status: 'confirmed' },
      { userId: student1.id, sessionId: sessions[5].id, status: 'waitlisted' },
      { userId: student2.id, sessionId: sessions[0].id, status: 'confirmed' },
      { userId: student2.id, sessionId: sessions[2].id, status: 'confirmed' },
      { userId: faculty.id, sessionId: sessions[0].id, status: 'confirmed' },
      { userId: faculty.id, sessionId: sessions[1].id, status: 'confirmed' },
      { userId: industry1.id, sessionId: sessions[0].id, status: 'confirmed' },
      { userId: industry1.id, sessionId: sessions[3].id, status: 'confirmed' },
    ],
  });

  console.log('✅ Created 9 RSVPs');

  // Create research projects
  console.log('Creating research projects...');

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        title: 'Quantum Computing for Cryptography',
        description: 'Exploring quantum computing applications in military cryptography systems.',
        piId: faculty.id,
        stage: 'concept',
        keywords: ['quantum', 'cryptography', 'security'],
        pocUserId: faculty.id,
        pocFirstName: 'Carol',
        pocLastName: 'Williams',
        pocEmail: 'carol@nps.edu',
        pocRank: 'Associate Professor',
      },
    }),
    prisma.project.create({
      data: {
        title: 'AI-Powered Threat Detection',
        description: 'Machine learning models for real-time threat detection in naval operations.',
        piId: student1.id,
        stage: 'prototype',
        keywords: ['ai', 'ml', 'threat-detection'],
        pocUserId: student1.id,
        pocFirstName: 'Alice',
        pocLastName: 'Johnson',
        pocEmail: 'alice@nps.edu',
        pocRank: 'Graduate Student',
      },
    }),
    prisma.project.create({
      data: {
        title: 'Swarm Robotics for Maritime Surveillance',
        description: 'Coordinated autonomous surface vehicles for wide-area maritime surveillance.',
        piId: student2.id,
        stage: 'pilot_ready',
        keywords: ['swarm', 'robotics', 'surveillance'],
        pocUserId: student2.id,
        pocFirstName: 'Bob',
        pocLastName: 'Smith',
        pocEmail: 'bob@nps.edu',
        pocRank: 'Graduate Student',
      },
    }),
  ]);

  console.log('✅ Created 3 research projects');

  // Create project interests
  await prisma.projectInterest.createMany({
    data: [
      { userId: student2.id, projectId: projects[0].id, message: 'Very interested in collaborating on this!' },
      { userId: industry1.id, projectId: projects[1].id, message: 'Our company could provide resources for this research.' },
      { userId: student1.id, projectId: projects[2].id },
    ],
  });

  console.log('✅ Created project interests');

  // Create industry opportunities
  console.log('Creating industry opportunities...');

  const opportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        title: 'Software Engineer - Defense Systems',
        description: 'Join our team building next-generation defense software systems.',
        postedBy: industry1.id,
        type: 'funding',
        status: 'active',
        sponsorOrganization: 'TechCorp Solutions',
        pocUserId: industry1.id,
        pocFirstName: 'David',
        pocLastName: 'Chen',
        pocEmail: 'david@techcorp.com',
        pocRank: 'Director of Engineering',
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Summer Internship - Cybersecurity Research',
        description: 'Hands-on cybersecurity research internship for graduate students.',
        postedBy: industry1.id,
        type: 'internship',
        status: 'active',
        sponsorOrganization: 'TechCorp Solutions',
        pocUserId: faculty.id,
        pocFirstName: 'Carol',
        pocLastName: 'Williams',
        pocEmail: 'carol@nps.edu',
        pocRank: 'Associate Professor',
      },
    }),
  ]);

  console.log('✅ Created 2 industry opportunities');

  // Create industry partners
  console.log('Creating industry partners...');

  await Promise.all([
    prisma.partner.create({
      data: {
        name: 'Northrop Grumman',
        description: 'A leading global aerospace and defense technology company providing innovative systems, products, and solutions.',
        websiteUrl: 'https://www.northropgrumman.com',
        partnershipType: 'Defense Contractor',
        researchAreas: ['Autonomous Systems', 'Cybersecurity', 'AI/ML', 'Space Systems'],
        isFeatured: true,
        pocUserId: industry1.id,
        pocFirstName: 'David',
        pocLastName: 'Chen',
        pocEmail: 'david@techcorp.com',
        pocRank: 'Director of Engineering',
      },
    }),
    prisma.partner.create({
      data: {
        name: 'Lockheed Martin',
        description: 'Global security and aerospace company focused on research, design, development, and manufacturing of advanced technology systems.',
        websiteUrl: 'https://www.lockheedmartin.com',
        partnershipType: 'Defense Contractor',
        researchAreas: ['Hypersonics', 'AI/ML', 'Autonomous Systems', 'Missile Defense'],
        isFeatured: true,
        pocUserId: industry1.id,
        pocFirstName: 'David',
        pocLastName: 'Chen',
        pocEmail: 'david@techcorp.com',
        pocRank: 'Director of Engineering',
      },
    }),
    prisma.partner.create({
      data: {
        name: 'Raytheon Technologies',
        description: 'An aerospace and defense company that provides advanced systems for commercial, military, and government customers worldwide.',
        websiteUrl: 'https://www.rtx.com',
        partnershipType: 'Defense Contractor',
        researchAreas: ['Cybersecurity', 'Radar Systems', 'Missile Systems', 'Electronic Warfare'],
        isFeatured: false,
        pocUserId: faculty.id,
        pocFirstName: 'Carol',
        pocLastName: 'Williams',
        pocEmail: 'carol@nps.edu',
        pocRank: 'Associate Professor',
      },
    }),
    prisma.partner.create({
      data: {
        name: 'DARPA',
        description: 'The Defense Advanced Research Projects Agency develops breakthrough technologies and capabilities for national security.',
        websiteUrl: 'https://www.darpa.mil',
        partnershipType: 'Government Agency',
        researchAreas: ['AI/ML', 'Autonomous Systems', 'Biotechnology', 'Quantum Computing'],
        isFeatured: true,
        pocUserId: faculty.id,
        pocFirstName: 'Carol',
        pocLastName: 'Williams',
        pocEmail: 'carol@nps.edu',
        pocRank: 'Associate Professor',
      },
    }),
    prisma.partner.create({
      data: {
        name: 'Office of Naval Research',
        description: 'Coordinates, executes, and promotes Navy and Marine Corps science and technology programs through universities, government labs, and industry.',
        websiteUrl: 'https://www.onr.navy.mil',
        partnershipType: 'Government Agency',
        researchAreas: ['Maritime Operations', 'Autonomous Systems', 'Data Science', 'Naval Engineering'],
        isFeatured: true,
        pocUserId: faculty.id,
        pocFirstName: 'Carol',
        pocLastName: 'Williams',
        pocEmail: 'carol@nps.edu',
        pocRank: 'Associate Professor',
      },
    }),
    prisma.partner.create({
      data: {
        name: 'AWS Public Sector',
        description: 'Amazon Web Services provides cloud computing services for government, education, and nonprofit organizations.',
        websiteUrl: 'https://aws.amazon.com/government-education',
        partnershipType: 'Technology Partner',
        pocUserId: industry1.id,
        pocFirstName: 'David',
        pocLastName: 'Chen',
        pocEmail: 'david@techcorp.com',
        pocRank: 'Director of Engineering',
        researchAreas: ['Cloud Computing', 'AI/ML', 'Data Science', 'Cybersecurity'],
        isFeatured: false,
      },
    }),
  ]);

  console.log('✅ Created 6 industry partners');

  // Create connections
  console.log('Creating connections...');

  await prisma.connection.createMany({
    data: [
      { userId: student1.id, connectedUserId: student2.id, connectionMethod: 'qr_scan' },
      { userId: student1.id, connectedUserId: faculty.id, connectionMethod: 'qr_scan' },
      { userId: student2.id, connectedUserId: industry1.id, connectionMethod: 'manual_entry' },
      { userId: faculty.id, connectedUserId: industry1.id, connectionMethod: 'qr_scan' },
    ],
  });

  console.log('✅ Created 4 connections');

  // Create conversations and messages
  console.log('Creating conversations and messages...');

  const conversation1 = await prisma.conversation.create({
    data: {},
  });

  const conversation2 = await prisma.conversation.create({
    data: {},
  });

  // Add participants to conversations
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conversation1.id, userId: student1.id },
      { conversationId: conversation1.id, userId: student2.id },
      { conversationId: conversation2.id, userId: student1.id },
      { conversationId: conversation2.id, userId: faculty.id },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation1.id,
        senderId: student1.id,
        content: 'Hey Bob! Great to meet you at the conference.',
        isRead: true,
      },
      {
        conversationId: conversation1.id,
        senderId: student2.id,
        content: 'Likewise! Your research on AI sounds fascinating.',
        isRead: true,
      },
      {
        conversationId: conversation1.id,
        senderId: student1.id,
        content: 'Thanks! Would love to collaborate sometime.',
        isRead: false,
      },
      {
        conversationId: conversation2.id,
        senderId: student1.id,
        content: 'Dr. Williams, I\'d like to discuss your keynote session.',
        isRead: false,
      },
    ],
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversation1.id },
    data: { lastMessageAt: new Date(Date.now() - 1800000) },
  });

  await prisma.conversation.update({
    where: { id: conversation2.id },
    data: { lastMessageAt: new Date(Date.now() - 600000) },
  });

  console.log('✅ Created conversations and messages');

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
