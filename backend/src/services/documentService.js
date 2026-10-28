const { randomUUID } = require('node:crypto');
const path = require('node:path');

// Sanitiza o nome original: dado não confiável, nunca usado para montar caminhos.
function getSafeOriginalName(originalName) {
  const safeName = path.basename(String(originalName).replace(/\\/g, '/'));
  return safeName || 'document';
}

function createDocumentLimitError() {
  const error = new Error('O limite de documentos do usuário foi atingido.');
  error.code = 'DOCUMENT_LIMIT_REACHED';
  return error;
}

// Constrói os metadados do documento a partir do arquivo recebido.
function buildDocumentMetadata(file, owner) {
  return {
    id: randomUUID(),
    originalName: getSafeOriginalName(file.originalname),
    storedName: file.filename,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype || 'application/octet-stream',
  };
}

function byMostRecentUpload(first, second) {
  return second.uploadedAt.localeCompare(first.uploadedAt);
}

function createDocumentService(documentRepository, { maxDocumentsPerOwner }) {
  // Descarta o arquivo físico de um upload que não pôde ser aceito.
  async function discardStoredFile(storedName) {
    await documentRepository.removeFile(storedName).catch(() => {});
  }

  async function ensureUploadAllowed(owner) {
    const ownerDocuments = await documentRepository.findByOwner(owner);
    if (ownerDocuments.length >= maxDocumentsPerOwner) {
      throw createDocumentLimitError();
    }
  }

  return {
    async upload(file, owner) {
      try {
        await ensureUploadAllowed(owner);
        return await documentRepository.create(buildDocumentMetadata(file, owner));
      } catch (error) {
        await discardStoredFile(file.filename);
        throw error;
      }
    },

    async list(owner) {
      const documents = await documentRepository.findByOwner(owner);
      return documents.sort(byMostRecentUpload);
    },

    async getForDownload(id, owner) {
      const document = await documentRepository.findById(id);
      if (!document || document.owner !== owner) {
        return null;
      }

      const filePath = await documentRepository.findExistingFile(document.storedName);
      if (!filePath) {
        return null;
      }

      return { document, filePath };
    },
  };
}

module.exports = { createDocumentService };