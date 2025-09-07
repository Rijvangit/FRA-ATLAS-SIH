# FRA Atlas WebGIS DSS - Deployment Guide

This guide covers deployment options for the FRA Atlas WebGIS DSS system.

## 🚀 Quick Deployment

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- PostgreSQL database (Supabase recommended)
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd fra-atlas-webgis-dss
npm run setup
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your database credentials
```

### 3. Initialize Database
Run the SQL script in your Supabase SQL editor:
```bash
cat scripts/init-database.sql
```

### 4. Start Development
```bash
npm run dev
```

## 🏗️ Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Build All Components
```bash
npm run build
```

#### 2. Start Production Server
```bash
npm start
```

#### 3. Configure Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Map Component
    location /map/ {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Forest Alerts
    location /alerts/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY fra-backend-express-complete/package*.json ./
RUN npm ci --only=production
COPY fra-backend-express-complete/ .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

#### 2. Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./fra-backend-express-complete
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    depends_on:
      - postgres

  dashboard:
    build: ./fra-dashboard
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8080

  map:
    build: ./TINA/fra-map
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080

  alerts:
    build: ./forest-alert
    ports:
      - "3001:3001"

  postgres:
    image: postgis/postgis:15-3.3
    environment:
      - POSTGRES_DB=fra_atlas
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Option 3: Cloud Deployment

#### Supabase + Vercel/Netlify

1. **Backend (Supabase Functions)**
   - Deploy backend as Supabase Edge Functions
   - Configure database connection

2. **Frontend (Vercel/Netlify)**
   - Deploy dashboard and map components
   - Configure environment variables

3. **Static Files (CDN)**
   - Deploy forest alerts as static files
   - Use CDN for optimal performance

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Backend
PORT=8080
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_MAP_API_URL=https://your-map-domain.com
REACT_APP_ALERTS_URL=https://your-alerts-domain.com

# Security
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.com

# AI/ML
AI_MODEL_ENDPOINT=your_ai_endpoint
AI_API_KEY=your_ai_api_key
```

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Check system health
npm run health

# Monitor logs
tail -f logs/app.log
```

### Database Maintenance
```sql
-- Update statistics
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;

-- Check database size
SELECT pg_size_pretty(pg_database_size('fra_atlas'));
```

### Performance Optimization

1. **Database Indexing**
   ```sql
   -- Ensure spatial indexes exist
   CREATE INDEX IF NOT EXISTS idx_claims_geom ON claims USING GIST (geom);
   CREATE INDEX IF NOT EXISTS idx_alerts_location ON forest_alerts USING GIST (ST_Point(lon, lat));
   ```

2. **Caching**
   - Implement Redis for session storage
   - Use CDN for static assets
   - Enable browser caching

3. **Load Balancing**
   - Use multiple backend instances
   - Implement horizontal scaling

## 🔒 Security Considerations

### 1. Database Security
- Use connection pooling
- Enable SSL/TLS
- Implement proper access controls
- Regular security updates

### 2. API Security
- Rate limiting
- Input validation
- CORS configuration
- Authentication/Authorization

### 3. Frontend Security
- Content Security Policy (CSP)
- HTTPS enforcement
- Secure headers
- Regular dependency updates

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database connectivity
   npm run health
   
   # Verify environment variables
   cat .env
   ```

2. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :8080
   lsof -i :3000
   lsof -i :5173
   ```

3. **Build Failures**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run install:all
   npm run build
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run dev
   ```

### Log Analysis
```bash
# Backend logs
tail -f fra-backend-express-complete/logs/app.log

# Frontend logs (browser console)
# Check browser developer tools

# System logs
journalctl -u your-service-name -f
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer (Nginx, HAProxy)
- Multiple backend instances
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layers
- Use connection pooling

### Microservices Architecture
- Split components into separate services
- Use message queues (Redis, RabbitMQ)
- Implement service discovery
- Container orchestration (Kubernetes)

## 🔄 Backup and Recovery

### Database Backups
```bash
# Create backup
pg_dump -h localhost -U postgres fra_atlas > backup.sql

# Restore backup
psql -h localhost -U postgres fra_atlas < backup.sql
```

### Application Backups
```bash
# Backup application files
tar -czf fra-atlas-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  .
```

### Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres fra_atlas > "backup_${DATE}.sql"
tar -czf "app_backup_${DATE}.tar.gz" --exclude=node_modules .
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review system logs
3. Verify environment configuration
4. Test individual components

---

**Built with ❤️ for sustainable forest management**

## ☁️ Heroku (Backend) and Vercel (Frontends)

### Heroku (Backend API)
- Prereqs: Heroku CLI installed, account created
- From repo root:
```bash
cd fra-backend-express-complete
heroku create fra-backend --region us
# Option A: Buildpack deploy
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB'
# If your repo main branch is not named main, change accordingly
git push heroku HEAD:main

# Option B: Container deploy (uses Dockerfile)
heroku stack:set container
git push heroku HEAD:main
```
- Verify:
```bash
heroku open
heroku logs --tail
```
- Health and docs: `/api/health`, `/docs`

### Vercel (Dashboard, Map, Alerts)
- Prereqs: Vercel CLI or dashboard, account created

Dashboard (Create React App)
- Project root: `fra-dashboard`
- Framework: Create React App
- Build Command: `npm run build`
- Output Directory: `build`
- Environment Variables:
  - `REACT_APP_API_URL=https://<your-heroku-app>.herokuapp.com`

Map (Vite React)
- Project root: `TINA/fra-map`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Optional Env (if referenced):
  - `VITE_API_URL=https://<your-heroku-app>.herokuapp.com`

Forest Alerts (Static)
- Project root: `forest-alert`
- Framework: Other
- Output Directory: `.`
- No envs required

Post-deploy
- Update any frontend envs to match your final backend URL
- Rebuild frontends to reflect new API base URL
