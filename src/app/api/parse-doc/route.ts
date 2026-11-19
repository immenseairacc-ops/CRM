import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (filename.endsWith('.txt')) {
      const text = buffer.toString('utf-8');
      return NextResponse.json({ ok: true, text });
    }

    if (filename.endsWith('.docx')) {
      // Extract HTML with embedded images (GIF, PNG, JPG as base64 dataUri)
      const htmlResult = await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.dataUri,
        }
      );
      const html = htmlResult.value || '';
      
      // Convert HTML line breaks / paragraphs to clean newline-separated text
      let textWithNewlines = html
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '') // strip all other tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      // Normalize line breaks
      textWithNewlines = textWithNewlines
        .split('\n')
        .map((line: string) => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // If textWithNewlines is empty, fallback to rawText
      if (!textWithNewlines) {
        const rawResult = await mammoth.extractRawText({ buffer });
        textWithNewlines = (rawResult.value || '').trim();
      }

      return NextResponse.json({ ok: true, text: textWithNewlines, html });
    }

    // Fallback for .doc or other formats
    const rawContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    const cleaned = rawContent.replace(/\s+/g, ' ').trim();
    return NextResponse.json({ ok: true, text: cleaned });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error parsing word document:', err);
    return NextResponse.json({ ok: false, error: msg || 'Failed to parse document' }, { status: 500 });
  }
}
