import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { log } from '@/lib/logger';
import { sanitizeText } from '@/lib/security';

// Define allowed file types and max size
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const timer = log.time('parse_file');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      log.warn('File upload attempted with no file', { operation: 'parse_file' });
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Security validation: File size check
    if (file.size > MAX_FILE_SIZE) {
      log.warn('File size exceeds limit', {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileName: file.name,
        operation: 'parse_file',
      });
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Security validation: File name sanitization
    const sanitizedFileName = sanitizeText(file.name, 255);
    const fileType = file.type;
    const fileName = sanitizedFileName.toLowerCase();
    
    // Security validation: File type check
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    const isAllowedType = ALLOWED_FILE_TYPES.includes(fileType) ||
                          ['.pdf', '.docx', '.xlsx', '.xls', '.txt', '.md', '.csv', '.json'].includes(fileExtension);
    
    if (!isAllowedType) {
      log.warn('Unsupported file type attempted', {
        fileType,
        fileName,
        operation: 'parse_file',
      });
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType || fileExtension}` },
        { status: 400 }
      );
    }

    log.info('Processing file upload', {
      fileName,
      fileType,
      fileSize: file.size,
      operation: 'parse_file',
    });

    let text = '';

    // PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const PDFParser = require('pdf2json');
        const pdfParser = new PDFParser();
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Parse PDF using promise wrapper
        text = await new Promise((resolve, reject) => {
          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError));
          });
          
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              // Extract text from all pages
              const textParts: string[] = [];
              if (pdfData.Pages) {
                for (const page of pdfData.Pages) {
                  if (page.Texts) {
                    const pageText = page.Texts
                      .map((text: any) => {
                        try {
                          return decodeURIComponent(text.R.map((r: any) => r.T).join(''));
                        } catch (e) {
                          // If decoding fails, return the raw text
                          return text.R.map((r: any) => r.T).join('');
                        }
                      })
                      .join(' ');
                    textParts.push(pageText);
                  }
                }
              }
              const result = textParts.join('\n\n');
              resolve(result || 'No text content found in PDF');
            } catch (err) {
              reject(err);
            }
          });
          
          pdfParser.parseBuffer(buffer);
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }
    // Word documents (.docx)
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }
    // Excel files (.xlsx, .xls)
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        
        const sheets = workbook.SheetNames.map(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
        });
        
        text = sheets.join('\n\n');
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }
    // Text files
    else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = await file.text();
    }
    // CSV files
    else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      text = `CSV Data:\n${await file.text()}`;
    }
    // JSON files
    else if (fileType === 'application/json' || fileName.endsWith('.json')) {
      const jsonText = await file.text();
      try {
        const json = JSON.parse(jsonText);
        text = JSON.stringify(json, null, 2);
      } catch {
        text = jsonText;
      }
    }

    // Security validation: Check extracted text is not empty
    if (!text.trim()) {
      log.warn('File contains no readable text', {
        fileName,
        fileType,
        operation: 'parse_file',
      });
      return NextResponse.json(
        { error: 'File appears to be empty or contains no readable text' },
        { status: 400 }
      );
    }

    // Sanitize and validate the extracted text
    const sanitizedText = sanitizeText(text, 100000);
    
    log.info('File parsed successfully', {
      fileName,
      fileType,
      fileSize: file.size,
      textLength: sanitizedText.length,
      operation: 'parse_file',
    });
    
    timer.end('File parsing completed');
    
    return NextResponse.json({ text: sanitizedText });
  } catch (error) {
    timer.end('File parsing failed');
    log.error('File parsing error', {
      error: error instanceof Error ? error : String(error),
      operation: 'parse_file',
    });
    return NextResponse.json(
      { error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
