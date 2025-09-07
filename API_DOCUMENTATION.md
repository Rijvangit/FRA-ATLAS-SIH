# FRA Atlas WebGIS DSS - API Documentation

This document provides comprehensive API documentation for the FRA Atlas WebGIS DSS backend services.

## 🌐 Base URL

```
http://localhost:8080
```

## 🔐 Authentication

Currently, the API does not require authentication. Future versions will implement JWT-based authentication.

## 📊 API Endpoints

### Health Check

#### GET /api/health
Check the health status of the API and database connection.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy

---

### Claims Management

#### GET /api/claims
Retrieve all FRA claims with village information.

**Query Parameters:**
- `limit` (optional) - Number of claims to return (default: all)
- `status` (optional) - Filter by claim status (`pending`, `approved`, `rejected`)
- `village_id` (optional) - Filter by village ID

**Response:**
```json
{
  "success": true,
  "count": 150,
  "claims": [
    {
      "id": "uuid-string",
      "claimant_name": "John Doe",
      "village_id": 1,
      "status": "approved",
      "created_at": "2025-01-27T10:30:00.000Z",
      "village_name": "Demo Village A",
      "district": "Mandla",
      "state": "Madhya Pradesh",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[80.0, 22.8], [80.1, 22.8], [80.1, 22.9], [80.0, 22.9], [80.0, 22.8]]]
      }
    }
  ]
}
```

#### POST /api/claims
Create a new FRA claim.

**Request Body:**
```json
{
  "claimant_name": "John Doe",
  "village_id": 1,
  "geom": {
    "type": "Polygon",
    "coordinates": [[[80.0, 22.8], [80.1, 22.8], [80.1, 22.9], [80.0, 22.9], [80.0, 22.8]]]
  }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "claimant_name": "John Doe",
  "village_id": 1,
  "status": "pending",
  "created_at": "2025-01-27T10:30:00.000Z",
  "geom": "POLYGON((80.0 22.8, 80.1 22.8, 80.1 22.9, 80.0 22.9, 80.0 22.8))"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Bad request (validation error)
- `409` - Conflict (overlapping claim)
- `500` - Internal server error

---

### Forest Alerts

#### GET /api/alerts
Retrieve forest alerts with optional filtering.

**Query Parameters:**
- `state` (optional) - Filter by state name
- `severity` (optional) - Filter by severity (`Low`, `Medium`, `High`)
- `startDate` (optional) - Filter alerts from this date (ISO format)
- `endDate` (optional) - Filter alerts until this date (ISO format)
- `limit` (optional) - Number of alerts to return (default: 100)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "alerts": [
    {
      "id": "uuid-string",
      "state": "Telangana",
      "lat": 18.16588,
      "lon": 77.12005,
      "severity": "Low",
      "date": "2025-01-27T10:30:00.000Z",
      "cause": "Burn scar",
      "source": "IoT sensor",
      "confidence": 65,
      "notes": "Within known dry zone.",
      "created_at": "2025-01-27T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/alerts
Create a new forest alert.

**Request Body:**
```json
{
  "state": "Telangana",
  "lat": 18.16588,
  "lon": 77.12005,
  "severity": "Low",
  "cause": "Burn scar",
  "source": "IoT sensor",
  "confidence": 65,
  "notes": "Within known dry zone."
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "id": "uuid-string",
    "state": "Telangana",
    "lat": 18.16588,
    "lon": 77.12005,
    "severity": "Low",
    "date": "2025-01-27T10:30:00.000Z",
    "cause": "Burn scar",
    "source": "IoT sensor",
    "confidence": 65,
    "notes": "Within known dry zone.",
    "created_at": "2025-01-27T10:30:00.000Z"
  }
}
```

#### GET /api/alerts/stats
Get forest alert statistics.

**Response:**
```json
{
  "success": true,
  "totalAlerts": 1250,
  "bySeverity": [
    { "severity": "Low", "count": 800 },
    { "severity": "Medium", "count": 350 },
    { "severity": "High", "count": 100 }
  ],
  "byState": [
    { "state": "Telangana", "count": 400 },
    { "state": "Madhya Pradesh", "count": 350 },
    { "state": "Odisha", "count": 300 },
    { "state": "Tripura", "count": 200 }
  ],
  "bySource": [
    { "source": "IoT sensor", "count": 500 },
    { "source": "MODIS", "count": 300 },
    { "source": "VIIRS", "count": 250 },
    { "source": "Drone", "count": 150 },
    { "source": "Citizen report", "count": 50 }
  ],
  "recentAlerts": 25,
  "avgConfidence": 78.5
}
```

#### GET /api/alerts/geojson
Get forest alerts in GeoJSON format.

**Query Parameters:**
- `state` (optional) - Filter by state name
- `severity` (optional) - Filter by severity
- `limit` (optional) - Number of alerts to return (default: 1000)

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "uuid-string",
        "state": "Telangana",
        "severity": "Low",
        "date": "2025-01-27T10:30:00.000Z",
        "cause": "Burn scar",
        "source": "IoT sensor",
        "confidence": 65,
        "notes": "Within known dry zone."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [77.12005, 18.16588]
      }
    }
  ]
}
```

---

### Analytics

#### GET /api/analytics
Get comprehensive analytics for FRA claims and forest data.

