# Week 5-6 Backend Implementation Guide

**Goal:** Implement the remaining 27 API endpoints + WebSocket server

**Current Status:** 25/52 endpoints complete (Auth, Profiles, Connections)

**Remaining:** 27 endpoints across 4 feature areas

---

## Overview

### What to Build

1. **Sessions & RSVPs** (10 endpoints) - Event schedule management
2. **Research Projects & Opportunities** (6 endpoints) - Discovery features
3. **Messaging** (5 endpoints + WebSocket) - Real-time chat
4. **Admin Features** (7 endpoints) - User management, analytics

### Prerequisites

- Backend server running (`npm run dev`)
- PostgreSQL + Redis running (`docker-compose up -d`)
- 25 existing endpoints working

---

## Part 1: Sessions & RSVPs (10 endpoints)

### Step 1.1: Create Session Routes

Create `backend/src/routes/session.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sessionController from '../controllers/session.controller';

const router = Router();

// Public routes
router.get('/', sessionController.listSessions);
router.get('/:id', sessionController.getSession);

// Protected routes
router.use(authenticate);
router.post('/:id/rsvp', sessionController.createRSVP);
router.patch('/rsvps/:id', sessionController.updateRSVP);
router.delete('/rsvps/:id', sessionController.deleteRSVP);
router.get('/rsvps/me', sessionController.getMyRSVPs);
router.get('/my-schedule', sessionController.getMySchedule);
router.get('/conflicts', sessionController.checkConflicts);

// Staff/Admin only
router.post('/:id/check-in', sessionController.checkInAttendee);
router.get('/:id/rsvps', sessionController.getSessionRSVPs);

export default router;
```

### Step 1.2: Create Session Service

