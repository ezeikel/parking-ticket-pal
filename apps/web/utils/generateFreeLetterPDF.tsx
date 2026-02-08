import { renderToBuffer } from '@react-pdf/renderer';
import FreeLetterDocument from '@/components/pdfs/FreeLetterDocument';
import { parseLetterContent } from './parseLetterContent';

const generateFreeLetterPDF = async (
  content: string,
  templateTitle: string,
): Promise<Buffer> => {
  // Parse the plain text content into structured format
  const parsedContent = parseLetterContent(content);

  const doc = (
    <FreeLetterDocument content={parsedContent} templateTitle={templateTitle} />
  );

  const pdfBuffer = await renderToBuffer(doc);
  return Buffer.from(pdfBuffer);
};

export default generateFreeLetterPDF;
