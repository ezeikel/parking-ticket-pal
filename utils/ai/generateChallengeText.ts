import openai from '@/lib/openai';
import { CHALLENGE_WRITER_PROMPT, CHATGPT_MODEL } from '@/constants';

const generateChallengeText = async ({
  pcnNumber,
  formFieldPlaceholderText,
  reason,
  userEvidenceImageUrls,
  issuerEvidenceImageUrls,
}: {
  pcnNumber: string;
  formFieldPlaceholderText: string;
  reason: string;
  userEvidenceImageUrls: string[];
  issuerEvidenceImageUrls: string[];
}) => {
  const messages = [
    {
      role: 'system' as const,
      content: CHALLENGE_WRITER_PROMPT,
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Analyze these images and write a challenge for PCN ${pcnNumber}.
          
          Reason for challenge: ${reason}
          
          The response should fit this form field hint: "${formFieldPlaceholderText}"`,
        },
        ...issuerEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
        ...userEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: CHATGPT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating challenge details:', error);
    return null;
  }
};

export default generateChallengeText;
