import Anthropic from '@anthropic-ai/sdk';
import prisma from '../config/database';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface Recommendation {
  id: string;
  type: 'session' | 'opportunity' | 'project' | 'industry_partner';
  title: string;
  description: string;
  reason: string;
  relevanceScore: number;
  tags: string[];
}

interface UserContext {
  interests: string[];
  organization: string | null;
  role: string | null;
  department: string | null;
  attendedSessions: string[];
}

interface AvailableContent {
  sessions: any[];
  opportunities: any[];
  projects: any[];
  industryPartners: any[];
}

/**
 * Get personalized recommendations for a user using Claude AI
 */
export async function getPersonalizedRecommendations(
  userId: string,
  type?: 'session' | 'opportunity' | 'project' | 'industry_partner'
): Promise<Recommendation[]> {
  // Fetch user profile
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Fetch user's RSVP history
  const rsvps = await prisma.rsvp.findMany({
    where: { userId },
    include: {
      session: {
        select: { title: true, description: true },
      },
    },
    take: 10,
  });

  // Fetch available content based on type filter
  const now = new Date();

  // Fetch sessions (upcoming only)
  const sessions = (!type || type === 'session') ? await prisma.session.findMany({
    where: {
      startTime: { gte: now },
    },
    orderBy: { startTime: 'asc' },
    take: 20,
  }) : [];

  // Fetch opportunities
  const opportunities = (!type || type === 'opportunity') ? await prisma.opportunity.findMany({
    where: { status: 'active' },
    take: 20,
  }) : [];

  // Fetch projects
  const projects = (!type || type === 'project') ? await prisma.project.findMany({
    take: 20,
  }) : [];

  // Fetch industry partners
  const partners = (!type || type === 'industry_partner') ? await prisma.partner.findMany({
    take: 20,
  }) : [];

  // Build context for AI
  const userContext: UserContext = {
    interests: profile.accelerationInterests || [],
    organization: profile.organization,
    role: profile.role,
    department: profile.department,
    attendedSessions: rsvps.map(r => r.session?.title).filter(Boolean) as string[],
  };

  const availableContent: AvailableContent = {
    sessions: sessions.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      speaker: s.speaker,
      sessionType: s.sessionType,
    })),
    opportunities: opportunities.map(o => ({
      id: o.id,
      title: o.title,
      description: o.description,
      type: o.type,
      sponsorOrganization: o.sponsorOrganization,
    })),
    projects: projects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      researchAreas: p.researchAreas,
      seeking: p.seeking,
      keywords: p.keywords,
    })),
    industryPartners: partners.map(ip => ({
      id: ip.id,
      name: ip.name,
      description: ip.description,
      researchAreas: ip.researchAreas,
      partnershipType: ip.partnershipType,
    })),
  };

  // Generate recommendations using Claude
  const recommendations = await generateAIRecommendations(userContext, availableContent, type);

  return recommendations;
}

/**
 * Generate AI-powered recommendations using Claude
 */
