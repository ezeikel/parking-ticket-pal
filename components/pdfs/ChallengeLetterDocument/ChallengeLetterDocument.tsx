import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#E4E4E4',
    padding: 10,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.5,
  },
});

type ChallengeLetterDocumentProps = {
  content: string;
};

const ChallengeLetterDocument = ({ content }: ChallengeLetterDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.body}>{content}</Text>
      </View>
    </Page>
  </Document>
);

export default ChallengeLetterDocument;
