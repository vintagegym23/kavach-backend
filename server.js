// // // // require('dotenv').config();
// // // // const express = require('express');
// // // // const { connectDB } = require('./config/pgdb'); // updated for PostgreSQL
// // // // const app = require('./app');

// // // // // ---- DB connect ----
// // // // connectDB(); // this will verify connection to PostgreSQL

// // // // // ---- Start server ----
// // // // const PORT = process.env.PORT || 5000;
// // // // app.listen(PORT, () => {
// // // //   console.log(`🚀 Server running on port ${PORT}`);
// // // // });


// // // require('dotenv').config();
// // // const http = require('http');
// // // const app = require('./app');

// // // const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
// // // console.log("🔍 DATABASE_URL:", maskedUrl);

// // // const { connectDB } = require('./config/pgdb');

// // // // ---------------------------------------------------
// // // // 🔐 STRICT ENV VALIDATION
// // // // ---------------------------------------------------
// // // const REQUIRED_ENV = [
// // //   'DATABASE_URL',
// // //   'JWT_SECRET',
// // //   'ENCRYPTION_KEY'
// // // ];

// // // for (const key of REQUIRED_ENV) {
// // //   if (!process.env[key]) {
// // //     console.error(`❌ Missing required environment variable: ${key}`);
// // //     process.exit(1);
// // //   }
// // // }

// // // // Enforce strong JWT secret (minimum 32 chars recommended)
// // // if (process.env.JWT_SECRET.length < 32) {
// // //   console.error('❌ JWT_SECRET must be at least 32 characters long');
// // //   process.exit(1);
// // // }

// // // // Validate AES-256 encryption key (must be exactly 32 bytes)
// // // const encryptionKeyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
// // // if (encryptionKeyBuffer.length !== 32) {
// // //   console.error('❌ ENCRYPTION_KEY must be exactly 32 bytes (AES-256 requirement)');
// // //   process.exit(1);
// // // }

// // // // ---------------------------------------------------
// // // // 🌍 SAFE CONFIG LOGGING (NO SECRETS)
// // // // ---------------------------------------------------
// // // const PORT = process.env.PORT || 5000;
// // // const NODE_ENV = process.env.NODE_ENV || 'development';

// // // console.log('🔎 Validating environment...');
// // // console.log(`🌍 Environment: ${NODE_ENV}`);
// // // console.log(`🔌 Port: ${PORT}`);
// // // console.log('🛡 Required environment variables verified');

// // // // ---------------------------------------------------
// // // // 🚀 CONTROLLED STARTUP SEQUENCE
// // // // ---------------------------------------------------
// // // let server;

// // // (async () => {
// // //   try {
// // //     await connectDB();
// // //     console.log('✅ Database connected successfully');

// // //     server = http.createServer(app);

// // //     server.listen(PORT, () => {
// // //       console.log(`🚀 Server running on port ${PORT}`);
// // //     });

// // //   } catch (err) {
// // //     console.error('❌ Failed to start server:', err);
// // //     process.exit(1);
// // //   }
// // // })();

// // // // ---------------------------------------------------
// // // // 💥 GLOBAL CRASH SAFETY
// // // // ---------------------------------------------------
// // // const shutdown = (reason, err) => {
// // //   console.error(`❌ ${reason}:`, err);

// // //   if (server) {
// // //     server.close(() => {
// // //       console.error('🛑 Server closed due to fatal error');
// // //       process.exit(1);
// // //     });
// // //   } else {
// // //     process.exit(1);
// // //   }
// // // };

// // // process.on('unhandledRejection', (err) => {
// // //   shutdown('Unhandled Rejection', err);
// // // });

// // // process.on('uncaughtException', (err) => {
// // //   shutdown('Uncaught Exception', err);
// // // });

// // // // Optional but recommended in production environments
// // // process.on('SIGTERM', () => {
// // //   console.log('📴 SIGTERM received. Shutting down gracefully...');
// // //   if (server) {
// // //     server.close(() => {
// // //       console.log('✅ Process terminated');
// // //       process.exit(0);
// // //     });
// // //   } else {
// // //     process.exit(0);
// // //   }
// // // });







// // require('dotenv').config();
// // const http = require('http');
// // const app = require('./app');

// // const { connectDB } = require('./config/pgdb');

// // /* ---------------------------------------------------
// //    🔐 STRICT ENV VALIDATION
// // --------------------------------------------------- */

// // const REQUIRED_ENV = [
// //   'DATABASE_URL',
// //   'JWT_SECRET',
// //   'ENCRYPTION_KEY'
// // ];

// // for (const key of REQUIRED_ENV) {
// //   if (!process.env[key]) {
// //     console.error(`❌ Missing required environment variable: ${key}`);
// //     process.exit(1);
// //   }
// // }

// // // Enforce strong JWT secret (minimum 32 chars)
// // if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
// //   console.error('❌ JWT_SECRET must be at least 32 characters long');
// //   process.exit(1);
// // }

// // // Validate AES-256 encryption key (exactly 32 bytes)
// // const encryptionKeyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
// // if (encryptionKeyBuffer.length !== 32) {
// //   console.error('❌ ENCRYPTION_KEY must be exactly 32 bytes (AES-256 requirement)');
// //   process.exit(1);
// // }

// // /* ---------------------------------------------------
// //    🌍 SAFE CONFIG LOGGING (NO SECRETS)
// // --------------------------------------------------- */

// // const PORT = process.env.PORT || 5000;
// // const NODE_ENV = process.env.NODE_ENV || 'development';

