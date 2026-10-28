const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createDocumentRoutes } = require('./routes/documentRoutes');
const { createDocumentService } = require('./services/documentService');
const { createUploadMiddleware } = require('./infra/uploadMiddleware');

const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_DOCUMENTS_PER_OWNER = 100;

function getPositiveIntegerFromEnv(name, defaultValue) {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }

  return value;
}

function getMaxFileSize(configuredMaxFileSize) {
  if (configuredMaxFileSize !== undefined) {
    return configuredMaxFileSize;
  }

  return getPositiveIntegerFromEnv('MAX_FILE_SIZE', DEFAULT_MAX_FILE_SIZE);
}

function getMaxDocumentsPerOwner(configuredMaxDocuments) {
  if (configuredMaxDocuments !== undefined) {
    return configuredMaxDocuments;
  }

  return getPositiveIntegerFromEnv(
    'MAX_DOCUMENTS_PER_OWNER',
    DEFAULT_MAX_DOCUMENTS_PER_OWNER,
  );
}

function getStorageDirectory(configuredStorageDirectory) {
  // Padrão resolvido a partir deste arquivo, independente do cwd do processo.
  return path.resolve(
    configuredStorageDirectory
      || process.env.STORAGE_DIR
      || path.resolve(__dirname, '../storage'),
  );
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

    // Registra o erro inesperado (e a causa original) sem expor detalhes ao cliente.
    console.error('Erro ao processar a requisição:', error, error.cause || '');

    const status = error.status || 500;
    const code = error.apiCode || 'INTERNAL_SERVER_ERROR';
    const message = error.publicMessage || 'Ocorreu um erro interno.';

    return res.status(status).json({ error: { code, message } });
  };
}

function createApp(options = {}) {
  const storageDirectory = getStorageDirectory(options.storageDirectory);
  const maxFileSize = getMaxFileSize(options.maxFileSize);
  const maxDocumentsPerOwner = getMaxDocumentsPerOwner(options.maxDocumentsPerOwner);
  const documentRepository = options.documentRepository
    || createDocumentRepository(storageDirectory);
  const documentService = createDocumentService(documentRepository, {
    maxDocumentsPerOwner,
  });
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
  // Impede que navegadores "adivinhem" o tipo do conteúdo (defesa em profundidade).
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
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
