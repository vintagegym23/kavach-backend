const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'FRONTEND_URL'
];

module.exports = function validateEnv() {
  requiredEnv.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const encryptionKeyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
  if (encryptionKeyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes');
  }
};
