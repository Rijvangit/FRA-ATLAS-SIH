# FRA Backend Express - Setup Instructions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (Supabase recommended)
- Git

### 1. Extract and Install Dependencies
```bash
# Extract the zip file
# Navigate to the project directory
cd fra-backend-express

# Install dependencies
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory with your database credentials:

```env
DATABASE_URL=your_supabase_database_url_here
PORT=8080
```

**Example Supabase URL:**
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Database Setup
The application will automatically create the necessary tables and indexes on first run. Make sure your database has PostGIS extension enabled.

**Required Tables:**
- `villages` - Village information
- `claims` - Land claims with geometry data
- `forests` - Protected forest areas (optional)

### 4. Start the Application
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

## 📡 API Endpoints

### Base URL: `http://localhost:8080`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and available endpoints |
| `/api/health` | GET | Database connection status |
| `/api/analytics` | GET | Claims statistics and analytics |
| `/api/claims` | GET | List all claims with village information |
| `/api/claims` | POST | Create a new land claim |
| `/docs` | GET | Swagger API documentation |

## 🔧 API Usage Examples

### Get All Claims
```bash
curl http://localhost:8080/api/claims
```

### Create a New Claim
```bash
curl -X POST http://localhost:8080/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "claimant_name": "John Doe",
    "village_id": 1,
    "geom": {
      "type": "Polygon",
      "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
  }'
```

### Get Analytics
```bash
curl http://localhost:8080/api/analytics
```

## 🗄️ Database Schema

### Villages Table
```sql
CREATE TABLE villages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Claims Table
```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id INTEGER REFERENCES villages(id),
  claimant_name TEXT,
  status claim_status DEFAULT 'pending',
  geom GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Forests Table (Optional)
```sql
CREATE TABLE forests (
  id SERIAL PRIMARY KEY,
  name TEXT,
  geom GEOMETRY(POLYGON, 4326)
);
```

## 🛠️ Features

- ✅ **RESTful API** - Complete CRUD operations
- ✅ **PostGIS Integration** - Spatial data handling
- ✅ **Input Validation** - Comprehensive data validation
- ✅ **Error Handling** - Detailed error responses
- ✅ **Connection Pooling** - Optimized database connections
- ✅ **Health Monitoring** - Database connectivity checks
- ✅ **Swagger Documentation** - Interactive API docs
- ✅ **CORS Support** - Cross-origin requests
- ✅ **Security Headers** - Helmet.js protection
- ✅ **Request Logging** - Morgan middleware

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `DATABASE_URL` in `.env`
   - Ensure Supabase database is accessible
   - Verify PostGIS extension is enabled

2. **Port Already in Use**
   - Change `PORT` in `.env` file
   - Kill existing processes: `taskkill /F /IM node.exe`

3. **GeoJSON Validation Error**
   - Ensure coordinates are properly formatted arrays
   - Check polygon ring structure

4. **Missing Dependencies**
   - Run `npm install` to install all packages
   - Check Node.js version compatibility

### Health Check
Visit `http://localhost:8080/api/health` to verify database connectivity.

## 📝 Development

### Project Structure
```
fra-backend-express/
├── src/
│   ├── app.ts              # Main application setup
│   ├── server.ts           # Server entry point
│   ├── db/
│   │   └── pool.ts         # Database connection pool
│   ├── routes/
│   │   ├── claims.ts       # Claims API routes
│   │   └── analytics.ts    # Analytics API routes
│   └── docs/
│       └── swagger.ts      # API documentation
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## 🚀 Deployment

### Environment Variables
Ensure these are set in your production environment:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)

### Production Build
```bash
npm run build
npm start
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation at `/docs`
3. Check server logs for detailed error messages

---

**Built with ❤️ using Express.js, TypeScript, and PostGIS**
