const PDF_CONTENT = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
/MediaBox [0 0 612 792]
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test Resume) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000059 00000 n
0000000146 00000 n
0000000273 00000 n
0000000361 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
454
%%EOF`;

export function createExactSizePDF(sizeMB: number): Buffer {
  const basePDF = createTestPDF();
  const targetSize = sizeMB * 1024 * 1024;
  const padding = Buffer.alloc(Math.max(0, targetSize - basePDF.length));
  return Buffer.concat([basePDF, padding]);
}

export function createLargePDF(): Buffer {
  const basePDF = createTestPDF();
  const padding = Buffer.alloc(6 * 1024 * 1024);
  return Buffer.concat([basePDF, padding]);
}

export function createMockFile(
  content: Buffer | string = "test content",
  filename = "test.pdf",
  mimeType = "application/pdf",
): File {
  const blobContent =
    typeof content === "string" ? content : new Uint8Array(content);
  const blob = new Blob([blobContent], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

export function createMockLargePDFFile(): File {
  return createMockFile(createLargePDF(), "large.pdf", "application/pdf");
}

export function createMockPDFFile(): File {
  return createMockFile(createTestPDF(), "resume.pdf", "application/pdf");
}

export function createTestPDF(): Buffer {
  return Buffer.from(PDF_CONTENT);
}
