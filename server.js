const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cluster = require('cluster');
const os = require('os');
const rateLimit = require('express-rate-limit'); 
const expressWinston = require('express-winston');
const connectDB = require('./config/db');
const path = require('path');
const logger = require('./config/logger');

dotenv.config();
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  logger.info(`Master process ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new one...`);
    cluster.fork();
  });
} else {
  const app = express(); 
  app.use(expressWinston.logger({ winstonInstance: logger }));
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
 
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10000,  
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  connectDB();
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/posts', require('./routes/postRoutes'));
  app.get('/', (req, res) => {res.json({ message: 'Welcome to Social Media API' });});
  app.use((err, req, res, next) => {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({ message: 'Something went wrong!' });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.success(`Worker ${process.pid} running on port ${PORT}`);
  });
}
