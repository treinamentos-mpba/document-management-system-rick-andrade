export function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let convertedSize = size / 1024;
  let unitIndex = 0;

  while (convertedSize >= 1024 && unitIndex < units.length - 1) {
    convertedSize /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(convertedSize)} ${units[unitIndex]}`;
}