Create `backend/src/services/session.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listSessions(filters: {
  day?: string;
  type?: string;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { day, type, featured, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (day) {
    where.startTime = {
      gte: new Date(day + 'T00:00:00Z'),
      lt: new Date(day + 'T23:59:59Z')
    };
  }

  if (type && type !== 'all') {
    where.type = type;
  }

  if (featured !== undefined) {
    where.featured = featured;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { speakers: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [sessions, total] = await Promise.all([
    prisma.sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' },
      include: {
        _count: {
          select: { rsvps: true }
        }
      }
    }),
    prisma.sessions.count({ where })
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getSession(sessionId: string, userId?: string) {
  const session = await prisma.sessions.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { rsvps: true }
      }
    }
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Check if user has RSVP'd
  let myRsvp = null;
  if (userId) {
    myRsvp = await prisma.rsvps.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId
        }
      }
    });
  }

  return {
    ...session,
    myRsvpStatus: myRsvp?.status || null,
    rsvpCount: session._count.rsvps
  };
}

export async function createRSVP(userId: string, sessionId: string, status: 'attending' | 'interested') {
  // Check capacity
  const session = await prisma.sessions.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { rsvps: { where: { status: 'attending' } } }
      }
    }
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const attendingCount = session._count.rsvps;

  if (status === 'attending' && session.capacity && attendingCount >= session.capacity) {
    throw new Error('Session is at capacity');
  }

  // Check for conflicts
  const conflicts = await checkRSVPConflicts(userId, session.startTime, session.endTime);

  if (conflicts.length > 0) {
    // Return conflict warning but allow creation
    // Frontend will show confirmation dialog
  }

  // Create or update RSVP
  const rsvp = await prisma.rsvps.upsert({
    where: {
      userId_sessionId: {
        userId,
        sessionId
      }
    },
    create: {
      userId,
      sessionId,
      status
    },
    update: {
      status
    }
  });

  return rsvp;
}

export async function updateRSVP(rsvpId: string, userId: string, status: 'attending' | 'interested') {
  const rsvp = await prisma.rsvps.findUnique({
    where: { id: rsvpId }
  });

  if (!rsvp || rsvp.userId !== userId) {
    throw new Error('RSVP not found');
  }

  return prisma.rsvps.update({
    where: { id: rsvpId },
    data: { status }
  });
}

export async function deleteRSVP(rsvpId: string, userId: string) {
  const rsvp = await prisma.rsvps.findUnique({
    where: { id: rsvpId }
  });

  if (!rsvp || rsvp.userId !== userId) {
    throw new Error('RSVP not found');
  }

  await prisma.rsvps.delete({
    where: { id: rsvpId }
  });

  return { success: true };
}

export async function getMyRSVPs(userId: string) {
  return prisma.rsvps.findMany({
    where: { userId },
    include: {
      session: true
    },
    orderBy: {
      session: {
        startTime: 'asc'
      }
    }
  });
}

export async function getMySchedule(userId: string) {
  const rsvps = await prisma.rsvps.findMany({
    where: {
      userId,
      status: 'attending'
    },
    include: {
      session: true
    },
    orderBy: {
      session: {
        startTime: 'asc'
      }
    }
  });

  // Group by day
  const schedule: Record<string, any[]> = {};

  rsvps.forEach(rsvp => {
    const day = rsvp.session.startTime.toISOString().split('T')[0];
    if (!schedule[day]) {
      schedule[day] = [];
    }
    schedule[day].push(rsvp.session);
  });

  return schedule;
}

export async function checkRSVPConflicts(userId: string, startTime: Date, endTime: Date) {
  const conflicts = await prisma.rsvps.findMany({
    where: {
      userId,
      status: 'attending',
      session: {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
      }
    },
    include: {
      session: true
    }
  });

  return conflicts.map(c => c.session);
}

export async function checkInAttendee(sessionId: string, userId: string, staffId: string) {
  // Verify staff has permission
  const staff = await prisma.profiles.findUnique({
    where: { id: staffId },
    include: { user_roles: true }
  });

  const hasPermission = staff?.user_roles.some(ur =>
    ['staff', 'admin'].includes(ur.role)
  );

  if (!hasPermission) {
    throw new Error('Insufficient permissions');
  }

  // Create check-in record
  const checkIn = await prisma.checkIns.create({
    data: {
      sessionId,
      userId,
      checkedInBy: staffId
    }
  });

  return checkIn;
}

export async function getSessionRSVPs(sessionId: string, userId: string) {
  // Verify admin/staff
  const user = await prisma.profiles.findUnique({
    where: { id: userId },
    include: { user_roles: true }
  });

  const hasPermission = user?.user_roles.some(ur =>
    ['staff', 'admin'].includes(ur.role)
  );

  if (!hasPermission) {
    throw new Error('Insufficient permissions');
  }

  return prisma.rsvps.findMany({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: true
        }
      }
    }
  });
}
```

### Step 1.3: Create Session Controller

Create `backend/src/controllers/session.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';

export async function listSessions(req: Request, res: Response) {
  try {
    const filters = {
      day: req.query.day as string,
      type: req.query.type as string,
      featured: req.query.featured === 'true',
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await sessionService.listSessions(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSession(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const session = await sessionService.getSession(req.params.id, userId);
    res.json(session);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

export async function createRSVP(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { sessionId, status } = req.body;

    const rsvp = await sessionService.createRSVP(userId, sessionId, status);
    res.status(201).json(rsvp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function updateRSVP(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { status } = req.body;

    const rsvp = await sessionService.updateRSVP(req.params.id, userId, status);
    res.json(rsvp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function deleteRSVP(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const result = await sessionService.deleteRSVP(req.params.id, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getMyRSVPs(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const rsvps = await sessionService.getMyRSVPs(userId);
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMySchedule(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const schedule = await sessionService.getMySchedule(userId);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function checkConflicts(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { startTime, endTime } = req.query;

    const conflicts = await sessionService.checkRSVPConflicts(
      userId,
      new Date(startTime as string),
      new Date(endTime as string)
    );

    res.json({ conflicts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function checkInAttendee(req: Request, res: Response) {
  try {
    const staffId = req.user!.userId;
    const { userId } = req.body;

    const checkIn = await sessionService.checkInAttendee(
      req.params.id,
      userId,
      staffId
    );

    res.status(201).json(checkIn);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
}

export async function getSessionRSVPs(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const rsvps = await sessionService.getSessionRSVPs(req.params.id, userId);
    res.json(rsvps);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
}
```

