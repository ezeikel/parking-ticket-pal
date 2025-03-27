import {
  Html,
  Head,
  Preview,
  Body,
  Text,
  Container,
} from '@react-email/components';

interface ReminderEmailProps {
  name: string;
  reminderType: '14-day' | '28-day';
  pcnNumber: string;
  vehicleRegistration: string;
  issueDate: string;
  issuer: string;
}

export default function ReminderEmail({
  name,
  reminderType,
  pcnNumber,
  vehicleRegistration,
  issueDate,
  issuer,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reminder: Your ticket deadline is approaching</Preview>
      <Body
        style={{ backgroundColor: '#fff', fontFamily: 'Arial, sans-serif' }}
      >
        <Container style={{ padding: '20px' }}>
          <Text>Hi {name},</Text>
          <Text>
            This is a quick reminder that your parking ticket {pcnNumber} for
            vehicle registration {vehicleRegistration} issued on {issueDate} by{' '}
            {issuer} is approaching the{' '}
            {reminderType === '14-day'
              ? '14-day reduced payment'
              : '28-day final payment'}{' '}
            deadline.
          </Text>
          <Text>
            Please log into Parking Ticket Pal to review your options or take
            action before it's too late.
          </Text>
          <Text>— Parking Ticket Pal</Text>
        </Container>
      </Body>
    </Html>
  );
}
