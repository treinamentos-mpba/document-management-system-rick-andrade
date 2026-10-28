const express = require('express');

function createDocumentRoutes({ documentController, uploadMiddleware }) {
  const router = express.Router();

  router.post('/upload', uploadMiddleware, documentController.upload);
  router.get('/documents', documentController.list);
  router.get('/documents/:id/download', documentController.download);

  return router;
}

module.exports = { createDocumentRoutes };