### Step 1.4: Add Validation Schemas

Add to `backend/src/types/schemas.ts`:

```typescript
import { z } from 'zod';

export const CreateRSVPSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['attending', 'interested'])
});

export const UpdateRSVPSchema = z.object({
  status: z.enum(['attending', 'interested'])
});

export const SessionFiltersSchema = z.object({
  day: z.string().optional(),
  type: z.string().optional(),
  featured: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().positive().optional(),
  limit: z.number().positive().max(100).optional()
});
```

### Step 1.5: Register Routes

Update `backend/src/app.ts`:

```typescript
import sessionRoutes from './routes/session.routes';

// Add this line with other routes
app.use('/api/v1/sessions', sessionRoutes);
```

---

## Part 2: Research Projects & Opportunities (6 endpoints)

### Step 2.1: Create Project Routes

Create `backend/src/routes/project.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as projectController from '../controllers/project.controller';

const router = Router();

// Public routes
router.get('/projects', projectController.listProjects);
router.get('/projects/:id', projectController.getProject);
router.get('/opportunities', projectController.listOpportunities);
router.get('/opportunities/:id', projectController.getOpportunity);

// Protected routes
router.use(authenticate);
router.post('/projects/:id/interest', projectController.expressProjectInterest);
router.post('/opportunities/:id/interest', projectController.expressOpportunityInterest);

export default router;
```

### Step 2.2: Create Project Service

Create `backend/src/services/project.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listProjects(filters: {
  department?: string;
  stage?: string;
  researchArea?: string;
  classification?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { department, stage, researchArea, classification, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (department) where.department = department;
  if (stage) where.stage = stage;
  if (classification) where.classification = classification;
  if (researchArea) {
    where.researchAreas = {
      has: researchArea
    };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { keywords: { hasSome: [search] } }
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.projects.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.projects.count({ where })
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getProject(projectId: string, userId?: string) {
  const project = await prisma.projects.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Check if user has bookmarked or expressed interest
  let hasBookmarked = false;
  let hasInterest = false;

  if (userId) {
    [hasBookmarked, hasInterest] = await Promise.all([
      prisma.projectBookmarks.findUnique({
        where: {
          userId_projectId: { userId, projectId }
        }
      }).then(b => !!b),
      prisma.projectInterests.findUnique({
        where: {
          userId_projectId: { userId, projectId }
        }
      }).then(i => !!i)
    ]);
  }

  return {
    ...project,
    hasBookmarked,
    hasInterest
  };
}

export async function expressProjectInterest(userId: string, projectId: string) {
  // Check rate limit (10/day handled by database trigger)

  const interest = await prisma.projectInterests.create({
    data: {
      userId,
      projectId
    }
  });

  return interest;
}

export async function listOpportunities(filters: {
  type?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { type, department, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (type) where.type = type;
  if (department) where.department = department;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [opportunities, total] = await Promise.all([
    prisma.opportunities.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.opportunities.count({ where })
  ]);

  return {
    opportunities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getOpportunity(opportunityId: string, userId?: string) {
  const opportunity = await prisma.opportunities.findUnique({
    where: { id: opportunityId }
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  let hasInterest = false;
  if (userId) {
    hasInterest = await prisma.opportunityInterests.findUnique({
      where: {
        userId_opportunityId: { userId, opportunityId }
      }
    }).then(i => !!i);
  }

  return {
    ...opportunity,
    hasInterest
  };
}

export async function expressOpportunityInterest(userId: string, opportunityId: string) {
  const interest = await prisma.opportunityInterests.create({
    data: {
      userId,
      opportunityId
    }
  });

  return interest;
}
```

### Step 2.3: Create Project Controller

