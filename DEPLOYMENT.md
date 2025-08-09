# TLEF-CREATE Deployment Guide

## Project Structure (Combined Frontend & Backend)

The frontend and backend are now combined into a single deployable application:

```
tlef-create/
├── src/                    # React frontend source
├── dist/                   # Built frontend (created by `npm run build`)
├── routes/                 # Backend API routes
├── server.js               # Main server file (serves both API and frontend)
├── package.json            # Combined dependencies
├── .env                    # Development environment
├── .env.production         # Production/staging environment template
└── DEPLOYMENT.md           # This file
```

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (frontend only - Vite dev server)
npm run dev                 # Frontend on http://localhost:8092

# Development mode (backend only)
npm run dev:backend         # Backend API on http://localhost:8051

# Build frontend for production
npm run build               # Creates dist/ folder

# Run tests
npm test                    # Backend tests
npm run test:coverage       # With coverage report
```

## Production/Staging Commands

```bash
# Build and run in production mode
npm run production          # Build frontend + start server

# Staging deployment (uses .env.production)
npm run staging             # Build + copy production env + start server

# Quick deployment check
npm run deploy:staging      # Just build and verify
```

## How to Deploy for Staging

### 1. Prepare Environment

Update `.env.production` with your staging server details:
```bash
# Edit these values for your staging environment
NODE_ENV=production
PORT=8051
FRONTEND_URL=https://your-staging-domain.com
SAML_CALLBACK_URL=https://your-staging-domain.com/api/create/auth/saml/callback
SAML_LOGOUT_CALLBACK_URL=https://your-staging-domain.com/api/create/auth/logout/callback
MONGODB_URI=mongodb://your-staging-mongodb
REDIS_URL=redis://your-staging-redis
SESSION_SECRET=your-strong-session-secret
```

### 2. Deploy to Server

```bash
# Option A: Copy entire tlef-create/ folder to server
scp -r tlef-create/ user@staging-server:/path/to/app/

# Option B: Git clone on server
git clone <repository> /path/to/app/
cd /path/to/app/tlef-create/
```

### 3. Install and Start on Server

```bash
# On staging server
cd /path/to/app/tlef-create/
npm install
npm run staging
```

### 4. Set up Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "tlef-create" --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## Server Architecture

In production mode, the server:

1. **Serves static frontend** from `/dist` folder
2. **Handles API routes** at `/api/create` and `/api/biocbot`
3. **Implements SPA routing** - all non-API routes serve `index.html`
4. **Uses single port** (8051) for both frontend and backend

## Environment Configuration

### Development
- Frontend: Vite dev server (port 8092)
- Backend: Node.js server (port 8051)
- CORS enabled for cross-origin requests

### Production/Staging
- Combined: Node.js server serves everything (port 8051)
- Static files served from `/dist`
- CORS allows same-origin only
- Environment variables from `.env.production`

## Health Check

```bash
# Test if server is responding
curl http://localhost:8051/
curl http://localhost:8051/api/create/health

# Or use built-in health check
npm run health
```

## Database Dependencies

Ensure these services are running:
- **MongoDB** (port 27017)
- **Redis** (port 6379)  
- **Qdrant** (port 6333)
- **SimpleSAMLphp** (port 8080) for authentication

```bash
# Start all database services (recommended)
cd ../
./start-databases.sh

# Or start individually:
cd ../tlef-mongodb-docker && docker-compose up -d
cd ../tlef-redis-docker && docker-compose up -d  
cd ../tlef-qdrant && docker-compose up -d

# Start SAML service
cd ../docker-simple-saml/
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if port 8051 is available
2. **Database connections**: Verify MongoDB/Redis URLs in .env
3. **File uploads**: Ensure `routes/create/uploads/` directory exists and is writable
4. **SAML auth**: Update SAML callback URLs to match staging domain

### Logs

```bash
# View PM2 logs
pm2 logs tlef-create

# View application logs
tail -f server.log
```

### Reset

```bash
# Restart application
pm2 restart tlef-create

# Full rebuild
npm run build
pm2 restart tlef-create
```

## Security Notes for Production

- Change default SESSION_SECRET for SAML sessions
- Use HTTPS in production
- Configure firewall rules
- Set up proper database authentication
- Use environment-specific database URLs
- Enable rate limiting and security headers