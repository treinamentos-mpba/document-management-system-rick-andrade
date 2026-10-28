import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';
import { triggerBrowserDownload } from '../utils/triggerBrowserDownload.js';

export default function DownloadButton({ documentMetadata }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');

    try {
      const { blob, filename } = await downloadDocument(documentMetadata);
      triggerBrowserDownload(blob, filename);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="download-button"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${documentMetadata.originalName}`}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </div>
  );
}