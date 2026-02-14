import { extractTextFromFile, validateFileSize, getSupportedFileTypes } from '@/lib/fileUtils';

// Mock fetch
global.fetch = jest.fn();

describe('fileUtils.ts - File Processing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('extractTextFromFile', () => {
    it('should extract text from a plain text file', async () => {
      const mockText = 'This is plain text content';
      const mockFile = new File([mockText], 'test.txt', { type: 'text/plain' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockText);
    });

    it('should extract text from a markdown file', async () => {
      const mockMarkdown = '# Heading\n\nSome **bold** text';
      const mockFile = new File([mockMarkdown], 'test.md', { type: 'text/markdown' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockMarkdown);
    });

    it('should format CSV data with header', async () => {
      const mockCSV = 'name,age\nJohn,30\nJane,25';
      const mockFile = new File([mockCSV], 'test.csv', { type: 'text/csv' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(`CSV Data:\n${mockCSV}`);
    });

    it('should parse and format JSON files', async () => {
      const mockJSON = JSON.stringify({ name: 'John', age: 30 });
      const mockFile = new File([mockJSON], 'test.json', { type: 'application/json' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(JSON.stringify({ name: 'John', age: 30 }, null, 2));
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidJSON = '{ invalid json }';
      const mockFile = new File([invalidJSON], 'test.json', { type: 'application/json' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(invalidJSON);
    });

    it('should use API for PDF files', async () => {
      const mockPDFContent = 'Extracted PDF text';
      const mockFile = new File(['fake pdf content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: mockPDFContent })
      });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockPDFContent);
      expect(global.fetch).toHaveBeenCalledWith('/api/parse-file', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    it('should use API for Word documents', async () => {
      const mockDocxContent = 'Extracted Word content';
      const mockFile = new File(['fake docx content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: mockDocxContent })
      });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockDocxContent);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use API for Excel files', async () => {
      const mockExcelContent = 'Sheet1\nName,Value\nItem1,100';
      const mockFile = new File(['fake xlsx content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: mockExcelContent })
      });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockExcelContent);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors for complex file types', async () => {
      const mockFile = new File(['fake pdf content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to parse PDF' })
      });

      await expect(extractTextFromFile(mockFile)).rejects.toThrow('Failed to parse PDF');
    });

    it('should fallback to text reading for unknown types', async () => {
      const mockContent = 'Some text content';
      const mockFile = new File([mockContent], 'test.unknown', { type: 'application/unknown' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockContent);
    });

    it('should throw error if fallback text reading fails', async () => {
      // Create a mock file that will fail to read as text
      const mockFile = {
        type: 'application/binary',
        name: 'test.bin',
        text: jest.fn().mockRejectedValue(new Error('Cannot read as text'))
      } as any;

      await expect(extractTextFromFile(mockFile)).rejects.toThrow('Unsupported file type');
    });

    it('should detect file type by extension when MIME type is missing', async () => {
      const mockText = 'Plain text';
      const mockFile = new File([mockText], 'test.txt', { type: '' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockText);
    });
  });

  describe('validateFileSize', () => {
    it('should pass validation for files within size limit', () => {
      const mockFile = new File(['x'.repeat(1024)], 'test.txt', { type: 'text/plain' });

      expect(() => validateFileSize(mockFile, 1)).not.toThrow();
    });

    it('should throw error for files exceeding size limit', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const mockFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

      expect(() => validateFileSize(mockFile, 10)).toThrow('File size exceeds 10MB limit');
    });

    it('should throw error for empty files', () => {
      const mockFile = new File([], 'empty.txt', { type: 'text/plain' });

      expect(() => validateFileSize(mockFile)).toThrow('File is empty');
    });

    it('should use default size limit of 10MB', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const mockFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

      expect(() => validateFileSize(mockFile)).toThrow('File size exceeds 10MB limit');
    });

    it('should accept custom size limits', () => {
      const content = 'x'.repeat(3 * 1024 * 1024); // 3MB
      const mockFile = new File([content], 'medium.txt', { type: 'text/plain' });

      // Should pass with 5MB limit
      expect(() => validateFileSize(mockFile, 5)).not.toThrow();

      // Should fail with 2MB limit
      expect(() => validateFileSize(mockFile, 2)).toThrow('File size exceeds 2MB limit');
    });
  });

  describe('getSupportedFileTypes', () => {
    it('should return a comma-separated list of supported extensions', () => {
      const result = getSupportedFileTypes();

      expect(result).toBe('.txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls');
      expect(result).toContain('.txt');
      expect(result).toContain('.pdf');
      expect(result).toContain('.docx');
      expect(result).toContain('.xlsx');
    });

    it('should return a string usable in file input accept attribute', () => {
      const result = getSupportedFileTypes();

      // Should be a valid accept attribute value
      expect(typeof result).toBe('string');
      expect(result.split(',')).toHaveLength(8);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle files with mixed case extensions', async () => {
      const mockText = 'Content';
      const mockFile = new File([mockText], 'Test.TXT', { type: 'text/plain' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockText);
    });

    it('should handle files with no extension', async () => {
      const mockText = 'Content';
      const mockFile = new File([mockText], 'README', { type: 'text/plain' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toBe(mockText);
    });

    it('should handle API timeout errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(extractTextFromFile(mockFile)).rejects.toThrow();
    });

    it('should handle network errors for server-side parsing', async () => {
      const mockFile = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(extractTextFromFile(mockFile)).rejects.toThrow('Network error');
    });

    it('should handle empty API responses', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      await expect(extractTextFromFile(mockFile)).rejects.toThrow('Failed to parse file');
    });
  });

  describe('Integration scenarios', () => {
    it('should validate file size before extraction', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const mockFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

      // Validate size separately
      expect(() => validateFileSize(mockFile, 10)).toThrow();
    });

    it('should handle consecutive file operations', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.md', { type: 'text/markdown' });

      const result1 = await extractTextFromFile(file1);
      const result2 = await extractTextFromFile(file2);

      expect(result1).toBe('content1');
      expect(result2).toBe('content2');
    });

    it('should properly format CSV with special characters', async () => {
      const csvWithSpecialChars = 'name,description\nItem1,"Contains, comma"\nItem2,"Line\\nBreak"';
      const mockFile = new File([csvWithSpecialChars], 'special.csv', { type: 'text/csv' });

      const result = await extractTextFromFile(mockFile);

      expect(result).toContain('CSV Data:');
      expect(result).toContain(csvWithSpecialChars);
    });
  });
});
