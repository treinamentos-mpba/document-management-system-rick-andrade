const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');
const { createApp } = require('../src/app');

async function startTestServer(t, options = {}) {
  const storageDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dms-backend-test-'),
  );
  const testApp = createApp({
    storageDirectory,
    maxFileSize: options.maxFileSize || 1024,
    maxDocumentsPerOwner: options.maxDocumentsPerOwner || 100,
    resolveOwner: (req) => req.get('x-test-owner') || 'test-owner',
  });
  const server = testApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  return {
    storageDirectory,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

function createUploadBody(contents = 'document contents', filename = 'report.txt') {
  const formData = new FormData();
  formData.append('file', new Blob([contents], { type: 'text/plain' }), filename);
  return formData;
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download funcionam e respeitam o proprietário', async (t) => {
  const { baseUrl, storageDirectory } = await startTestServer(t);
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-test-owner': 'owner-one' },
    body: createUploadBody(),
  });

  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'report.txt');
  assert.strictEqual(uploadedDocument.owner, 'owner-one');
  assert.strictEqual(uploadedDocument.size, Buffer.byteLength('document contents'));
  assert.ok(uploadedDocument.id);
  assert.ok(uploadedDocument.uploadedAt);
  assert.strictEqual('storedName' in uploadedDocument, false);

  const storedFiles = await fs.readdir(storageDirectory);
  assert.strictEqual(storedFiles.length, 1);
  assert.notStrictEqual(storedFiles[0], 'report.txt');
  assert.deepStrictEqual(
    await fs.readFile(path.join(storageDirectory, storedFiles[0])),
    Buffer.from('document contents'),
  );

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-test-owner': 'owner-one' },
  });
  assert.strictEqual(listResponse.status, 200);
  const listedDocuments = await listResponse.json();
  assert.deepStrictEqual(
    listedDocuments.documents.map((document) => document.id),
    [uploadedDocument.id],
  );

  const otherOwnerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-test-owner': 'owner-two' },
  });
  assert.deepStrictEqual((await otherOwnerListResponse.json()).documents, []);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'x-test-owner': 'owner-one' } },
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'document contents');
  assert.match(downloadResponse.headers.get('content-disposition'), /report\.txt/);
  assert.match(
    downloadResponse.headers.get('content-type'),
    /application\/octet-stream/,
  );
  assert.strictEqual(
    downloadResponse.headers.get('x-content-type-options'),
    'nosniff',
  );

  const otherOwnerDownloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'x-test-owner': 'owner-two' } },
  );
  assert.strictEqual(otherOwnerDownloadResponse.status, 404);

  await fs.rm(path.join(storageDirectory, storedFiles[0]));
  const missingFileDownloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'x-test-owner': 'owner-one' } },
  );
  assert.strictEqual(missingFileDownloadResponse.status, 404);
});

test('upload sem arquivo retorna erro 400', async (t) => {
  const { baseUrl } = await startTestServer(t);
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });

  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');
});

test('upload acima do limite retorna erro 413', async (t) => {
  const { baseUrl } = await startTestServer(t, { maxFileSize: 4 });
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadBody('larger than limit'),
  });

  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});

test('upload acima do limite de documentos por usuário retorna erro 409', async (t) => {
  const { baseUrl, storageDirectory } = await startTestServer(t, {
    maxDocumentsPerOwner: 1,
  });

  const firstResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadBody(),
  });
  assert.strictEqual(firstResponse.status, 201);

  const secondResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadBody('another file', 'other.txt'),
  });
  assert.strictEqual(secondResponse.status, 409);
  assert.strictEqual(
    (await secondResponse.json()).error.code,
    'DOCUMENT_LIMIT_REACHED',
  );

  // O arquivo físico do upload rejeitado deve ser removido.
  const storedFiles = await fs.readdir(storageDirectory);
  assert.strictEqual(storedFiles.length, 1);
});

test('download de identificador desconhecido retorna 404', async (t) => {
  const { baseUrl } = await startTestServer(t);
  const response = await fetch(
    `${baseUrl}/documents/unknown-document/download`,
  );

  assert.strictEqual(response.status, 404);
  assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('a variável de ambiente STORAGE_DIR define o diretório de armazenamento', async (t) => {
  const storageDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dms-storage-env-test-'),
  );
  const previousStorageDir = process.env.STORAGE_DIR;
  process.env.STORAGE_DIR = storageDirectory;

  const testApp = createApp({
    maxFileSize: 1024,
    resolveOwner: () => 'test-owner',
  });
  const server = testApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  t.after(async () => {
    if (previousStorageDir === undefined) {
      delete process.env.STORAGE_DIR;
    } else {
      process.env.STORAGE_DIR = previousStorageDir;
    }
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  const uploadResponse = await fetch(`http://127.0.0.1:${port}/upload`, {
    method: 'POST',
    body: createUploadBody(),
  });

  assert.strictEqual(uploadResponse.status, 201);
  const storedFiles = await fs.readdir(storageDirectory);
  assert.strictEqual(storedFiles.length, 1);
});
