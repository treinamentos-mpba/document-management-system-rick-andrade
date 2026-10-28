const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createDocumentRoutes } = require('./routes/documentRoutes');
const { createDocumentService } = require('./services/documentService');
const { createUploadMiddleware } = require('./routes/uploadMiddleware');

const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

function getMaxFileSize(configuredMaxFileSize) {
  if (configuredMaxFileSize !== undefined) {
    return configuredMaxFileSize;
  }

  const maxFileSize = process.env.MAX_FILE_SIZE
    ? Number(process.env.MAX_FILE_SIZE)
    : DEFAULT_MAX_FILE_SIZE;

  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE deve ser um inteiro positivo em bytes.');
  }

  return maxFileSize;
}

function resolveOwner(req) {
  const authenticatedOwner = req.user?.id;
  return authenticatedOwner || process.env.DMS_DEFAULT_OWNER || 'local-user';
}

function createErrorHandler() {
  return (error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
      const status = isFileTooLarge ? 413 : 400;
      const code = isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
      const message = isFileTooLarge
        ? 'O arquivo excede o tamanho máximo permitido.'
        : 'A requisição de upload é inválida.';

      return res.status(status).json({ error: { code, message } });
    }

    const status = error.status || 500;
    const code = error.apiCode || 'INTERNAL_SERVER_ERROR';
    const messages = {
      UPLOAD_FAILED: 'Não foi possível enviar o documento.',
      DOCUMENT_LIST_FAILED: 'Não foi possível listar os documentos.',
      DOWNLOAD_FAILED: 'Não foi possível baixar o documento.',
      INTERNAL_SERVER_ERROR: 'Ocorreu um erro interno.',
    };

    return res.status(status).json({
      error: {
        code,
        message: messages[code] || messages.INTERNAL_SERVER_ERROR,
      },
    });
  };
}

function createApp(options = {}) {
  const storageDirectory = path.resolve(
    options.storageDirectory || path.resolve(__dirname, '../storage'),
  );
  const maxFileSize = getMaxFileSize(options.maxFileSize);
  const documentRepository = options.documentRepository
    || createDocumentRepository(storageDirectory);
  const documentService = createDocumentService(documentRepository);
  const documentController = createDocumentController(
    documentService,
    options.resolveOwner || resolveOwner,
  );
  const uploadMiddleware = createUploadMiddleware({
    storageDirectory,
    maxFileSize,
  });

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRoutes({ documentController, uploadMiddleware }));
  app.use(createErrorHandler());

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
