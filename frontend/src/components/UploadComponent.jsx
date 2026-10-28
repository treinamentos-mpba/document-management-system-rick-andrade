import { useRef, useState } from 'react';
import { MAX_FILE_SIZE } from '../config.js';
import { formatFileSize } from '../utils/formatFileSize.js';

export default function UploadComponent({ onUpload }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function selectFile(file) {
    if (!file) {
      return;
    }

    // Valida o tamanho antes do envio para evitar descobrir o 413 só no fim.
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setStatus('');
      setError(`O arquivo excede o limite de ${formatFileSize(MAX_FILE_SIZE)}.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setError('');
    setStatus('');
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');
    setStatus('');

    try {
      await onUpload(selectedFile);
      setStatus('Documento enviado.');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function clearSelection() {
    setSelectedFile(null);
    setError('');
    setStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div
        className={`drop-zone${isDragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <span className="upload-glyph" aria-hidden="true">+</span>
        {selectedFile ? (
          <div className="selected-file">
            <span className="selected-file-name" title={selectedFile.name}>
              {selectedFile.name}
            </span>
            <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
          </div>
        ) : (
          <span className="drop-label">Nenhum arquivo selecionado</span>
        )}
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          onChange={(event) => selectFile(event.target.files[0])}
          aria-label="Selecionar documento"
        />
        <button
          className="select-file-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Selecionar arquivo
        </button>
      </div>

      <div className="upload-actions">
        <button className="primary-button upload-submit" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
        {selectedFile && (
          <button className="text-button" type="button" onClick={clearSelection} disabled={isUploading}>
            Remover
          </button>
        )}
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {status && <p className="form-message success-message" role="status">{status}</p>}
    </form>
  );
}