const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Routes
const chatRoutes = require('./routes/chat');
const leadsRoutes = require('./routes/leads');
const scheduleRoutes = require('./routes/schedule');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`South Oak Chat API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
