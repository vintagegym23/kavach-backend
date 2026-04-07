const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a Buffer to S3 and return the public URL.
 * @param {Buffer} buffer   - Image data
 * @param {string} filename - Desired object key (e.g. "proof-xxx.jpg")
 * @param {string} contentType - MIME type (default: image/jpeg)
 * @returns {Promise<string>} Full S3 URL
 */
async function uploadToS3(buffer, filename, contentType = 'image/jpeg') {
  const bucket = process.env.AWS_S3_BUCKET;
  const key = `uploads/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  logger.info('S3 upload success', { key, url });
  return url;
}

module.exports = { uploadToS3 };
