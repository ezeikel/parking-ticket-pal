import ReactPDF from '@react-pdf/renderer';
import ChallengeLetterDocument from '@/components/pdfs/ChallengeLetterDocument/ChallengeLetterDocument';

const generatePDF = async (content: string) => {
  const doc = <ChallengeLetterDocument content={content} />;

  try {
    // TODO: temporarily save the PDF to the file system for testing
    ReactPDF.render(doc, `example.pdf`);

    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export default generatePDF;
