import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAlarmExclamation,
  faArrowRight,
  faCamera,
  faCircleQuestion,
  faMicrochipAi,
  faPuzzlePiece,
  faRobot,
} from '@fortawesome/pro-regular-svg-icons';

const ProblemPain = () => {
  const painPoints = [
    {
      icon: faAlarmExclamation,
      title: 'Crushing Deadlines',
      description:
        "You're up against the clock: just 14 days before the fine often doubles, adding to the stress.",
    },
    {
      icon: faPuzzlePiece,
      title: 'Intentionally Confusing',
      description:
        'The appeals process feels like a maze, designed to make you stumble and give up.',
    },
    {
      icon: faCircleQuestion,
      title: 'Uncertain Chances',
      description:
        "You're left guessing: Is an appeal worth it? Do I even have a case? The doubt is paralyzing.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/30">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-12 md:mb-16 leading-tight">
          Parking Tickets Are{' '}
          <span className="text-parking-blue underline">Designed</span> To
          Defeat You
        </h2>

        <div className="grid md:grid-cols-3 gap-8 md:gap-10 mb-16 md:mb-20">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="flex flex-col gap-y-4 items-center text-center p-6 rounded-lg bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <FontAwesomeIcon icon={point.icon} size="3x" />
              <div className="flex flex-col gap-y-1">
                <h3 className="text-xl md:text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
                  {point.title}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-y-8 text-center">
          <div className="flex items-center justify-center gap-x-8">
            <FontAwesomeIcon icon={faCamera} size="3x" />
            <FontAwesomeIcon icon={faArrowRight} size="3x" />
            <FontAwesomeIcon icon={faMicrochipAi} size="3x" />
            <FontAwesomeIcon icon={faArrowRight} size="3x" />
            <FontAwesomeIcon icon={faRobot} size="3x" />
          </div>
          <h3 className="font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl font-semibold">
            That's Where{' '}
            <span className="bg-parking-blue text-white font-display px-2 py-1 rounded-md whitespace-nowrap">
              Parking Ticket Pal
            </span>{' '}
            Steps In.
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Stop feeling overwhelmed. Upload a photo of your ticket, and our
            AI-powered platform analyses your case, crafts compelling appeal
            letters, and guides you every step of the way. Turn the tables on
            unfair fines.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemPain;
