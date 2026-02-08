import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ParsedLetterContent } from '@/utils/parseLetterContent';

// Parse a subject line into label and value parts
// e.g., "PCN Number: ABC123" → [{ label: "PCN Number:", value: " ABC123" }]
type SubjectPart = { label: string; value: string } | { text: string };

const parseSubjectLine = (line: string): SubjectPart[] => {
  // Match pattern like "Label: Value" or "Label - Value"
  const match = line.match(/^([^:]+:)(.*)$/);
  if (match) {
    return [{ label: match[1], value: match[2] }];
  }
  // No label:value pattern found, return as plain text
  return [{ text: line }];
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 50,
    paddingTop: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.35,
  },
  // Header section with addresses
  header: {
    marginBottom: 25,
  },
  senderBlock: {
    textAlign: 'right',
    marginBottom: 20,
  },
  addressLine: {
    fontSize: 11,
    lineHeight: 1.4,
  },
  date: {
    marginBottom: 20,
  },
  recipientBlock: {
    marginBottom: 20,
  },
  // Letter body
  salutation: {
    marginBottom: 10,
  },
  subject: {
    marginBottom: 12,
  },
  subjectLine: {
    fontSize: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectLabel: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  subjectValue: {
    fontSize: 11,
  },
  // Sections
  section: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  sectionContent: {
    lineHeight: 1.4,
  },
  paragraph: {
    marginBottom: 6,
    lineHeight: 1.4,
  },
  // Closing
  closing: {
    marginTop: 16,
  },
  signatureName: {
    marginTop: 40,
  },
});

type FreeLetterDocumentProps = {
  content: ParsedLetterContent;
  templateTitle: string;
};

const FreeLetterDocument = ({
  content,
}: FreeLetterDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with sender address right-aligned */}
        <View style={styles.header}>
          {/* Sender Block - Right aligned */}
          <View style={styles.senderBlock}>
            {content.senderBlock.map((line, index) => (
              <Text key={`sender-${index}`} style={styles.addressLine}>
                {line}
              </Text>
            ))}
          </View>

          {/* Date */}
          {content.date && (
            <View style={styles.date}>
              <Text style={styles.addressLine}>{content.date}</Text>
            </View>
          )}

          {/* Recipient Block - Left aligned */}
          <View style={styles.recipientBlock}>
            {content.recipientBlock.map((line, index) => (
              <Text key={`recipient-${index}`} style={styles.addressLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Salutation */}
        {content.salutation && (
          <View style={styles.salutation}>
            <Text>{content.salutation}</Text>
          </View>
        )}

        {/* Subject Line - Bold labels only */}
        {content.subject && (
          <View style={styles.subject}>
            {content.subject.split('\n').map((line, index) => {
              const parts = parseSubjectLine(line);
              return (
                <Text key={`subject-${index}`} style={styles.subjectLine}>
                  {parts.map((part, partIndex) => {
                    if ('text' in part) {
                      return (
                        <Text key={partIndex} style={styles.subjectLabel}>
                          {part.text}
                        </Text>
                      );
                    }
                    return (
                      <Text key={partIndex}>
                        <Text style={styles.subjectLabel}>{part.label}</Text>
                        <Text style={styles.subjectValue}>{part.value}</Text>
                      </Text>
                    );
                  })}
                </Text>
              );
            })}
          </View>
        )}

        {/* Body Sections */}
        {content.sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            {/* Section Heading - Bold */}
            {section.heading && (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            )}
            {/* Section Content */}
            {section.content && (
              <View>
                {section.content.split('\n\n').map((para, paraIndex) => (
                  <Text
                    key={`para-${sectionIndex}-${paraIndex}`}
                    style={styles.paragraph}
                  >
                    {para.replace(/\n/g, ' ')}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Closing */}
        {content.closing && (
          <View style={styles.closing}>
            <Text>{content.closing}</Text>
          </View>
        )}

        {/* Signature Name */}
        {content.signatureName && (
          <View style={styles.signatureName}>
            {content.signatureName.split('\n').map((line, index) => (
              <Text key={`sig-${index}`}>{line}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FreeLetterDocument;