**Response:**
```json
{
  "totalClaims": 150,
  "byStatus": [
    { "status": "approved", "count": 100 },
    { "status": "pending", "count": 35 },
    { "status": "rejected", "count": 15 }
  ],
  "byVillage": [
    { "village_id": 1, "count": 50 },
    { "village_id": 2, "count": 40 },
    { "village_id": 3, "count": 35 },
    { "village_id": 4, "count": 25 }
  ],
  "totalAreaHa": 1250.75,
  "avgAreaHa": 8.34,
  "conflictCount": 5
}
```

---

## 🔧 Error Handling

### Error Response Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `CONFLICT_ERROR` | 409 | Resource conflict (e.g., overlapping claims) |
| `NOT_FOUND` | 404 | Resource not found |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `TIMEOUT_ERROR` | 408 | Request timeout |
| `CONNECTION_ERROR` | 503 | Database connection failed |

### Example Error Responses

#### Validation Error
```json
{
  "error": "Missing required fields: claimant_name, village_id, and geom are required",
  "code": "VALIDATION_ERROR"
}
```

#### Conflict Error
```json
{
  "error": "Claim overlaps with an existing claim",
  "code": "CONFLICT_ERROR",
  "details": {
    "conflictingClaims": ["uuid-1", "uuid-2"]
  }
}
```

#### Database Error
```json
{
  "error": "Database connection error",
  "code": "CONNECTION_ERROR"
}
```

---

## 📝 Data Models

### Claim Model
```typescript
interface Claim {
  id: string;                    // UUID
  claimant_name: string;         // Required
  village_id: number;           // Required, foreign key
  status: 'pending' | 'approved' | 'rejected';
  geom: Geometry;               // PostGIS geometry
  created_at: Date;
  updated_at: Date;
}
```

### Alert Model
```typescript
interface ForestAlert {
  id: string;                   // UUID
  state: string;                // Required
  lat: number;                  // Required, latitude
  lon: number;                  // Required, longitude
  severity: 'Low' | 'Medium' | 'High';
  date: Date;                   // Alert date
  cause: string;                // Required
  source: 'IoT sensor' | 'MODIS' | 'VIIRS' | 'Drone' | 'Citizen report';
  confidence: number;           // 0-100
  notes?: string;               // Optional
  created_at: Date;
}
```

### Village Model
```typescript
interface Village {
  id: number;                   // Auto-increment
  name: string;                 // Required
  district?: string;
  state?: string;
  region?: string;
  created_at: Date;
  updated_at: Date;
}
```

### Geometry Types
```typescript
interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];     // Array of rings, each ring is array of [lng, lat]
}
```

---

## 🚀 Usage Examples

### JavaScript/TypeScript

```javascript
// Get all claims
const response = await fetch('http://localhost:8080/api/claims');
const data = await response.json();
console.log(data.claims);

// Create a new claim
const newClaim = {
  claimant_name: 'John Doe',
  village_id: 1,
  geom: {
    type: 'Polygon',
    coordinates: [[[80.0, 22.8], [80.1, 22.8], [80.1, 22.9], [80.0, 22.9], [80.0, 22.8]]]
  }
};

const createResponse = await fetch('http://localhost:8080/api/claims', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newClaim)
});

// Get alerts by state
const alertsResponse = await fetch('http://localhost:8080/api/alerts?state=Telangana&severity=High');
const alertsData = await alertsResponse.json();
```

### Python

```python
import requests
import json

# Get analytics
response = requests.get('http://localhost:8080/api/analytics')
analytics = response.json()
print(f"Total claims: {analytics['totalClaims']}")

# Create alert
alert_data = {
    "state": "Madhya Pradesh",
    "lat": 22.9734,
    "lon": 78.6569,
    "severity": "Medium",
    "cause": "Tree cover loss",
    "source": "Drone",
    "confidence": 85,
    "notes": "Detected via drone surveillance"
}

response = requests.post(
    'http://localhost:8080/api/alerts',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(alert_data)
)
```

### cURL

```bash
# Health check
curl http://localhost:8080/api/health

# Get claims
curl http://localhost:8080/api/claims

# Get alerts with filters
curl "http://localhost:8080/api/alerts?state=Telangana&severity=High&limit=10"

# Create claim
curl -X POST http://localhost:8080/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "claimant_name": "Jane Smith",
    "village_id": 2,
    "geom": {
      "type": "Polygon",
      "coordinates": [[[80.3, 17.2], [80.4, 17.2], [80.4, 17.3], [80.3, 17.3], [80.3, 17.2]]]
    }
  }'

# Get GeoJSON alerts
curl http://localhost:8080/api/alerts/geojson?limit=100
```

---

## 🔄 Rate Limiting

Currently, no rate limiting is implemented. Future versions will include:
- 100 requests per minute per IP
- 1000 requests per hour per IP
- Special limits for authenticated users

---

## 📚 Interactive Documentation

Visit `http://localhost:8080/docs` for interactive Swagger UI documentation when the server is running.

---

## 🆘 Support

For API issues:
1. Check the health endpoint: `GET /api/health`
2. Review error responses for specific error codes
3. Verify request format matches the documentation
4. Check server logs for detailed error information

---

**API Version:** 1.0.0  
**Last Updated:** 2025-01-27