Create `backend/src/controllers/project.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as projectService from '../services/project.service';

export async function listProjects(req: Request, res: Response) {
  try {
    const filters = {
      department: req.query.department as string,
      stage: req.query.stage as string,
      researchArea: req.query.researchArea as string,
      classification: req.query.classification as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await projectService.listProjects(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const project = await projectService.getProject(req.params.id, userId);
    res.json(project);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

export async function expressProjectInterest(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const interest = await projectService.expressProjectInterest(userId, req.params.id);
    res.status(201).json(interest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function listOpportunities(req: Request, res: Response) {
  try {
    const filters = {
      type: req.query.type as string,
      department: req.query.department as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await projectService.listOpportunities(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getOpportunity(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const opportunity = await projectService.getOpportunity(req.params.id, userId);
    res.json(opportunity);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

export async function expressOpportunityInterest(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const interest = await projectService.expressOpportunityInterest(userId, req.params.id);
    res.status(201).json(interest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Step 2.4: Register Routes

Update `backend/src/app.ts`:

```typescript
import projectRoutes from './routes/project.routes';

app.use('/api/v1', projectRoutes);
```

---

## Part 3: Messaging + WebSocket (5 endpoints + Socket.IO)

### Step 3.1: Install Socket.IO

```bash
cd backend
npm install socket.io
npm install -D @types/socket.io
```

### Step 3.2: Create Message Routes

Create `backend/src/routes/message.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as messageController from '../controllers/message.controller';

const router = Router();

router.use(authenticate);

router.get('/conversations', messageController.listConversations);
router.get('/conversations/:id', messageController.getConversation);
router.post('/conversations', messageController.createConversation);
router.post('/messages', messageController.sendMessage);
router.patch('/messages/:id/read', messageController.markAsRead);

export default router;
```

### Step 3.3: Create WebSocket Server

Create `backend/src/sockets/index.ts`:

```typescript
import { Server } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function initializeSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected via WebSocket`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      // Verify user is participant
      const participant = await prisma.conversationParticipants.findUnique({
        where: {
          userId_conversationId: {
            userId,
            conversationId
          }
        }
      });

      if (participant) {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send message (alternative to REST API)
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content } = data;

        // Verify participant
        const participant = await prisma.conversationParticipants.findUnique({
          where: {
            userId_conversationId: {
              userId,
              conversationId
            }
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not a participant' });
          return;
        }

        // Create message
        const message = await prisma.messages.create({
          data: {
            conversationId,
            senderId: userId,
            content
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        });

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', message);

        // Update conversation lastMessageAt
        await prisma.conversations.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() }
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      });
    });

    // Stop typing indicator
    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId
      });
    });

    // Mark message as read
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;

        await prisma.messageReadReceipts.create({
          data: {
            messageId,
            userId
          }
        });

        // Notify sender
        const message = await prisma.messages.findUnique({
          where: { id: messageId }
        });

        if (message) {
          io.to(`user:${message.senderId}`).emit('message_read', {
            messageId,
            readBy: userId
          });
        }
      } catch (error) {
        // Already read or doesn't exist
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
    });
  });

  return io;
}
```

### Step 3.4: Update Server

Update `backend/src/server.ts`:

```typescript
import http from 'http';
import app from './app';
import { initializeSocketServer } from './sockets';

const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketServer(httpServer);

// Start server
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### Step 3.5: Create Message Service

Create `backend/src/services/message.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listConversations(userId: string) {
  const conversations = await prisma.conversationParticipants.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            where: {
              userId: { not: userId }
            },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: {
      conversation: {
        lastMessageAt: 'desc'
      }
    }
  });

  return conversations.map(cp => ({
    ...cp.conversation,
    otherUser: cp.conversation.participants[0]?.user,
    lastMessage: cp.conversation.messages[0]
  }));
}

