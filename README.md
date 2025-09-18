# FRA Atlas WebGIS DSS

An AI-powered Forest Rights Act (FRA) Atlas and WebGIS-based Decision Support System for integrated forest monitoring and management.

## 🚀 Features

- **Interactive WebGIS Dashboard** - Real-time mapping and visualization of FRA claims
- **AI-Powered Forest Alert System** - Automated detection and monitoring of forest threats
- **Comprehensive Analytics** - Statistical analysis and reporting of forest data
- **Multi-Component Architecture** - Modular design with separate frontend, backend, and mapping components
- **Supabase Integration** - Cloud-based database with PostGIS support for spatial data
- **Real-time Monitoring** - Live updates and notifications for forest activities

## 🏗️ Architecture

```
FRA Atlas WebGIS DSS/
├── fra-backend-express-complete/    # Express.js + TypeScript API
├── fra-dashboard/                   # React.js Dashboard
├── TINA 2/fra-map/                 # Vite + React Map Component
├── forest-alert/                   # AI Forest Alert System
└── scripts/                        # Setup and utility scripts
```

## 🛠️ Technology Stack

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with PostGIS extension
- **Supabase** for cloud database
- **Swagger** for API documentation

### Frontend
- **React.js** with modern hooks
- **Leaflet** for interactive maps
- **Recharts** for data visualization
- **Tailwind CSS** for styling

### AI/ML
- **Forest Alert System** with IoT sensor integration
- **Real-time monitoring** with confidence scoring
- **Multi-source data fusion** (satellites, drones, citizen reports)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- PostgreSQL database (Supabase recommended)
- Git

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd fra-atlas-webgis-dss
npm run setup
```

2. **Configure environment variables:**
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

3. **Start development servers:**
```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:8080`
- Dashboard on `http://localhost:3000`
- Map component on `http://localhost:5173`
- Forest alerts on `http://localhost:3000/alerts`

## 📊 API Endpoints

### Base URL: `http://localhost:8080`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and available endpoints |
| `/api/health` | GET | Database connection status |
| `/api/analytics` | GET | Claims statistics and analytics |
| `/api/claims` | GET | List all claims with village information |
| `/api/claims` | POST | Create a new land claim |
| `/docs` | GET | Swagger API documentation |

## 🗄️ Database Schema

### Core Tables
- **villages** - Village information and metadata
- **claims** - Land claims with spatial geometry data
- **forests** - Protected forest areas (optional)
- **alerts** - Forest alert and monitoring data

### Spatial Data
- All spatial data uses **PostGIS** with **WGS84 (EPSG:4326)** coordinate system
- Supports **GeoJSON** format for geometry data
- Automatic spatial indexing for performance

## 🎯 Usage Examples

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

## 🔧 Development

### Project Structure
```
fra-atlas-webgis-dss/
├── fra-backend-express-complete/
│   ├── src/
│   │   ├── app.ts              # Main application setup
│   │   ├── server.ts           # Server entry point
│   │   ├── db/
│   │   │   └── pool.ts         # Database connection pool
│   │   ├── routes/
│   │   │   ├── claims.ts       # Claims API routes
│   │   │   └── analytics.ts    # Analytics API routes
│   │   └── docs/
│   │       └── swagger.ts      # API documentation
│   ├── package.json
│   └── tsconfig.json
├── fra-dashboard/
│   ├── src/
│   │   ├── App.js              # Main dashboard component
│   │   ├── MapView.js          # Map visualization component
│   │   └── data/
│   │       └── data.json       # Sample data
│   └── package.json
├── TINA 2/fra-map/
│   ├── src/
│   │   ├── App.jsx             # Map application
│   │   ├── components/
│   │   │   └── MapView.jsx     # Interactive map component
│   │   └── data/
│   │       └── fraClaims.js    # FRA claims data
│   └── package.json
└── forest-alert/
    ├── app.js                  # Forest alert application
    ├── index.html              # Alert dashboard
    └── data/
        └── alerts_2025.json    # Alert data
```

### Available Scripts
- `npm run dev` - Start all development servers
- `npm run build` - Build all components for production
- `npm run install:all` - Install dependencies for all components
- `npm run setup` - Complete project setup
- `npm run test` - Run tests

## 🌐 Deployment

### Environment Variables
Ensure these are set in your production environment:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (production/development)

### Production Build
```bash
npm run build
npm start
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `DATABASE_URL` in `.env`
   - Ensure Supabase database is accessible
   - Verify PostGIS extension is enabled

2. **Port Already in Use**
   - Change `PORT` in `.env` file
   - Kill existing processes: `lsof -ti:8080 | xargs kill -9`

3. **GeoJSON Validation Error**
   - Ensure coordinates are properly formatted arrays
   - Check polygon ring structure

4. **Missing Dependencies**
   - Run `npm run install:all` to install all packages
   - Check Node.js version compatibility

### Health Check
Visit `http://localhost:8080/api/health` to verify database connectivity.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation at `/docs`
3. Check server logs for detailed error messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using Express.js, React, TypeScript, PostGIS, and AI/ML technologies**
