function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function createOperationError(apiCode, cause) {
  const error = new Error('A operação do documento falhou.', { cause });
  error.status = 500;
  error.apiCode = apiCode;
  return error;
}

function createDocumentController(documentService, resolveOwner) {
  return {
    async upload(req, res, next) {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'Envie um arquivo no campo "file".',
          },
        });
      }

      try {
        const document = await documentService.upload(
          req.file,
          resolveOwner(req),
        );
        return res.status(201).json(toPublicDocument(document));
      } catch (error) {
        return next(createOperationError('UPLOAD_FAILED', error));
      }
    },

    async list(req, res, next) {
      try {
        const documents = await documentService.list(resolveOwner(req));
        return res.status(200).json({
          documents: documents.map(toPublicDocument),
        });
      } catch (error) {
        return next(createOperationError('DOCUMENT_LIST_FAILED', error));
      }
    },

    async download(req, res, next) {
      try {
        const result = await documentService.getForDownload(
          req.params.id,
          resolveOwner(req),
        );

        if (!result) {
          return res.status(404).json({
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Documento não encontrado.',
            },
          });
        }

        const { document, filePath } = result;
        return res.download(
          filePath,
          document.originalName,
          {
            headers: {
              'Content-Type': document.mimeType || 'application/octet-stream',
              'Content-Length': String(document.size),
            },
          },
          (error) => {
            if (error) {
              next(createOperationError('DOWNLOAD_FAILED', error));
            }
          },
        );
      } catch (error) {
        return next(createOperationError('DOWNLOAD_FAILED', error));
      }
    },
  };
}

module.exports = { createDocumentController };