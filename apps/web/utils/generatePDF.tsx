import ReactPDF from '@react-pdf/renderer';
import ChallengeLetterDocument from '@/components/pdfs/ChallengeLetterDocument/ChallengeLetterDocument';

const generatePDF = async (content: any) => {
  const doc = <ChallengeLetterDocument content={content} />;

  try {
    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export default generatePDF;
