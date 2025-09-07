import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import claimsRouter from './routes/claims';
import analyticsRoutes from './routes/analytics';
import alertsRouter from './routes/alerts';

const app = express();

// Global timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ FRA Backend API is running...',
    version: '1.0.0',
    endpoints: {
      claims: '/api/claims',
      alerts: '/api/alerts',
      analytics: '/api/analytics',
      documentation: '/docs',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/api/claims', claimsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/analytics", analyticsRoutes);

const port = Number(process.env.PORT || 8080);

// Start server with error handling
const server = app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;