async function generateAIRecommendations(
  userContext: UserContext,
  availableContent: AvailableContent,
  type?: string
): Promise<Recommendation[]> {
  const typeLabel = type ? `${type.replace('_', ' ')}s` : 'sessions, research opportunities, projects, and industry partners';

  const systemPrompt = `You are an intelligent recommendation system for a technology accelerator event.
Analyze the user's profile and participation history to recommend the most relevant ${typeLabel}.
Consider:
- User's research interests and professional background
- Past session attendance patterns
- Alignment with their organization and role
- Potential for collaboration and learning

Provide ${type ? '3-5' : '5-10'} diverse recommendations${type ? '' : ' across different types (sessions, opportunities, projects, industry_partner)'}.
Each recommendation should have a clear, compelling reason explaining why it's relevant to this specific user.

You MUST respond with ONLY a valid JSON object in this exact format, with no additional text before or after:
{
  "recommendations": [
    {
      "id": "the-exact-id-from-available-content",
      "type": "session" | "opportunity" | "project" | "industry_partner",
      "title": "title from the content",
      "description": "brief description",
      "reason": "personalized explanation of why this is recommended for this user",
      "relevanceScore": 1-10,
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

  let contentString = '';
  if (!type || type === 'session') {
    contentString += `Sessions: ${JSON.stringify(availableContent.sessions)}\n`;
  }
  if (!type || type === 'opportunity') {
    contentString += `Opportunities: ${JSON.stringify(availableContent.opportunities)}\n`;
  }
  if (!type || type === 'project') {
    contentString += `Projects: ${JSON.stringify(availableContent.projects)}\n`;
  }
  if (!type || type === 'industry_partner') {
    contentString += `Industry Partners: ${JSON.stringify(availableContent.industryPartners)}\n`;
  }

  const userPrompt = `User Profile:
Interests: ${userContext.interests.join(', ') || 'Not specified'}
Organization: ${userContext.organization || 'Not specified'}
Role: ${userContext.role || 'Not specified'}
Department: ${userContext.department || 'Not specified'}
Previously Attended: ${userContext.attendedSessions.join(', ') || 'None'}

Available Content:
${contentString}

Generate personalized recommendations. Remember to respond with ONLY the JSON object, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: systemPrompt + '\n\n' + userPrompt,
        },
      ],
    });

    // Extract text content from response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in AI response');
      return [];
    }

    // Parse the JSON response
    const responseText = textContent.text.trim();

    // Try to extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    let recommendations: Recommendation[] = parsed.recommendations || [];

    // Filter by type if specified
    if (type) {
      recommendations = recommendations.filter(r => r.type === type);
    }

    // Sort by relevance score
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return recommendations;
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    // Return empty array on error - let frontend handle gracefully
    return [];
  }
}

/**
 * Get connection recommendations (non-AI, rule-based)
 * This matches the Loveable-Converge client-side algorithm
 */
export async function getConnectionRecommendations(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  // Fetch current user's profile
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      connectionsAsUser: {
        select: { connectedUserId: true },
      },
      connectionsAsTarget: {
        select: { userId: true },
      },
    },
  });

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Get set of already connected user IDs
  const connectedUserIds = new Set([
    ...profile.connectionsAsUser.map(c => c.connectedUserId),
    ...profile.connectionsAsTarget.map(c => c.userId),
  ]);

  // Fetch potential connections (exclude self and already connected)
  const potentialConnections = await prisma.profile.findMany({
    where: {
      id: {
        notIn: [userId, ...Array.from(connectedUserIds)],
      },
      profileVisibility: 'public',
      allowQrScanning: true,
    },
    take: 50,
  });

  // Get all connections for mutual connection calculation
  const allConnections = await prisma.connection.findMany({
    select: {
      userId: true,
      connectedUserId: true,
    },
  });

  // Score each potential connection
  const scored = potentialConnections.map(otherProfile => {
    let score = 0;
    const sharedInterests: string[] = [];

    // Calculate shared interests (5 points per shared interest)
    const userInterests = profile.accelerationInterests || [];
    const otherInterests = otherProfile.accelerationInterests || [];

    userInterests.forEach(interest => {
      if (otherInterests.includes(interest)) {
        sharedInterests.push(interest);
        score += 5;
      }
    });

    // Calculate mutual connections (3 points per mutual)
    const userConnections = new Set(
      allConnections
        .filter(c => c.userId === userId)
        .map(c => c.connectedUserId)
    );

    const otherConnections = new Set(
      allConnections
        .filter(c => c.userId === otherProfile.id)
        .map(c => c.connectedUserId)
    );

    const mutualConnections = [...userConnections].filter(id =>
      otherConnections.has(id)
    ).length;

    score += mutualConnections * 3;

    // Same organization bonus (2 points)
    const sameOrganization = profile.organization &&
      profile.organization === otherProfile.organization;
    if (sameOrganization) {
      score += 2;
    }

    return {
      id: otherProfile.id,
      fullName: otherProfile.fullName,
      role: otherProfile.role || 'Attendee',
      organization: otherProfile.organization || 'Unknown',
      accelerationInterests: otherProfile.accelerationInterests || [],
      score,
      sharedInterests,
      mutualConnections,
      sameOrganization: sameOrganization || false,
    };
  });

  // Filter to only users with some connection score, sort by score, limit
  return scored
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