// // console.log('🔎 Validating environment...');
// // console.log(`🌍 Environment: ${NODE_ENV}`);
// // console.log(`🔌 Port: ${PORT}`);
// // console.log('🛡 Required environment variables verified');

// // /* ---------------------------------------------------
// //    🚀 CONTROLLED STARTUP
// // --------------------------------------------------- */

// // let server;

// // (async () => {
// //   try {
// //     await connectDB();
// //     console.log('✅ Database connected successfully');

// //     server = http.createServer(app);

// //     server.listen(PORT, () => {
// //       console.log(`🚀 Server running on port ${PORT}`);
// //     });

// //   } catch (err) {
// //     console.error('❌ Failed to start server:', err);
// //     process.exit(1);
// //   }
// // })();

// // /* ---------------------------------------------------
// //    💥 GLOBAL CRASH SAFETY
// // --------------------------------------------------- */

// // const shutdown = (reason, err) => {
// //   console.error(`❌ ${reason}:`, err);

// //   if (server) {
// //     server.close(() => {
// //       console.error('🛑 Server closed due to fatal error');
// //       process.exit(1);
// //     });
// //   } else {
// //     process.exit(1);
// //   }
// // };

// // process.on('unhandledRejection', (err) => {
// //   shutdown('Unhandled Rejection', err);
// // });

// // process.on('uncaughtException', (err) => {
// //   shutdown('Uncaught Exception', err);
// // });

// // process.on('SIGTERM', () => {
// //   console.log('📴 SIGTERM received. Shutting down gracefully...');
// //   if (server) {
// //     server.close(() => {
// //       console.log('✅ Process terminated');
// //       process.exit(0);
// //     });
// //   } else {
// //     process.exit(0);
// //   }
// // });













// require('dotenv').config();
// const http = require('http');
// const fs = require('fs');
// const logger = require('./utils/logger');
// const app = require('./app');
// const { connectDB } = require('./config/pgdb');

// /* ---------------------------------------------------
//    📂 ENSURE LOG DIRECTORY EXISTS
// --------------------------------------------------- */
// if (!fs.existsSync('logs')) {
//   fs.mkdirSync('logs');
// }

// /* ---------------------------------------------------
//    🔐 STRICT ENV VALIDATION
// --------------------------------------------------- */
// const REQUIRED_ENV = [
//   'DATABASE_URL',
//   'JWT_SECRET',
//   'ENCRYPTION_KEY'
// ];

// for (const key of REQUIRED_ENV) {
//   if (!process.env[key]) {
//     logger.error('Missing required environment variable', { key });
//     process.exit(1);
//   }
// }

// if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
//   logger.error('JWT_SECRET must be at least 32 characters long');
//   process.exit(1);
// }

// const encryptionKeyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
// if (encryptionKeyBuffer.length !== 32) {
//   logger.error('ENCRYPTION_KEY must be exactly 32 bytes');
//   process.exit(1);
// }

// const PORT = process.env.PORT || 5000;
// const NODE_ENV = process.env.NODE_ENV || 'development';

// logger.info('Environment validated', { NODE_ENV, PORT });

// let server;

// (async () => {
//   try {
//     await connectDB();
//     logger.info('Database connected');

//     server = http.createServer(app);

//     server.listen(PORT, () => {
//       logger.info('Server started', { port: PORT });
//     });

//   } catch (err) {
//     logger.error('Failed to start server', {
//       message: err.message,
//       stack: err.stack
//     });
//     process.exit(1);
//   }
// })();

// /* ---------------------------------------------------
//    💥 GLOBAL CRASH SAFETY
// --------------------------------------------------- */

// const shutdown = (reason, err) => {
//   logger.error(reason, {
//     message: err?.message,
//     stack: err?.stack
//   });

//   if (server) {
//     server.close(() => {
//       logger.error('Server closed due to fatal error');
//       process.exit(1);
//     });
//   } else {
//     process.exit(1);
//   }
// };

// process.on('unhandledRejection', (err) => {
//   shutdown('Unhandled Rejection', err);
// });

// process.on('uncaughtException', (err) => {
//   shutdown('Uncaught Exception', err);
// });

// process.on('SIGTERM', () => {
//   logger.info('SIGTERM received. Graceful shutdown.');
//   if (server) {
//     server.close(() => {
//       logger.info('Process terminated');
//       process.exit(0);
//     });
//   } else {
//     process.exit(0);
//   }
// });













require('dotenv').config();
const http = require('http');
const fs = require('fs');
const logger = require('./utils/logger');
const app = require('./app');
const { connectDB } = require('./config/pgdb');
const validateEnv = require('./config/envValidator');

/* ---------------------------------------------------
   🔹 FORCE NODE_ENV
--------------------------------------------------- */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

/* ---------------------------------------------------
   📂 ENSURE LOG DIRECTORY EXISTS
--------------------------------------------------- */
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

/* ---------------------------------------------------
   🔐 STRICT ENV VALIDATION
--------------------------------------------------- */
validateEnv();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV;

logger.info('Environment validated', { NODE_ENV, PORT });

let server;

(async () => {
  try {
    await connectDB();
    logger.info('Database connected');

    server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info('Server started', { port: PORT });
    });

  } catch (err) {
    logger.error('Failed to start server', {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
})();

/* ---------------------------------------------------
   💥 GLOBAL CRASH SAFETY
--------------------------------------------------- */
const shutdown = (reason, err) => {
  logger.error(reason, {
    message: err?.message,
    stack: err?.stack
  });

  if (server) {
    server.close(() => {
      logger.error('Server closed due to fatal error');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => shutdown('Unhandled Rejection', err));
process.on('uncaughtException', (err) => shutdown('Uncaught Exception', err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Graceful shutdown.');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
