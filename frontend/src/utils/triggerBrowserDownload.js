// Dispara o download de um blob no navegador criando um link temporário.
// Efeito de DOM isolado aqui para manter os services livres de UI.
export function triggerBrowserDownload(blob, filename) {
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadLink = window.document.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  window.document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}
