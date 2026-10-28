const fs = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository(storageDirectory) {
  const documents = new Map();
  const storageRoot = path.resolve(storageDirectory);

  function getStoredFilePath(storedName) {
    if (typeof storedName !== 'string' || path.basename(storedName) !== storedName) {
      throw new Error('Nome de arquivo armazenado inválido.');
    }

    const storedFilePath = path.resolve(storageRoot, storedName);
    if (!storedFilePath.startsWith(`${storageRoot}${path.sep}`)) {
      throw new Error('Caminho de arquivo armazenado inválido.');
    }

    return storedFilePath;
  }

  return {
    async create(document) {
      documents.set(document.id, { ...document });
      return { ...document };
    },

    async findById(id) {
      const document = documents.get(id);
      return document ? { ...document } : null;
    },

    async findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .map((document) => ({ ...document }));
    },

    async findExistingFile(storedName) {
      const storedFilePath = getStoredFilePath(storedName);

      try {
        await fs.access(storedFilePath);
        return storedFilePath;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return null;
        }

        throw error;
      }
    },

    async removeFile(storedName) {
      await fs.rm(getStoredFilePath(storedName), { force: true });
    },
  };
}

module.exports = { createDocumentRepository };