const winston = require('winston');
const path = require('path');

// Define custom log levels
const customLevels = {
  levels: {
    success: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  colors: {
    success: 'green',
    info: 'blue',
    warn: 'yellow',
    error: 'red',
  },
};

// Configure Winston logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] - ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
    }),
  ],
});

// Add console transport with colors in development mode
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ level, message }) => {
          return `[${level.toUpperCase()}] - ${message}`;
        })
      ),
    })
  );
}

// Apply custom colors to Winston
winston.addColors(customLevels.colors);

module.exports = logger;
