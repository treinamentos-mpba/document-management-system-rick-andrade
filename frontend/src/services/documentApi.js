const API_PREFIX = '/api';

async function readErrorMessage(response) {
  const payload = await response.json().catch(() => null);
  return payload?.error?.message || `A solicitação falhou (${response.status}).`;
}

async function ensureSuccess(response) {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response;
}

export async function listDocuments({ signal } = {}) {
  const response = await fetch(`${API_PREFIX}/documents`, { signal });
  const result = await ensureSuccess(response).then((success) => success.json());
  return result.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  return ensureSuccess(response).then((success) => success.json());
}

export async function downloadDocument(documentMetadata) {
  const response = await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(documentMetadata.id)}/download`,
  );
  const successfulResponse = await ensureSuccess(response);

  return {
    blob: await successfulResponse.blob(),
    filename: documentMetadata.originalName,
  };
}