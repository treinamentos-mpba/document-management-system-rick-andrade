const { randomUUID } = require('node:crypto');
const multer = require('multer');

// Infraestrutura de upload: decide onde e com que nome os arquivos são
// gravados fisicamente. Nomes são UUIDs, reutilizados como id do documento.
function createUploadMiddleware({ storageDirectory, maxFileSize }) {
  const storage = multer.diskStorage({
    // Quando destination é uma string, o multer cria o diretório.
    destination: storageDirectory,
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