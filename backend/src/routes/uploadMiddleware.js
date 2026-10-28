const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const multer = require('multer');

function createUploadMiddleware({ storageDirectory, maxFileSize }) {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true })
        .then(() => callback(null, storageDirectory))
        .catch(callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSize },
  }).single('file');
}

module.exports = { createUploadMiddleware };