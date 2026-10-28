// Limite de upload exibido/validado no frontend. Deve acompanhar o
// MAX_FILE_SIZE do backend (padrão 10 MiB).
export const MAX_FILE_SIZE = Number(import.meta.env.VITE_MAX_FILE_SIZE) || 10 * 1024 * 1024;
