function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function createOperationError(apiCode, publicMessage, cause) {
  const error = new Error(publicMessage, { cause });
  error.status = 500;
  error.apiCode = apiCode;
  error.publicMessage = publicMessage;
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
        if (error.code === 'DOCUMENT_LIMIT_REACHED') {
          return res.status(409).json({
            error: {
              code: 'DOCUMENT_LIMIT_REACHED',
              message: 'O limite de documentos do usuário foi atingido.',
            },
          });
        }

        return next(createOperationError(
          'UPLOAD_FAILED',
          'Não foi possível enviar o documento.',
          error,
        ));
      }
    },

    async list(req, res, next) {
      try {
        const documents = await documentService.list(resolveOwner(req));
        return res.status(200).json({
          documents: documents.map(toPublicDocument),
        });
      } catch (error) {
        return next(createOperationError(
          'DOCUMENT_LIST_FAILED',
          'Não foi possível listar os documentos.',
          error,
        ));
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
        // Content-Type e Content-Length ficam a cargo do Express (res.download),
        // evitando refletir o mimeType controlado pelo cliente e divergências
        // entre o metadado e o arquivo real em disco.
        return res.download(
          filePath,
          document.originalName,
          (error) => {
            if (error) {
              next(createOperationError(
                'DOWNLOAD_FAILED',
                'Não foi possível baixar o documento.',
                error,
              ));
            }
          },
        );
      } catch (error) {
        return next(createOperationError(
          'DOWNLOAD_FAILED',
          'Não foi possível baixar o documento.',
          error,
        ));
      }
    },
  };
}

module.exports = { createDocumentController };