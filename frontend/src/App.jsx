import DocumentsPage from './pages/DocumentsPage.jsx';
import './App.css';

export default function App() {
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
        <DocumentsPage />
      </main>

      <footer className="app-footer">
        <span>DMS</span>
        <span>Gerenciamento de documentos</span>
      </footer>
    </div>
  );
}
