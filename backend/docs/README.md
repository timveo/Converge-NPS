# Converge-NPS Backend Documentation

Welcome to the Converge-NPS backend documentation. This directory contains comprehensive guides for setting up, configuring, and using the application.

---

## Documentation Index

### Smartsheet Integration

The Smartsheet integration enables bi-directional data synchronization between Smartsheet and the Converge-NPS application.

#### Quick Start
Start here if you're new to the integration:
- [SMARTSHEET_QUICK_START.md](./SMARTSHEET_QUICK_START.md) - 5-minute setup guide

#### Comprehensive Guide
For detailed information and troubleshooting:
- [SMARTSHEET_INTEGRATION.md](./SMARTSHEET_INTEGRATION.md) - Complete documentation

#### Templates & Reference
For setting up your Smartsheet templates:
- [SMARTSHEET_TEMPLATES.md](./SMARTSHEET_TEMPLATES.md) - Template specifications and examples

#### Implementation Details
For developers and technical details:
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical implementation overview

---

## Quick Links

### Common Tasks

**First Time Setup:**
1. Read [SMARTSHEET_QUICK_START.md](./SMARTSHEET_QUICK_START.md)
2. Get your Smartsheet API key
3. Configure your `.env` file
4. Set up your Smartsheet templates using [SMARTSHEET_TEMPLATES.md](./SMARTSHEET_TEMPLATES.md)
5. Run your first import

**Troubleshooting:**
- See the Troubleshooting section in [SMARTSHEET_INTEGRATION.md](./SMARTSHEET_INTEGRATION.md)
- Check error messages in import results
- Review validation rules in [SMARTSHEET_TEMPLATES.md](./SMARTSHEET_TEMPLATES.md)

**API Reference:**
- See the API Endpoints section in [SMARTSHEET_INTEGRATION.md](./SMARTSHEET_INTEGRATION.md)
- See the Quick Reference in [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## Feature Overview

### Data Import (Inbound: Smartsheet → App)

Import event data from Smartsheet:
- Event sessions and schedule
- Research projects
- Funding/internship opportunities
- Industry partners
- Registered attendees

**Status**: ✅ Fully Implemented

### Data Export (Outbound: App → Smartsheet)

Sync application data to Smartsheet:
- User registrations
- Session RSVPs
- Networking connections
- Analytics data

**Status**: ✅ Fully Implemented

---

## Architecture

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **API Integration**: Axios for Smartsheet API
- **Authentication**: JWT-based auth with role-based access control

### Data Flow

```
Smartsheet Sheets
       ↓
  API Import
       ↓
   Validation
       ↓
Prisma Database
       ↓
   REST API
       ↓
  Frontend App
```

---

## Environment Variables

### Required Configuration

```bash
# Smartsheet API
SMARTSHEET_API_KEY="your-api-token"

# Import Sheet IDs
SMARTSHEET_SESSIONS_SHEET_ID=""
SMARTSHEET_PROJECTS_SHEET_ID=""
SMARTSHEET_OPPORTUNITIES_SHEET_ID=""
SMARTSHEET_PARTNERS_SHEET_ID=""
SMARTSHEET_ATTENDEES_SHEET_ID=""

# Export Sheet IDs
SMARTSHEET_USER_SHEET_ID=""
SMARTSHEET_RSVP_SHEET_ID=""
SMARTSHEET_CONNECTION_SHEET_ID=""
SMARTSHEET_ANALYTICS_SHEET_ID=""
```

See [SMARTSHEET_QUICK_START.md](./SMARTSHEET_QUICK_START.md) for setup instructions.

---

## API Endpoints

### Import Endpoints

All import endpoints require admin authentication:

```
POST /api/v1/admin/smartsheet/import/sessions
POST /api/v1/admin/smartsheet/import/projects
POST /api/v1/admin/smartsheet/import/opportunities
POST /api/v1/admin/smartsheet/import/partners
POST /api/v1/admin/smartsheet/import/attendees
POST /api/v1/admin/smartsheet/import/all
```

### Export Endpoints

```
GET  /api/v1/admin/smartsheet/status
POST /api/v1/admin/smartsheet/sync/:type
GET  /api/v1/admin/smartsheet/failed
POST /api/v1/admin/smartsheet/retry/:id
DEL  /api/v1/admin/smartsheet/clear-failed
```

---

## Data Types

### Sessions
Event sessions including keynotes, workshops, panels, and networking events.

**Required Fields**: Title, Start Time, End Time

### Projects
Research projects showcased at the event.

**Required Fields**: Title, Description, PI Name, PI Email

### Opportunities
Funding opportunities, internships, and competitions.

**Required Fields**: Title

### Partners
Industry partners, exhibitors, and sponsors.

**Required Fields**: Company Name

### Attendees
Registered users and event attendees.

**Required Fields**: Full Name, Email

---

## Security

### Authentication
- All admin endpoints require JWT authentication
- Role-based access control (admin/staff only)

### API Key Management
- Store API keys in environment variables
- Never commit `.env` files
- Rotate keys periodically

### Data Validation
- All input validated before database insertion
- Email format validation
- Date range validation
- Enum value validation

### Rate Limiting
- Respects Smartsheet API limits (300 calls/min)
- Automatic request queuing
- Prevents API abuse

---

## Testing

### Unit Testing

```bash
npm test
```

### Integration Testing

```bash
npm run test:integration
```

### Manual Testing

See the Testing Guide in [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## Development

### Setup Development Environment

```bash
# Clone repository
git clone [repo-url]
cd Converge-NPS/backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   └── utils/          # Helper functions
├── prisma/
│   └── schema.prisma   # Database schema
├── docs/               # Documentation (you are here)
└── .env.example        # Environment template
```

---

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production database URL
- [ ] Set strong `JWT_SECRET`
- [ ] Configure CORS for production domain
- [ ] Enable rate limiting
- [ ] Set up error monitoring (Sentry)
- [ ] Configure logging
- [ ] Set up SSL/TLS
- [ ] Review security headers
- [ ] Test import/export functionality
- [ ] Set up automated backups

### Environment-Specific Configuration

See `.env.example` for all available configuration options.

---

## Monitoring

### Logs

Application logs include:
- Request/response logging
- Import/export results
- Error tracking
- Performance metrics

### Metrics to Monitor

- API response times
- Import success/failure rates
- Database query performance
- Smartsheet API usage
- Error rates by endpoint

---

## Contributing

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write descriptive commit messages
- Add JSDoc comments for public functions

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback

---

## Support

### Getting Help

1. Check documentation in this directory
2. Review error messages carefully
3. Check application logs
4. Verify configuration settings

### Reporting Issues

Include:
- Environment details (Node version, OS)
- Steps to reproduce
- Error messages and logs
- Expected vs actual behavior

---

## License

Copyright © 2024 Converge-NPS

---

## Version History

### v1.0.0 (2024-12-03)
- Initial Smartsheet import implementation
- Support for 5 import data types
- Comprehensive documentation
- Validation and error handling
- Rate limiting
- Admin API endpoints

---

## Additional Resources

### External Documentation

- [Smartsheet API Documentation](https://smartsheet.redoc.ly/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Related Projects

- [Converge-NPS Frontend](../../frontend/README.md)

---

*Last Updated: December 3, 2024*
