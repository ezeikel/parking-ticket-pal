'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faFileAlt,
  faCalendar,
  faDownload,
} from '@fortawesome/pro-regular-svg-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Prisma, LetterType } from '@prisma/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

type LetterWithMedia = Prisma.LetterGetPayload<{
  include: {
    media: true;
  };
}>;

type LettersSectionProps = {
  letters: LetterWithMedia[];
};

const getLetterTypeLabel = (type: LetterType): string => {
  switch (type) {
    case LetterType.INITIAL_NOTICE:
      return 'Initial Notice';
    case LetterType.NOTICE_TO_OWNER:
      return 'Notice to Owner';
    case LetterType.CHARGE_CERTIFICATE:
      return 'Charge Certificate';
    case LetterType.ORDER_FOR_RECOVERY:
      return 'Order for Recovery';
    case LetterType.CCJ_NOTICE:
      return 'CCJ Notice';
    case LetterType.FINAL_DEMAND:
      return 'Final Demand';
    case LetterType.BAILIFF_NOTICE:
      return 'Bailiff Notice';
    case LetterType.APPEAL_RESPONSE:
      return 'Appeal Response';
    case LetterType.GENERIC:
      return 'Generic Letter';
    default:
      return 'Unknown';
  }
};

const getLetterTypeColor = (type: LetterType): string => {
  switch (type) {
    case LetterType.INITIAL_NOTICE:
    case LetterType.NOTICE_TO_OWNER:
      return 'bg-blue-100 text-blue-800';
    case LetterType.CHARGE_CERTIFICATE:
    case LetterType.ORDER_FOR_RECOVERY:
      return 'bg-orange-100 text-orange-800';
    case LetterType.CCJ_NOTICE:
    case LetterType.FINAL_DEMAND:
    case LetterType.BAILIFF_NOTICE:
      return 'bg-red-100 text-red-800';
    case LetterType.APPEAL_RESPONSE:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const LettersSection = ({ letters }: LettersSectionProps) => {
  const router = useRouter();

  if (letters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Associated Letters</CardTitle>
          <CardDescription>
            Letters related to this ticket will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FontAwesomeIcon
              icon={faFileAlt}
              className="h-12 w-12 mb-4 opacity-50"
            />
            <p>No letters have been associated with this ticket yet.</p>
            <p className="text-sm">
              Letters will appear here when you upload them or they are
              generated.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Associated Letters</CardTitle>
        <CardDescription>
          View and manage letters related to this ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Letter Thumbnail */}
              <div className="flex-shrink-0">
                {letter.media && letter.media.length > 0 ? (
                  <div className="w-16 h-20 bg-muted rounded border overflow-hidden">
                    <img
                      src={letter.media[0].url}
                      alt={`Letter ${letter.type}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-20 bg-muted rounded border flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFileAlt}
                      className="h-6 w-6 text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Letter Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">
                        {getLetterTypeLabel(letter.type)}
                      </h3>
                      <Badge className={getLetterTypeColor(letter.type)}>
                        {letter.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <FontAwesomeIcon
                          icon={faCalendar}
                          className="h-3 w-3"
                        />
                        <span>
                          {letter.sentAt
                            ? format(new Date(letter.sentAt), 'MMM dd, yyyy')
                            : 'No date'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faFileAlt} className="h-3 w-3" />
                        <span>
                          {letter.media.length} image
                          {letter.media.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {letter.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {letter.summary}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        router.push(`/letters/${letter.id}`);
                      }}
                    >
                      <FontAwesomeIcon icon={faEye} className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    {letter.media && letter.media.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // TODO: Download letter
                          console.log('Download letter:', letter.id);
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faDownload}
                          className="h-4 w-4"
                        />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LettersSection;
