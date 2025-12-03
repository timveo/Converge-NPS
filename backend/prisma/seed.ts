import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (development only!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Clearing existing data...');
    await prisma.opportunityApplications.deleteMany();
    await prisma.projectInterests.deleteMany();
    await prisma.messages.deleteMany();
    await prisma.conversations.deleteMany();
    await prisma.rsvps.deleteMany();
    await prisma.connections.deleteMany();
    await prisma.qrCodes.deleteMany();
    await prisma.sessions.deleteMany();
    await prisma.industryOpportunities.deleteMany();
    await prisma.researchProjects.deleteMany();
    await prisma.profiles.deleteMany();
  }

  // Create test users
  console.log('Creating test users...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.profiles.create({
    data: {
      id: 'admin-001',
      fullName: 'Admin User',
      email: 'admin@converge-nps.com',
      passwordHash,
      role: 'admin',
      organization: 'Naval Postgraduate School',
      bio: 'System administrator and event organizer',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const student1 = await prisma.profiles.create({
    data: {
      id: 'student-001',
      fullName: 'Alice Johnson',
      email: 'alice@nps.edu',
      passwordHash,
      role: 'student',
      organization: 'Naval Postgraduate School',
      bio: 'PhD candidate specializing in AI/ML',
      linkedin: 'https://linkedin.com/in/alicejohnson',
      github: 'https://github.com/alicejohnson',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const student2 = await prisma.profiles.create({
    data: {
      id: 'student-002',
      fullName: 'Bob Smith',
      email: 'bob@nps.edu',
      passwordHash,
      role: 'student',
      organization: 'Naval Postgraduate School',
      bio: 'Master\'s student focused on cybersecurity',
      linkedin: 'https://linkedin.com/in/bobsmith',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const faculty = await prisma.profiles.create({
    data: {
      id: 'faculty-001',
      fullName: 'Dr. Carol Williams',
      email: 'carol@nps.edu',
      passwordHash,
      role: 'faculty',
      organization: 'Naval Postgraduate School',
      bio: 'Professor of Computer Science, AI researcher',
      linkedin: 'https://linkedin.com/in/carolwilliams',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  const industry1 = await prisma.profiles.create({
    data: {
      id: 'industry-001',
      fullName: 'David Chen',
      email: 'david@techcorp.com',
      passwordHash,
      role: 'industry',
      organization: 'TechCorp Solutions',
      bio: 'VP of Engineering, interested in defense tech partnerships',
      linkedin: 'https://linkedin.com/in/davidchen',
      profileVisibility: 'public',
      allowQrScanning: true,
      allowMessaging: true,
    },
  });

  console.log('✅ Created 5 test users');

  // Generate QR codes for users
  console.log('Generating QR codes...');

  await prisma.qrCodes.createMany({
    data: [
      { userId: admin.id, code: `QR-ADMIN-${Date.now()}` },
      { userId: student1.id, code: `QR-STU1-${Date.now()}` },
      { userId: student2.id, code: `QR-STU2-${Date.now()}` },
      { userId: faculty.id, code: `QR-FAC1-${Date.now()}` },
      { userId: industry1.id, code: `QR-IND1-${Date.now()}` },
    ],
  });

  console.log('✅ Generated QR codes');

  // Create sessions
  console.log('Creating event sessions...');

  const eventDate = new Date('2026-01-28T09:00:00Z');

  const sessions = await Promise.all([
    prisma.sessions.create({
      data: {
        title: 'Opening Keynote: The Future of Defense Technology',
        description: 'Join us for an inspiring keynote address on emerging defense technologies and their impact on national security.',
        speaker: 'Admiral James Rodriguez',
        startTime: new Date('2026-01-28T09:00:00Z'),
        endTime: new Date('2026-01-28T10:00:00Z'),
        location: 'Main Auditorium',
        track: 'Other',
        capacity: 500,
        status: 'scheduled',
      },
    }),
    prisma.sessions.create({
      data: {
        title: 'AI/ML in Autonomous Systems',
        description: 'Exploring the latest advances in AI and machine learning for autonomous military systems.',
        speaker: 'Dr. Sarah Martinez',
        startTime: new Date('2026-01-28T10:30:00Z'),
        endTime: new Date('2026-01-28T11:30:00Z'),
        location: 'Room 101',
        track: 'AI/ML',
        capacity: 50,
        status: 'scheduled',
      },
    }),
    prisma.sessions.create({
      data: {
        title: 'Cybersecurity Threats and Mitigation',
        description: 'A deep dive into current cybersecurity threats facing defense systems and mitigation strategies.',
        speaker: 'Colonel Mike Thompson',
        startTime: new Date('2026-01-28T10:30:00Z'),
        endTime: new Date('2026-01-28T11:30:00Z'),
        location: 'Room 102',
        track: 'Cybersecurity',
        capacity: 40,
        status: 'scheduled',
      },
    }),
    prisma.sessions.create({
      data: {
        title: 'Data Science for Maritime Operations',
        description: 'Leveraging data science and analytics to enhance maritime operational effectiveness.',
        speaker: 'Dr. Lisa Wang',
        startTime: new Date('2026-01-28T13:00:00Z'),
        endTime: new Date('2026-01-28T14:00:00Z'),
        location: 'Room 103',
        track: 'Data Science',
        capacity: 45,
        status: 'scheduled',
      },
    }),
    prisma.sessions.create({
      data: {
        title: 'Autonomous Underwater Vehicles',
        description: 'The latest developments in autonomous underwater vehicle technology and applications.',
        speaker: 'Dr. Robert Kim',
        startTime: new Date('2026-01-28T14:30:00Z'),
        endTime: new Date('2026-01-28T15:30:00Z'),
        location: 'Room 101',
        track: 'Autonomous Systems',
        capacity: 35,
        status: 'scheduled',
      },
    }),
    prisma.sessions.create({
      data: {
        title: 'Networking Reception',
        description: 'Join fellow attendees, speakers, and industry partners for networking and refreshments.',
        speaker: 'Event Staff',
        startTime: new Date('2026-01-28T17:00:00Z'),
        endTime: new Date('2026-01-28T19:00:00Z'),
        location: 'Terrace',
        track: 'Other',
        capacity: 200,
        status: 'scheduled',
      },
    }),
  ]);

  console.log('✅ Created 6 event sessions');

  // Create RSVPs
  console.log('Creating RSVPs...');

  await prisma.rsvps.createMany({
    data: [
      { userId: student1.id, sessionId: sessions[0].id, status: 'attending' },
      { userId: student1.id, sessionId: sessions[1].id, status: 'attending' },
      { userId: student1.id, sessionId: sessions[5].id, status: 'maybe' },
      { userId: student2.id, sessionId: sessions[0].id, status: 'attending' },
      { userId: student2.id, sessionId: sessions[2].id, status: 'attending' },
      { userId: faculty.id, sessionId: sessions[0].id, status: 'attending' },
      { userId: faculty.id, sessionId: sessions[1].id, status: 'attending' },
      { userId: industry1.id, sessionId: sessions[0].id, status: 'attending' },
      { userId: industry1.id, sessionId: sessions[3].id, status: 'attending' },
    ],
  });

  console.log('✅ Created 9 RSVPs');

  // Create research projects
  console.log('Creating research projects...');

  const projects = await Promise.all([
    prisma.researchProjects.create({
      data: {
        title: 'Quantum Computing for Cryptography',
        description: 'Exploring quantum computing applications in military cryptography systems.',
        submittedBy: faculty.id,
        category: 'Cybersecurity',
        status: 'active',
        tags: ['quantum', 'cryptography', 'security'],
      },
    }),
    prisma.researchProjects.create({
      data: {
        title: 'AI-Powered Threat Detection',
        description: 'Machine learning models for real-time threat detection in naval operations.',
        submittedBy: student1.id,
        category: 'AI/ML',
        status: 'proposed',
        tags: ['ai', 'ml', 'threat-detection'],
      },
    }),
    prisma.researchProjects.create({
      data: {
        title: 'Swarm Robotics for Maritime Surveillance',
        description: 'Coordinated autonomous surface vehicles for wide-area maritime surveillance.',
        submittedBy: student2.id,
        category: 'Autonomous Systems',
        status: 'active',
        tags: ['swarm', 'robotics', 'surveillance'],
      },
    }),
  ]);

  console.log('✅ Created 3 research projects');

  // Create project interests
  await prisma.projectInterests.createMany({
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
    prisma.industryOpportunities.create({
      data: {
        title: 'Software Engineer - Defense Systems',
        description: 'Join our team building next-generation defense software systems.',
        postedBy: industry1.id,
        companyName: 'TechCorp Solutions',
        type: 'full_time',
        category: 'AI/ML',
        status: 'open',
        location: 'San Diego, CA',
        salary: '$120,000 - $150,000',
      },
    }),
    prisma.industryOpportunities.create({
      data: {
        title: 'Summer Internship - Cybersecurity Research',
        description: 'Hands-on cybersecurity research internship for graduate students.',
        postedBy: industry1.id,
        companyName: 'TechCorp Solutions',
        type: 'internship',
        category: 'Cybersecurity',
        status: 'open',
        location: 'Remote',
        salary: '$8,000/month',
      },
    }),
  ]);

  console.log('✅ Created 2 industry opportunities');

  // Create connections
  console.log('Creating connections...');

  await prisma.connections.createMany({
    data: [
      { scannerId: student1.id, scannedId: student2.id, method: 'qr_scan' },
      { scannerId: student1.id, scannedId: faculty.id, method: 'qr_scan' },
      { scannerId: student2.id, scannedId: industry1.id, method: 'manual_entry' },
      { scannerId: faculty.id, scannedId: industry1.id, method: 'qr_scan' },
    ],
  });

  console.log('✅ Created 4 connections');

  // Create conversations and messages
  console.log('Creating conversations and messages...');

  const conversation1 = await prisma.conversations.create({
    data: {
      user1Id: student1.id,
      user2Id: student2.id,
    },
  });

  const conversation2 = await prisma.conversations.create({
    data: {
      user1Id: student1.id,
      user2Id: faculty.id,
    },
  });

  await prisma.messages.createMany({
    data: [
      {
        conversationId: conversation1.id,
        senderId: student1.id,
        content: 'Hey Bob! Great to meet you at the conference.',
        status: 'read',
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        conversationId: conversation1.id,
        senderId: student2.id,
        content: 'Likewise! Your research on AI sounds fascinating.',
        status: 'read',
        createdAt: new Date(Date.now() - 3000000),
      },
      {
        conversationId: conversation1.id,
        senderId: student1.id,
        content: 'Thanks! Would love to collaborate sometime.',
        status: 'delivered',
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        conversationId: conversation2.id,
        senderId: student1.id,
        content: 'Dr. Williams, I\'d like to discuss your keynote session.',
        status: 'sent',
        createdAt: new Date(Date.now() - 600000),
      },
    ],
  });

  // Update conversation lastMessageAt
  await prisma.conversations.update({
    where: { id: conversation1.id },
    data: { lastMessageAt: new Date(Date.now() - 1800000) },
  });

  await prisma.conversations.update({
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
