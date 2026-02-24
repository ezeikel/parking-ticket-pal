import type { Competitor } from './types';

// eslint-disable-next-line import-x/prefer-default-export
export const competitors: Competitor[] = [
  {
    id: 'donotpay',
    name: 'DoNotPay',
    shortName: 'DoNotPay',
    category: 'app',
    description:
      'DoNotPay is an American legal tech app that once offered parking ticket appeals among many services. It has since pivoted away from direct legal help and is no longer available in the UK for parking appeals.',
    compareSlug: 'parking-ticket-pal-vs-donotpay',
    alternativeSlug: 'donotpay-alternatives',
    features: [
      { feature: 'UK parking ticket focus', ptp: true, competitor: false },
      { feature: 'AI-generated appeal letters', ptp: true, competitor: false },
      { feature: 'Tribunal case analysis', ptp: true, competitor: false },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      { feature: 'Council portal auto-submit', ptp: true, competitor: false },
      { feature: 'Free tier available', ptp: true, competitor: false },
      { feature: 'Available in the UK', ptp: true, competitor: false },
      { feature: 'Mobile app', ptp: true, competitor: true },
      { feature: 'Covers other legal areas', ptp: false, competitor: true },
    ],
    pros: [
      'Wide range of legal services in one app',
      'Pioneered the concept of automated legal assistance',
      'Strong brand recognition',
    ],
    cons: [
      'No longer available for UK parking appeals',
      'US-focused — UK parking law differs significantly',
      'Subscription-based with no free tier',
      'Has faced legal challenges over the "robot lawyer" claim',
    ],
    verdict:
      'DoNotPay popularised the idea of using technology to fight parking tickets, but it no longer serves the UK market. Parking Ticket Pal is purpose-built for UK parking tickets, using real tribunal data and UK-specific appeal strategies that DoNotPay never offered.',
    bestFor: 'US-based legal matters (not UK parking tickets)',
    alternativeSearchTerms: [
      'donotpay alternative uk',
      'donotpay parking ticket uk',
      'apps like donotpay uk',
      'donotpay replacement',
    ],
    keywords: [
      'donotpay alternative',
      'donotpay uk',
      'donotpay parking ticket',
      'parking ticket pal vs donotpay',
    ],
    faqs: [
      {
        question: 'Does DoNotPay work for UK parking tickets?',
        answer:
          'No. DoNotPay is a US-focused service and does not currently support UK parking ticket appeals. UK parking law is very different from US law, so you need a UK-specific tool like Parking Ticket Pal.',
      },
      {
        question: 'Is Parking Ticket Pal the UK version of DoNotPay?',
        answer:
          'While both use AI to help with parking tickets, Parking Ticket Pal is purpose-built for the UK market. It uses real UK tribunal decisions, understands PCN law, and can auto-submit appeals to UK council portals — features DoNotPay never offered for the UK.',
      },
      {
        question:
          'Is Parking Ticket Pal better than DoNotPay for parking tickets?',
        answer:
          'For UK parking tickets, yes. Parking Ticket Pal analyses your specific contravention code, predicts your success chances using tribunal data, and generates appeal letters citing relevant UK case law. DoNotPay cannot do any of this for UK tickets.',
      },
    ],
    whyLookForAlternatives: [
      'DoNotPay is not available in the UK for parking ticket appeals',
      'The service has pivoted away from direct legal assistance',
      'It uses a subscription model with no free option for parking tickets',
      'UK parking law (Traffic Management Act, PCN procedures) requires specialist knowledge DoNotPay lacks',
    ],
  },
  {
    id: 'solicitor',
    name: 'Hiring a Solicitor',
    shortName: 'Solicitor',
    category: 'professional',
    description:
      'Hiring a solicitor to fight a parking ticket is the traditional professional route. While solicitors offer expert legal advice, the cost typically far exceeds the value of a parking fine, making it impractical for most people.',
    compareSlug: 'parking-ticket-pal-vs-solicitor',
    alternativeSlug: 'solicitor-alternatives',
    features: [
      { feature: 'AI-generated appeal letters', ptp: true, competitor: false },
      { feature: 'Cost under £10', ptp: true, competitor: false },
      { feature: 'Instant results', ptp: true, competitor: false },
      {
        feature: 'Personalised legal advice',
        ptp: 'AI-powered',
        competitor: true,
      },
      { feature: 'Tribunal representation', ptp: false, competitor: true },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      { feature: 'Council portal auto-submit', ptp: true, competitor: false },
      { feature: 'Available 24/7', ptp: true, competitor: false },
      { feature: 'No appointments needed', ptp: true, competitor: false },
    ],
    pros: [
      'Expert legal knowledge and training',
      'Can represent you at tribunal hearings',
      'Handle complex cases with multiple legal issues',
      'Professional accountability and regulation',
    ],
    cons: [
      'Costs £150-500+ per hour — more than most parking fines',
      'Slow process: consultations, letters, follow-ups take weeks',
      'Most solicitors do not specialise in parking law',
      'Overkill for straightforward parking ticket appeals',
    ],
    verdict:
      'A solicitor makes sense for complex legal disputes, but for a parking ticket worth £65-130, the maths simply does not work. Parking Ticket Pal uses the same legal arguments and tribunal precedents at a fraction of the cost, instantly.',
    bestFor: 'Complex legal disputes with high financial stakes',
    alternativeSearchTerms: [
      'parking ticket solicitor cost',
      'cheap parking ticket help',
      'solicitor alternative parking fine',
      'fight parking ticket without solicitor',
    ],
    keywords: [
      'parking ticket pal vs solicitor',
      'parking ticket solicitor',
      'parking fine solicitor cost',
      'appeal parking ticket without solicitor',
    ],
    faqs: [
      {
        question: 'Do I need a solicitor to appeal a parking ticket?',
        answer:
          'No. The vast majority of successful parking ticket appeals are done without a solicitor. The appeal process is designed for individuals to use directly, and tools like Parking Ticket Pal can help you write professional appeal letters using the same legal arguments a solicitor would.',
      },
      {
        question: 'How much does a solicitor charge for parking tickets?',
        answer:
          'Most solicitors charge £150-500+ per hour. Even a quick consultation and letter could cost £200-400, which is more than most parking fines. This is why AI-powered tools like Parking Ticket Pal (from free to £4.99 per ticket) are far more cost-effective.',
      },
      {
        question:
          'Is Parking Ticket Pal as effective as a solicitor for parking appeals?',
        answer:
          'For standard parking ticket appeals, yes. Parking Ticket Pal analyses thousands of real tribunal decisions to identify winning arguments specific to your contravention code and issuer. For straightforward appeals, the outcome is comparable at a tiny fraction of the cost.',
      },
    ],
    whyLookForAlternatives: [
      'Solicitor fees (£150-500/hr) far exceed most parking fine amounts (£65-130)',
      'Most solicitors are not specialists in parking or traffic law',
      'The process is slow — weeks of back-and-forth for a simple appeal',
      'The parking appeal process is designed to be accessible without legal representation',
    ],
  },
  {
    id: 'diy-appeal',
    name: 'DIY Appeal (Writing Your Own)',
    shortName: 'DIY Appeal',
    category: 'diy',
    description:
      'Writing your own parking ticket appeal letter is free and entirely possible. However, many DIY appeals fail because people do not cite the right legal grounds, miss deadlines, or use emotional rather than evidence-based arguments.',
    compareSlug: 'parking-ticket-pal-vs-diy-appeal',
    alternativeSlug: 'diy-appeal-alternatives',
    features: [
      {
        feature: 'Cites relevant case law',
        ptp: true,
        competitor: 'If you research it',
      },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      {
        feature: 'Knows your contravention code',
        ptp: true,
        competitor: false,
      },
      { feature: 'Council portal auto-submit', ptp: true, competitor: false },
      { feature: 'Completely free option', ptp: true, competitor: true },
      { feature: 'No account needed', ptp: false, competitor: true },
      {
        feature: 'Professional formatting',
        ptp: true,
        competitor: 'Varies',
      },
      { feature: 'Takes under 5 minutes', ptp: true, competitor: false },
      {
        feature: 'Tribunal data-backed arguments',
        ptp: true,
        competitor: false,
      },
    ],
    pros: [
      'Completely free — no cost at all',
      'Full control over what you write',
      'No need to share personal information',
      'Good learning experience about your rights',
    ],
    cons: [
      'Most people do not know the relevant legal grounds',
      'Emotional arguments reduce your chances of success',
      'Easy to miss procedural requirements and deadlines',
      'Time-consuming research into case law and regulations',
    ],
    verdict:
      'A DIY appeal can work if you know parking law well, but most people do not. Parking Ticket Pal is free for basic appeals and does in seconds what would take hours of research — identifying the right legal arguments for your specific ticket.',
    bestFor: 'People with legal knowledge who enjoy researching parking law',
    alternativeSearchTerms: [
      'how to write parking ticket appeal',
      'parking ticket appeal letter template',
      'appeal parking fine yourself',
      'diy parking ticket appeal',
    ],
    keywords: [
      'parking ticket pal vs diy',
      'write own parking appeal',
      'parking ticket appeal letter',
      'how to appeal parking ticket yourself',
    ],
    faqs: [
      {
        question: 'Can I write my own parking ticket appeal?',
        answer:
          'Yes, absolutely. You have every right to write your own appeal. However, successful appeals typically cite specific legal grounds, relevant tribunal decisions, and procedural requirements. Parking Ticket Pal helps ensure your appeal includes these elements.',
      },
      {
        question: 'What are common DIY appeal mistakes?',
        answer:
          'The most common mistakes are: using emotional arguments instead of legal ones, not citing the specific contravention code grounds, missing appeal deadlines, and not referencing relevant tribunal decisions. Parking Ticket Pal avoids all of these automatically.',
      },
      {
        question:
          'Is a DIY appeal or Parking Ticket Pal more likely to succeed?',
        answer:
          'Appeals that cite specific legal grounds and tribunal precedents have significantly higher success rates. Parking Ticket Pal automatically identifies these for your specific ticket, giving you arguments that most DIY appeals miss.',
      },
    ],
    whyLookForAlternatives: [
      'Most DIY appeals lack proper legal arguments and have lower success rates',
      'Researching relevant case law and regulations takes hours',
      'It is easy to miss procedural requirements that invalidate your appeal',
      'Emotional arguments (which most people default to) are rarely persuasive to councils',
    ],
  },
  {
    id: 'paying-the-fine',
    name: 'Just Paying the Fine',
    shortName: 'Paying the Fine',
    category: 'inaction',
    description:
      'Many people simply pay their parking ticket without questioning it. While this is the path of least resistance, statistics show that a significant percentage of appealed tickets are overturned — meaning many people pay fines they do not owe.',
    compareSlug: 'parking-ticket-pal-vs-paying-the-fine',
    alternativeSlug: 'paying-the-fine-alternatives',
    features: [
      { feature: 'Costs you nothing extra', ptp: true, competitor: false },
      { feature: 'Takes under 5 minutes', ptp: true, competitor: true },
      { feature: 'Chance to save £65-130', ptp: true, competitor: false },
      { feature: 'No stress or effort', ptp: false, competitor: true },
      { feature: 'Checks if ticket is valid', ptp: true, competitor: false },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      { feature: 'Identifies procedural errors', ptp: true, competitor: false },
      { feature: 'Preserves your rights', ptp: true, competitor: false },
    ],
    pros: [
      'Quick and done — no further action needed',
      'No risk of the fine increasing',
      'Zero time investment',
      '50% early payment discount usually available',
    ],
    cons: [
      'You may be paying a fine you do not owe',
      'Councils and companies rely on people not appealing',
      'No chance of getting your money back',
      'You miss the opportunity to challenge potentially unfair practices',
    ],
    verdict:
      'Paying the fine is the easy option, but it is often not the right one. With Parking Ticket Pal, you can check your chances of success in under a minute — for free. If your ticket has issues, why pay when you could appeal?',
    bestFor:
      'Tickets you know are completely valid and fair, where early payment discount applies',
    alternativeSearchTerms: [
      'should i pay parking ticket',
      'should i appeal parking fine',
      'is it worth appealing parking ticket',
      'parking ticket appeal success rate',
    ],
    keywords: [
      'should i pay parking fine',
      'appeal or pay parking ticket',
      'parking ticket appeal worth it',
      'parking ticket pal vs paying fine',
    ],
    faqs: [
      {
        question: 'Should I just pay my parking ticket?',
        answer:
          'Not necessarily. Many parking tickets have procedural errors or lack proper legal grounds. Before paying, use Parking Ticket Pal (free) to check your success chances. You might have a strong case without even realising it.',
      },
      {
        question: 'What percentage of parking ticket appeals succeed?',
        answer:
          'At the independent tribunal level, around 50-60% of appeals are successful. At the informal challenge stage, success rates vary by council but can be even higher. This shows that many tickets issued should not have been.',
      },
      {
        question: 'Will my fine increase if I appeal and lose?',
        answer:
          'For council tickets (PCNs), your fine will not increase during the formal appeal process. You only lose the 50% early payment discount if you wait past the initial 14-day window before starting your challenge. For private tickets, appeals typically freeze the amount.',
      },
    ],
    whyLookForAlternatives: [
      '50-60% of tribunal appeals succeed — many fines should never have been issued',
      'Councils and parking companies rely on people paying without questioning',
      'Procedural errors in tickets are common but invisible to most people',
      'A successful appeal saves you £65-130 with minimal effort using the right tools',
    ],
  },
  {
    id: 'appealnow',
    name: 'AppealNow',
    shortName: 'AppealNow',
    category: 'app',
    description:
      'AppealNow is a UK-based app that helps drivers appeal parking tickets. While it offers some similar features to Parking Ticket Pal, it lacks tribunal data analysis and automated council submissions.',
    compareSlug: 'parking-ticket-pal-vs-appealnow',
    alternativeSlug: 'appealnow-alternatives',
    features: [
      { feature: 'AI-generated appeal letters', ptp: true, competitor: true },
      { feature: 'Tribunal case analysis', ptp: true, competitor: false },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      {
        feature: 'Council portal auto-submit',
        ptp: true,
        competitor: false,
      },
      { feature: 'Free tier available', ptp: true, competitor: 'Limited' },
      { feature: 'UK parking law focus', ptp: true, competitor: true },
      { feature: 'Mobile app', ptp: true, competitor: true },
      { feature: 'Contravention code database', ptp: true, competitor: false },
      { feature: 'Issuer-specific strategies', ptp: true, competitor: false },
    ],
    pros: [
      'UK-focused parking ticket appeal tool',
      'Offers AI-assisted letter generation',
      'Mobile-friendly interface',
    ],
    cons: [
      'No tribunal data analysis for success prediction',
      'Cannot auto-submit appeals to council portals',
      'Limited contravention code knowledge',
      'Fewer free features compared to Parking Ticket Pal',
    ],
    verdict:
      'AppealNow is a decent UK option, but Parking Ticket Pal goes further with tribunal data analysis, success prediction, and automated council submissions. If you want the best chance of winning your appeal with minimal effort, PTP is the stronger choice.',
    bestFor: 'A basic UK parking appeal tool if you prefer a simpler interface',
    alternativeSearchTerms: [
      'appealnow alternative',
      'appealnow review',
      'better than appealnow',
      'appealnow parking ticket',
    ],
    keywords: [
      'parking ticket pal vs appealnow',
      'appealnow alternative',
      'appealnow review uk',
      'best parking ticket appeal app uk',
    ],
    faqs: [
      {
        question: 'Is Parking Ticket Pal better than AppealNow?',
        answer:
          'Parking Ticket Pal offers several features AppealNow does not, including tribunal case analysis, success score prediction, and automated council portal submissions. Both are UK-focused, but PTP provides more data-driven appeal strategies.',
      },
      {
        question: 'Does AppealNow have a free tier?',
        answer:
          'AppealNow offers limited free features. Parking Ticket Pal also has a free tier that includes basic appeal letter generation and access to the contravention code database and letter templates.',
      },
      {
        question: 'Which app is better for UK parking ticket appeals?',
        answer:
          'Parking Ticket Pal offers more comprehensive features for UK parking appeals, including real tribunal data analysis, success prediction scores, and the ability to auto-submit appeals directly to council portals.',
      },
    ],
    whyLookForAlternatives: [
      'AppealNow lacks tribunal data analysis for predicting appeal success',
      'No automated council portal submission feature',
      'Limited database of contravention codes and issuer-specific information',
      'Fewer free features available without a paid plan',
    ],
  },
  {
    id: 'citizens-advice',
    name: 'Citizens Advice',
    shortName: 'Citizens Advice',
    category: 'charity',
    description:
      'Citizens Advice is a free UK charity providing general guidance on parking tickets and consumer rights. While their information is reliable, they do not write appeal letters or submit appeals on your behalf.',
    compareSlug: 'parking-ticket-pal-vs-citizens-advice',
    alternativeSlug: 'citizens-advice-alternatives',
    features: [
      { feature: 'Generates appeal letters', ptp: true, competitor: false },
      {
        feature: 'General parking rights info',
        ptp: true,
        competitor: true,
      },
      {
        feature: 'Personalised to your ticket',
        ptp: true,
        competitor: false,
      },
      { feature: 'Success score prediction', ptp: true, competitor: false },
      { feature: 'Council portal auto-submit', ptp: true, competitor: false },
      { feature: 'Completely free', ptp: 'Free tier', competitor: true },
      { feature: 'In-person advice available', ptp: false, competitor: true },
      {
        feature: 'Covers other consumer issues',
        ptp: false,
        competitor: true,
      },
      { feature: 'Available 24/7 online', ptp: true, competitor: 'Limited' },
    ],
    pros: [
      'Completely free and impartial',
      'Trusted UK charity with decades of experience',
      'Covers broader consumer rights and legal issues',
      'In-person appointments available at local offices',
    ],
    cons: [
      'General guidance only — no personalised appeal letters',
      'Cannot submit appeals on your behalf',
      'Long wait times for in-person or phone advice',
      'Information may not cover your specific contravention code',
    ],
    verdict:
      'Citizens Advice is an excellent resource for understanding your rights, but it stops at general information. Parking Ticket Pal takes the next step — turning that knowledge into a personalised, evidence-based appeal letter you can submit immediately.',
    bestFor:
      'Understanding your general rights and getting free impartial advice on broader issues',
    alternativeSearchTerms: [
      'citizens advice parking ticket',
      'free parking ticket help uk',
      'citizens advice alternative parking',
      'better than citizens advice parking',
    ],
    keywords: [
      'parking ticket pal vs citizens advice',
      'citizens advice parking ticket',
      'free parking ticket appeal help',
      'citizens advice parking fine',
    ],
    faqs: [
      {
        question: 'Is Citizens Advice enough to appeal a parking ticket?',
        answer:
          'Citizens Advice provides helpful general guidance on your rights and the appeal process, but they will not write your appeal letter or submit it for you. For a complete solution, Parking Ticket Pal generates personalised appeal letters based on your specific ticket.',
      },
      {
        question:
          'Should I use Citizens Advice or Parking Ticket Pal for my parking ticket?',
        answer:
          'They serve different purposes. Citizens Advice is great for understanding your general rights. Parking Ticket Pal is action-oriented — it analyses your specific ticket, predicts your chances, and generates a ready-to-submit appeal. You can use both together.',
      },
      {
        question: 'Is Parking Ticket Pal free like Citizens Advice?',
        answer:
          'Parking Ticket Pal has a free tier that includes basic appeal letter generation, contravention code lookup, and letter templates. Premium features like success prediction and auto-submission are available on paid plans starting from £4.99 per ticket.',
      },
    ],
    whyLookForAlternatives: [
      'Citizens Advice provides general guidance but cannot write personalised appeals',
      'Long wait times for in-person or telephone appointments',
      'Advice may not be specific to your contravention code or issuer',
      'They cannot submit appeals on your behalf or interact with council portals',
    ],
  },
];