export async function getConversation(conversationId: string, userId: string) {
  // Verify participant
  const participant = await prisma.conversationParticipants.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId
      }
    }
  });

  if (!participant) {
    throw new Error('Not a participant in this conversation');
  }

  const conversation = await prisma.conversations.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          }
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          },
          readReceipts: true
        }
      }
    }
  });

  return conversation;
}

export async function createConversation(userId: string, otherUserId: string) {
  // Check if conversation already exists
  const existing = await prisma.$queryRaw`
    SELECT c.id FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ${userId}
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ${otherUserId}
  ` as any[];

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new conversation
  const conversation = await prisma.conversations.create({
    data: {
      participants: {
        create: [
          { userId },
          { userId: otherUserId }
        ]
      }
    }
  });

  return conversation.id;
}

export async function sendMessage(userId: string, conversationId: string, content: string) {
  // Verify participant
  const participant = await prisma.conversationParticipants.findUnique({
    where: {
      userId_conversationId: {
        userId,
        conversationId
      }
    }
  });

  if (!participant) {
    throw new Error('Not a participant in this conversation');
  }

  // Check rate limit (40/day handled by database trigger)

  const message = await prisma.messages.create({
    data: {
      conversationId,
      senderId: userId,
      content
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true
        }
      }
    }
  });

  // Update conversation
  await prisma.conversations.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() }
  });

  return message;
}

export async function markAsRead(messageId: string, userId: string) {
  await prisma.messageReadReceipts.create({
    data: {
      messageId,
      userId
    }
  });

  return { success: true };
}
```

### Step 3.6: Create Message Controller

Create `backend/src/controllers/message.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as messageService from '../services/message.service';

export async function listConversations(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const conversations = await messageService.listConversations(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getConversation(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const conversation = await messageService.getConversation(req.params.id, userId);
    res.json(conversation);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
}

export async function createConversation(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { otherUserId } = req.body;

    const conversationId = await messageService.createConversation(userId, otherUserId);
    res.status(201).json({ id: conversationId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { conversationId, content } = req.body;

    const message = await messageService.sendMessage(userId, conversationId, content);
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const result = await messageService.markAsRead(req.params.id, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Step 3.7: Register Routes

Update `backend/src/app.ts`:

```typescript
import messageRoutes from './routes/message.routes';

app.use('/api/v1', messageRoutes);
```

---

## Part 4: Testing

### Step 4.1: Test Sessions API

```bash
# List sessions
curl http://localhost:3000/api/v1/sessions

# Create RSVP
curl -X POST http://localhost:3000/api/v1/sessions/SESSION_ID/rsvp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID","status":"attending"}'

# Get my schedule
curl http://localhost:3000/api/v1/sessions/my-schedule \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4.2: Test WebSocket

Create test client in `backend/test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>WebSocket Test</h1>
  <div id="messages"></div>
  <input id="messageInput" type="text" placeholder="Type a message" />
  <button onclick="sendMessage()">Send</button>

  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script>
    const token = 'YOUR_ACCESS_TOKEN';
    const socket = io('http://localhost:3000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join_conversation', 'CONVERSATION_ID');
    });

    socket.on('new_message', (message) => {
      console.log('New message:', message);
      const div = document.createElement('div');
      div.textContent = `${message.sender.fullName}: ${message.content}`;
      document.getElementById('messages').appendChild(div);
    });

    function sendMessage() {
      const content = document.getElementById('messageInput').value;
      socket.emit('send_message', {
        conversationId: 'CONVERSATION_ID',
        content
      });
      document.getElementById('messageInput').value = '';
    }
  </script>
</body>
</html>
```

---

## Summary

**Completed:**
- Sessions & RSVPs (10 endpoints)
- Research Projects (6 endpoints)
- Messaging (5 REST + WebSocket)

**Total:** 21 new endpoints + WebSocket server

**Remaining for Admin (7 endpoints):**
- See Part 5 in separate guide

**To test:**
1. Start backend: `npm run dev`
2. Test each endpoint with curl or Postman
3. Test WebSocket with test HTML file

All code follows existing patterns and integrates with current architecture.
