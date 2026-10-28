const { randomUUID } = require('node:crypto');
const path = require('node:path');

function getSafeOriginalName(originalName) {
  const safeName = path.basename(String(originalName).replace(/\\/g, '/'));
  return safeName || 'document';
}

function createDocumentService(documentRepository) {
  return {
    async upload(file, owner) {
      const document = {
        id: randomUUID(),
        originalName: getSafeOriginalName(file.originalname),
        storedName: file.filename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        mimeType: file.mimetype || 'application/octet-stream',
      };

      try {
        return await documentRepository.create(document);
      } catch (error) {
        await documentRepository.removeFile(file.filename).catch(() => {});
        throw error;
      }
    },

    async list(owner) {
      const documents = await documentRepository.findByOwner(owner);
      return documents.sort((first, second) => (
        second.uploadedAt.localeCompare(first.uploadedAt)
      ));
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