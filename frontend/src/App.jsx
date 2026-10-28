import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadDocuments() {
      setIsLoading(true);
      setListError('');

      try {
        const result = await listDocuments({ signal: abortController.signal });
        setDocuments(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setListError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => abortController.abort();
  }, [refreshVersion]);

  async function handleUpload(file) {
    await uploadDocument(file);
    setRefreshVersion((version) => version + 1);
  }

  function retryList() {
    setRefreshVersion((version) => version + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-content">
          <a className="brand" href="/" aria-label="DMS, início">
            <span className="brand-mark" aria-hidden="true">D</span>
            <span className="brand-copy">
              <span className="brand-name">DMS</span>
              <span className="brand-caption">ARQUIVO LOCAL</span>
            </span>
          </a>
          <span className="topbar-section">Biblioteca</span>
          <span className="connection-state">
            <span className="connection-dot" aria-hidden="true" />
            Ambiente local
          </span>
        </div>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1>Seus documentos</h1>
            <p className="page-description">Arquivos recentes e enviados por você.</p>
          </div>
          <div className="document-count" aria-live="polite">
            <span className="count-number">{documents.length}</span>
            <span className="count-label">
              {documents.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>
        </div>

        <div className="workspace-grid">
          <section className="upload-panel" aria-labelledby="upload-heading">
            <div className="panel-heading">
              <span className="panel-index">01</span>
              <h2 id="upload-heading">Adicionar arquivo</h2>
            </div>
            <UploadComponent onUpload={handleUpload} />
            <p className="storage-note">
              <span className="storage-indicator" aria-hidden="true" />
              Armazenamento neste dispositivo
            </p>
          </section>

          <section className="documents-panel" aria-labelledby="documents-heading">
            <div className="documents-heading">
              <div>
                <p className="eyebrow">ARQUIVO</p>
                <h2 id="documents-heading">Documentos recentes</h2>
              </div>
              <span className="sort-label">Mais recentes</span>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={retryList}
            />
          </section>
        </div>
      </main>
      <footer className="app-footer">
        <span>DMS</span>
        <span>Gerenciamento de documentos</span>
      </footer>
    </div>
  );
}
