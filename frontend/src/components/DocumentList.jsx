import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatDate(uploadedAt) {
  const date = new Date(uploadedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot + 1).slice(0, 5).toUpperCase() : 'ARQ';
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="list-state" role="status">
        <span className="loading-indicator" aria-hidden="true" />
        Carregando documentos
      </div>
    );
  }

  if (error) {
    return (
      <div className="list-state list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true" />
        <h3>Nenhum documento ainda</h3>
        <p>Os arquivos enviados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="documents-table">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((documentMetadata) => (
            <tr key={documentMetadata.id}>
              <td>
                <div className="document-name-cell">
                  <span className="file-extension" aria-hidden="true">
                    {getFileExtension(documentMetadata.originalName)}
                  </span>
                  <span className="document-name" title={documentMetadata.originalName}>
                    {documentMetadata.originalName}
                  </span>
                </div>
              </td>
              <td className="muted-cell">{formatFileSize(documentMetadata.size)}</td>
              <td className="muted-cell">
                <time dateTime={documentMetadata.uploadedAt}>
                  {formatDate(documentMetadata.uploadedAt)}
                </time>
              </td>
              <td className="action-cell">
                <DownloadButton documentMetadata={documentMetadata} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}