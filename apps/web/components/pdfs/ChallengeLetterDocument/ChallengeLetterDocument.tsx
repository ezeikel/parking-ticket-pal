import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import SignatureSvg from '../SignatureSvg/SignatureSvg';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  recipientInfo: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  senderInfo: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: 'right',
  },
  addressLine: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  date: {
    fontSize: 10,
    marginTop: 20,
    marginBottom: 40,
  },
  salutation: {
    fontSize: 12,
    marginBottom: 20,
  },
  subject: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 30,
  },
  closing: {
    fontSize: 11,
    marginBottom: 0, // 40
  },
  signature: {
    fontSize: 11,
    marginTop: 0, // 20
  },
});

type ChallengeLetterData = {
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderPostcode: string;
  senderEmail?: string | null;
  senderPhone?: string | null;
  date: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostcode: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatureName: string;
  signatureUrl?: string | null;
  signaturePaths?: string[];
  signatureViewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type ChallengeLetterDocumentProps = {
  content: ChallengeLetterData;
};

const ChallengeLetterDocument = ({ content }: ChallengeLetterDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header with recipient on left and sender on right */}
      <View style={styles.header}>
        <View style={styles.recipientInfo}>
          <Text style={styles.addressLine}>{content.recipientName}</Text>
          <Text style={styles.addressLine}>{content.recipientAddress}</Text>
          <Text style={styles.addressLine}>{content.recipientCity}</Text>
          <Text style={styles.addressLine}>{content.recipientPostcode}</Text>
        </View>
        <View style={styles.senderInfo}>
          <Text style={[styles.addressLine, styles.senderInfo]}>
            {content.senderName}
          </Text>
          <Text style={[styles.addressLine, styles.senderInfo]}>
            {content.senderAddress}
          </Text>
          <Text style={[styles.addressLine, styles.senderInfo]}>
            {content.senderCity}
          </Text>
          <Text style={[styles.addressLine, styles.senderInfo]}>
            {content.senderPostcode}
          </Text>
          {content.senderEmail && (
            <Text style={[styles.addressLine, styles.senderInfo]}>
              {content.senderEmail}
            </Text>
          )}
          {content.senderPhone && (
            <Text style={[styles.addressLine, styles.senderInfo]}>
              {content.senderPhone}
            </Text>
          )}
        </View>
      </View>

      {/* Date */}
      <Text style={styles.date}>{content.date}</Text>

      {/* Salutation */}
      <Text style={styles.salutation}>{content.salutation}</Text>

      {/* Subject */}
      <Text style={styles.subject}>{content.subject}</Text>

      {/* Body */}
      <Text style={styles.body}>{content.body}</Text>

      {/* Closing */}
      <Text style={styles.closing}>{content.closing}</Text>

      {/* Signature */}
      {content.signaturePaths && content.signaturePaths.length > 0 ? (
        <>
          <SignatureSvg
            signaturePaths={content.signaturePaths}
            signatureViewBox={content.signatureViewBox}
            width={200}
            height={100}
          />
          <Text style={styles.signature}>{content.signatureName}</Text>
        </>
      ) : (
        <Text style={styles.signature}>{content.signatureName}</Text>
      )}
    </Page>
  </Document>
);

export default ChallengeLetterDocument;
