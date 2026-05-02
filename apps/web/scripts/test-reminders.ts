/**
 * Test script: sends one email + one SMS for each of the 7 reminder types.
 *
 * Usage (from apps/web):
 *   pnpm tsx scripts/test-reminders.ts
 *
 *   # Email only:
 *   pnpm tsx scripts/test-reminders.ts --email-only
 *
 *   # SMS only:
 *   pnpm tsx scripts/test-reminders.ts --sms-only
 *
 *   # Single type:
 *   pnpm tsx scripts/test-reminders.ts --type DISCOUNT_PERIOD
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────────────────────────

const TEST_EMAIL =
  process.env.TEST_REMINDER_EMAIL || 'ezeikelpemberton@gmail.com';
const TEST_PHONE = process.env.TEST_REMINDER_PHONE || '+447774413557';

const EMAIL_ONLY = process.argv.includes('--email-only');
const SMS_ONLY = process.argv.includes('--sms-only');
const TYPE_FLAG = process.argv.find((a) => a.startsWith('--type='));
const SINGLE_TYPE =
  TYPE_FLAG?.split('=')[1] ||
  (process.argv.includes('--type')
    ? process.argv[process.argv.indexOf('--type') + 1]
    : undefined);

// ── Reminder types with labels (mirrors REMINDER_LABELS in reminder.ts) ──

const REMINDER_TYPES = [
  {
    type: 'DISCOUNT_PERIOD',
    label: '14-day discount',
    action: 'Pay at 50% discount or submit an informal challenge',
  },
  {
    type: 'FULL_CHARGE',
    label: '28-day payment',
    action: 'Pay the full amount or the penalty will escalate',
  },
  {
    type: 'NOTICE_TO_OWNER_RESPONSE',
    label: 'Formal representation',
    action: 'Make formal representations or the penalty will increase',
  },
  {
    type: 'APPEAL_DEADLINE',
    label: 'Tribunal appeal',
    action: 'Appeal to the independent adjudicator before the deadline',
  },
  {
    type: 'CHARGE_CERTIFICATE_RESPONSE',
    label: 'Charge certificate payment',
    action:
      'Pay the increased amount or the debt will be registered at court',
  },
  {
    type: 'FORM_DEADLINE',
    label: 'Witness statement',
    action:
      'File a TE9/PE3 witness statement before the deadline or bailiffs may be instructed',
  },
  {
    type: 'OUT_OF_TIME_NOTICE',
    label: 'Out of time',
    action: 'Your ticket has passed all standard appeal deadlines',
  },
];

// ── Test ticket data ────────────────────────────────────────────────────

const TICKET = {
  pcnNumber: 'ZY21310511',
  vehicleRegistration: 'GF25ZGM',
  issueDate: '30 January 2026',
  issuer: 'London Borough of Lewisham',
};

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  // Load env first
  const scriptDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(scriptDir, '../.env.local') });

  // Dynamic imports after env is loaded
  const { render } = await import('@react-email/render');
  const ReminderEmail = (await import('../emails/ReminderEmail')).default;
  const { sendEmail } = await import('../lib/email');
  const { sendSms } = await import('../lib/sms');

  const types = SINGLE_TYPE
    ? REMINDER_TYPES.filter((t) => t.type === SINGLE_TYPE)
    : REMINDER_TYPES;

  if (types.length === 0) {
    console.error(`Unknown type: ${SINGLE_TYPE}`);
    console.error(
      'Valid types:',
      REMINDER_TYPES.map((t) => t.type).join(', '),
    );
    process.exit(1);
  }

  console.log(`Testing ${types.length} reminder type(s)`);
  console.log(
    `  Email: ${EMAIL_ONLY || !SMS_ONLY ? TEST_EMAIL : 'skipped'}`,
  );
  console.log(`  SMS:   ${SMS_ONLY || !EMAIL_ONLY ? TEST_PHONE : 'skipped'}`);
  console.log();

  let emailSuccess = 0;
  let emailFail = 0;
  let smsSuccess = 0;
  let smsFail = 0;

  for (const reminder of types) {
    console.log(`── ${reminder.type} (${reminder.label}) ──`);

    // ── Email ──
    if (!SMS_ONLY) {
      try {
        const emailHtml = await render(
          ReminderEmail({
            name: 'Ezeikel',
            reminderType: reminder.label,
            pcnNumber: TICKET.pcnNumber,
            vehicleRegistration: TICKET.vehicleRegistration,
            issueDate: TICKET.issueDate,
            issuer: TICKET.issuer,
          }),
        );

        const emailText = await render(
          ReminderEmail({
            name: 'Ezeikel',
            reminderType: reminder.label,
            pcnNumber: TICKET.pcnNumber,
            vehicleRegistration: TICKET.vehicleRegistration,
            issueDate: TICKET.issueDate,
            issuer: TICKET.issuer,
          }),
          { plainText: true },
        );

        const result = await sendEmail({
          to: TEST_EMAIL,
          subject: `[TEST] ${reminder.label} deadline approaching — ${TICKET.pcnNumber}`,
          html: emailHtml,
          text: emailText,
        });

        if (result.success) {
          console.log(`  ✓ Email sent (${result.messageId})`);
          emailSuccess++;
        } else {
          console.log(`  ✗ Email failed: ${result.error}`);
          emailFail++;
        }
      } catch (err) {
        console.log(
          `  ✗ Email error: ${err instanceof Error ? err.message : err}`,
        );
        emailFail++;
      }
    }

    // ── SMS ──
    if (!EMAIL_ONLY) {
      try {
        const smsBody = `[TEST] Reminder: Your parking ticket ${TICKET.pcnNumber} for ${TICKET.vehicleRegistration}: ${reminder.action}. Check the app.`;

        const result = await sendSms({
          to: TEST_PHONE,
          body: smsBody,
        });

        if (result.success) {
          console.log(`  ✓ SMS sent (${result.sid})`);
          smsSuccess++;
        } else {
          console.log(`  ✗ SMS failed: ${result.error}`);
          smsFail++;
        }
      } catch (err) {
        console.log(
          `  ✗ SMS error: ${err instanceof Error ? err.message : err}`,
        );
        smsFail++;
      }
    }

    // Brief pause between sends to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log();
  console.log('── Results ──');
  if (!SMS_ONLY)
    console.log(`  Email: ${emailSuccess} sent, ${emailFail} failed`);
  if (!EMAIL_ONLY)
    console.log(`  SMS:   ${smsSuccess} sent, ${smsFail} failed`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
