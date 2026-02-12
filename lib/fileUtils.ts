export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // For complex file types (PDF, Word, Excel), use server-side parsing
  if (
    fileType === 'application/pdf' ||
    fileName.endsWith('.pdf') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse file');
    }

    const data = await response.json();
    return data.text;
  }

  // Text files
  if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await file.text();
  }

  // CSV files
  if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    const text = await file.text();
    return `CSV Data:\n${text}`;
  }

  // JSON files
  if (fileType === 'application/json' || fileName.endsWith('.json')) {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      return JSON.stringify(json, null, 2);
    } catch {
      return text;
    }
  }

  // Fallback: try to read as text
  try {
    return await file.text();
  } catch (error) {
    throw new Error(`Unsupported file type: ${fileType || fileName}`);
  }
}

export function validateFileSize(file: File, maxSizeInMB: number = 10): void {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File size exceeds ${maxSizeInMB}MB limit. Please use a smaller file.`);
  }
  if (file.size === 0) {
    throw new Error('File is empty. Please select a valid file.');
  }
}

export function getSupportedFileTypes(): string {
  return '.txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls';
}
