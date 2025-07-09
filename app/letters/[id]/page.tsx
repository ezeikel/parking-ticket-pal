import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import {
  faArrowLeft,
  faDownload,
  faEnvelope,
} from '@fortawesome/pro-regular-svg-icons';
import { getLetter } from '@/app/actions/letter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LetterType } from '@prisma/client';

type LetterPageProps = {
  params: Promise<{ id: string }>;
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

const LetterPage = async ({ params }: LetterPageProps) => {
  const { id } = await params;
  const result = await getLetter(id);

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Letter Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The letter you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Link href="/tickets">
            <Button>Back to Tickets</Button>
          </Link>
        </div>
      </div>
    );
  }

  const letter = result.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/tickets/${letter.ticket.id}`}>
          <Button variant="ghost" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            <span>Back to Ticket</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline">
            <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {getLetterTypeLabel(letter.type)}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                PCN: {letter.ticket.pcnNumber}
              </p>
            </div>
            <Badge className={getLetterTypeColor(letter.type)}>
              {letter.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Letter Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Sent Date:</span>
                  <span className="ml-2">
                    {letter.sentAt
                      ? format(new Date(letter.sentAt), 'PPP')
                      : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">
                    {format(new Date(letter.createdAt), 'PPP')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Images:</span>
                  <span className="ml-2">
                    {letter.media.length} image
                    {letter.media.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {letter.amountIncrease && (
              <div>
                <h3 className="font-semibold mb-2">Amount Increase</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">New Amount:</span>
                    <span className="ml-2 font-medium">
                      £{(letter.amountIncrease.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Effective Date:
                    </span>
                    <span className="ml-2">
                      {format(
                        new Date(letter.amountIncrease.effectiveAt),
                        'PPP',
                      )}
                    </span>
                  </div>
                  {letter.amountIncrease.reason && (
                    <div>
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="ml-2">
                        {letter.amountIncrease.reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {letter.summary && (
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{letter.summary}</p>
            </div>
          )}

          {letter.extractedText && (
            <div>
              <h3 className="font-semibold mb-2">Extracted Text</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {letter.extractedText}
                </pre>
              </div>
            </div>
          )}

          {letter.media.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Letter Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {letter.media.map((media, index) => (
                  <div
                    key={media.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <img
                      src={media.url}
                      alt={`Letter image ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                    <div className="p-2 bg-muted/20 text-center text-sm">
                      {media.description || `Image ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LetterPage;
