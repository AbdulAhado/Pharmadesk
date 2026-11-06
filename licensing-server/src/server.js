/**
 * PharmaDesk Licensing Backend Server
 * Node.js + Express with MongoDB Atlas and Ed25519 Cryptographic Engine
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const { connectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const licenseRoutes = require('./routes/licenseRoutes');
const planRoutes = require('./routes/planRoutes');
const renewalRoutes = require('./routes/renewalRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiting (120 requests per minute per IP for license endpoints)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: 'Too many requests from this device. Please try again in a minute.' },
});
app.use('/api/', apiLimiter);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'PharmaDesk Licensing Authority',
    version: '1.0.0',
    crypto: 'Ed25519',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/renewal-requests', renewalRoutes);
app.use('/api/v1/admin', adminRoutes);

// Serve Admin Dashboard
const adminPublicPath = path.join(__dirname, '../public');
if (require('fs').existsSync(adminPublicPath)) {
  app.use('/admin', express.static(adminPublicPath));
}
// Note: The primary admin dashboard is now the Next.js app in license-admin/.
// Deploy license-admin to Vercel for production admin dashboard.
// This /admin route serves the legacy single-file fallback dashboard.

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Error handling
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  PharmaDesk Licensing Backend Server Running      `);
      console.log(`  Port: ${PORT}                                    `);
      console.log(`  API Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`  Admin Dashboard: http://localhost:${PORT}/admin   `);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start licensing server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

