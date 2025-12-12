// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if already seeded
  const existingUsers = await prisma.profile.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Checking for missing email verifications...');

    // Find users without email verification using raw query
    const usersWithoutVerification = await prisma.$queryRaw`
      SELECT p.id FROM profiles p
      LEFT JOIN email_verifications ev ON p.id = ev.user_id
      WHERE ev.id IS NULL
    `;

    if (usersWithoutVerification.length > 0) {
      console.log(`Adding email verifications for ${usersWithoutVerification.length} users...`);
      const now = new Date();
      for (const user of usersWithoutVerification) {
        await prisma.emailVerification.create({
          data: {
            userId: user.id,
            tokenHash: 'verified',
            expiresAt: now,
            verifiedAt: now
          }
        });
      }
      console.log('✅ Added missing email verifications');
    } else {
      console.log('All users have email verifications.');
    }

    console.log('Skipping full seed (data already exists).');
    return;
  }

  // Clear existing data (development only!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Clearing existing data...');
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
    await prisma.userRole.deleteMany();
    await prisma.userPassword.deleteMany();
    await prisma.emailVerification.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.profile.deleteMany();
  }

  // Create test users
  console.log('Creating test users...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const staff = await prisma.profile.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      fullName: 'Admin User',
      email: 'admin@converge-nps.com',
      role: 'admin',
      organization: 'Naval Postgraduate School',
      bio: 'System administrator and event organizer',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const student1 = await prisma.profile.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      fullName: 'Alice Johnson',
      email: 'alice@nps.edu',
      role: 'student',
      organization: 'Naval Postgraduate School',
      bio: 'PhD candidate specializing in AI/ML',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const student2 = await prisma.profile.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      fullName: 'Bob Smith',
      email: 'bob@nps.edu',
      role: 'student',
      organization: 'Naval Postgraduate School',
      bio: 'Graduate student in cybersecurity',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const faculty = await prisma.profile.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      fullName: 'Dr. Carol Williams',
      email: 'carol@nps.edu',
      role: 'faculty',
      organization: 'Naval Postgraduate School',
      bio: 'Professor specializing in autonomous systems',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const industry1 = await prisma.profile.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      fullName: 'David Chen',
      email: 'david@techcorp.com',
      role: 'industry',
      organization: 'TechCorp Solutions',
      bio: 'Defense contractor specializing in AI/ML solutions',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  console.log('✅ Created 5 test users');

  // Create password records for all users
  console.log('Creating password records...');
  await prisma.userPassword.createMany({
    data: [
      { userId: staff.id, passwordHash },
      { userId: student1.id, passwordHash },
      { userId: student2.id, passwordHash },
      { userId: faculty.id, passwordHash },
      { userId: industry1.id, passwordHash },
    ],
  });
  console.log('✅ Created password records');

  // Create user roles
  console.log('Creating user roles...');
  await prisma.userRole.createMany({
    data: [
      { userId: staff.id, role: 'admin' },
      { userId: staff.id, role: 'staff' },
      { userId: student1.id, role: 'student' },
      { userId: student2.id, role: 'student' },
      { userId: faculty.id, role: 'faculty' },
      { userId: industry1.id, role: 'industry' },
    ],
  });
  console.log('✅ Created user roles');

  // Create email verifications (mark all as verified for test accounts)
  console.log('Creating email verifications...');
  const now = new Date();
  await prisma.emailVerification.createMany({
    data: [
      { userId: staff.id, tokenHash: 'verified', expiresAt: now, verifiedAt: now },
      { userId: student1.id, tokenHash: 'verified', expiresAt: now, verifiedAt: now },
      { userId: student2.id, tokenHash: 'verified', expiresAt: now, verifiedAt: now },
      { userId: faculty.id, tokenHash: 'verified', expiresAt: now, verifiedAt: now },
      { userId: industry1.id, tokenHash: 'verified', expiresAt: now, verifiedAt: now },
    ],
  });
  console.log('✅ Created email verifications');

  // Generate QR codes for users
  console.log('Generating QR codes...');

  await prisma.qrCode.createMany({
    data: [
      { userId: staff.id, qrCodeData: `QR-ADMIN-${Date.now()}` },
      { userId: student1.id, qrCodeData: `QR-STU1-${Date.now()}` },
      { userId: student2.id, qrCodeData: `QR-STU2-${Date.now()}` },
      { userId: faculty.id, qrCodeData: `QR-FAC1-${Date.now()}` },
      { userId: industry1.id, qrCodeData: `QR-IND1-${Date.now()}` },
    ],
  });

  console.log('✅ Generated QR codes');

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
      },
    }),
    prisma.project.create({
      data: {
        title: 'AI-Powered Threat Detection',
        description: 'Machine learning models for real-time threat detection in naval operations.',
        piId: student1.id,
        stage: 'prototype',
        keywords: ['ai', 'ml', 'threat-detection'],
      },
    }),
    prisma.project.create({
      data: {
        title: 'Swarm Robotics for Maritime Surveillance',
        description: 'Coordinated autonomous surface vehicles for wide-area maritime surveillance.',
        piId: student2.id,
        stage: 'pilot_ready',
        keywords: ['swarm', 'robotics', 'surveillance'],
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
      },
    }),
  ]);

  console.log('✅ Created 2 industry opportunities');

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
