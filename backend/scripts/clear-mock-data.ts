import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearMockData() {
  console.log('🗑️  Starting to clear mock data...\n');

  try {
    // Clear data in correct order (respecting foreign key constraints)
    console.log('Deleting OpportunityApplications...');
    await prisma.opportunityApplications.deleteMany();

    console.log('Deleting ProjectInterests...');
    await prisma.projectInterests.deleteMany();

    console.log('Deleting Messages...');
    await prisma.messages.deleteMany();

    console.log('Deleting Conversations...');
    await prisma.conversations.deleteMany();

    // CheckIn model removed - check-in data now stored on Profile

    console.log('Deleting RSVPs...');
    await prisma.rsvps.deleteMany();

    console.log('Deleting Connections...');
    await prisma.connections.deleteMany();

    console.log('Deleting QR Codes...');
    await prisma.qrCodes.deleteMany();

    console.log('Deleting Sessions...');
    await prisma.sessions.deleteMany();

    console.log('Deleting Industry Opportunities...');
    await prisma.industryOpportunities.deleteMany();

    console.log('Deleting Research Projects...');
    await prisma.researchProjects.deleteMany();

    console.log('Deleting Profiles (keeping admin if email matches admin@converge-nps.com)...');
    // Delete all profiles except system admin
    const result = await prisma.profiles.deleteMany({
      where: {
        email: {
          not: 'admin@converge-nps.com'
        }
      }
    });
    console.log(`Deleted ${result.count} user profiles`);

    console.log('\n✅ Mock data cleared successfully!');
    console.log('\n📊 Remaining data:');

    const counts = await Promise.all([
      prisma.profiles.count(),
      prisma.sessions.count(),
      prisma.researchProjects.count(),
      prisma.industryOpportunities.count(),
      prisma.connections.count(),
    ]);

    console.log(`- Users: ${counts[0]}`);
    console.log(`- Sessions: ${counts[1]}`);
    console.log(`- Projects: ${counts[2]}`);
    console.log(`- Opportunities: ${counts[3]}`);
    console.log(`- Connections: ${counts[4]}`);

    console.log('\n✨ Database is now ready for Smartsheet import!');
  } catch (error) {
    console.error('❌ Error clearing mock data:', error);
    throw error;
  }
}

clearMockData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
