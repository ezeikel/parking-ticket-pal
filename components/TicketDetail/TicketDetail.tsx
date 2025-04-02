import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faCar,
  faClock,
  faMapMarkerAlt,
  faMoneyBill,
} from '@fortawesome/pro-regular-svg-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Address } from '@/types';
import DueDate from '@/components/DueDate/DueDate';
import AmountDue from '@/components/AmountDue/AmountDue';
import { Button } from '@/components/ui/button';
import { formatDateWithDueStatus, calculateAmountDue } from '@/utils/dates';
import { Prisma, TicketStatus } from '@prisma/client';
import ChallengeSuccessLikelihood from '@/components/ChallengeSuccessLikelihood/ChallengeSuccessLikelihood';

type TicketWithPrediction = Prisma.TicketGetPayload<{
  include: {
    vehicle: {
      select: {
        registrationNumber: true;
      };
    };
    media: {
      select: {
        url: true;
      };
    };
    prediction: true;
  };
}>;

type TicketDetailProps = {
  ticket: TicketWithPrediction;
};

const TicketDetail = ({ ticket }: TicketDetailProps) => {
  // Status color and severity
  const getStatusInfo = (
    status: TicketStatus,
  ): { color: string; severity: 'low' | 'medium' | 'high' } => {
    switch (status) {
      case TicketStatus.PAID:
      case TicketStatus.APPEAL_ACCEPTED:
      case TicketStatus.TRIBUNAL_APPEAL_ACCEPTED:
        return { color: 'green', severity: 'low' };
      case TicketStatus.REDUCED_PAYMENT_DUE:
      case TicketStatus.FULL_PAYMENT_DUE:
      case TicketStatus.NOTICE_TO_OWNER_SENT:
      case TicketStatus.APPEALED:
      case TicketStatus.APPEAL_REJECTED:
      case TicketStatus.TRIBUNAL_APPEAL_IN_PROGRESS:
        return { color: 'orange', severity: 'medium' };
      case TicketStatus.TRIBUNAL_APPEAL_REJECTED:
      case TicketStatus.ORDER_FOR_RECOVERY:
      case TicketStatus.CCJ_PENDING:
      case TicketStatus.CCJ_ISSUED:
      case TicketStatus.CANCELLED:
        return { color: 'red', severity: 'high' };
      default:
        return { color: 'gray', severity: 'low' };
    }
  };

  // Get issuer initials
  const getIssuerInitials = (issuer: string) => {
    return issuer
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusInfo = getStatusInfo(ticket?.status as TicketStatus);

  // Format dates with due date information
  const issuedDateInfo = formatDateWithDueStatus(
    typeof ticket.issuedAt === 'string'
      ? ticket.issuedAt
      : ticket.issuedAt.toISOString(),
  );

  // Calculate amount due based on days since issue
  const amountInfo = calculateAmountDue(
    ticket.initialAmount,
    typeof ticket.issuedAt === 'string'
      ? ticket.issuedAt
      : ticket.issuedAt.toISOString(),
  );

  return (
    <>
      <Card className="overflow-hidden border-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {getIssuerInitials(ticket?.issuer as string)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{ticket.pcnNumber}</CardTitle>
                <CardDescription>{ticket.issuer}</CardDescription>
              </div>
            </div>
            <Badge variant={statusInfo.severity} className="px-3 py-1">
              {ticket.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faCar}
                className="h-5 w-5 text-muted-foreground"
              />
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">
                  {ticket.vehicle.registrationNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faCalendar}
                className="h-5 w-5 text-muted-foreground"
              />
              <div>
                <p className="text-sm text-muted-foreground">Date Issued</p>
                <p className="font-medium">{issuedDateInfo.formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faClock}
                className="h-5 w-5 text-muted-foreground"
              />
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <DueDate
                  date={issuedDateInfo.dueDateFormatted}
                  daysMessage={issuedDateInfo.status.daysMessage}
                  colorClass={issuedDateInfo.status.color}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faMoneyBill}
                className="h-5 w-5 text-muted-foreground"
              />
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <AmountDue
                  amount={amountInfo.amount}
                  message={amountInfo.message}
                  status={
                    amountInfo.status as 'discount' | 'standard' | 'overdue'
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faMapMarkerAlt}
              className="h-5 w-5 text-muted-foreground"
            />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                {(ticket.location as Address)?.line1}
              </p>
            </div>
          </div>
          <div className="mt-8">
            <ChallengeSuccessLikelihood
              percentage={ticket.prediction?.percentage ?? 75}
              size="lg"
              showLabel={true}
              detailed={true}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline">Download Ticket</Button>
          <Button>Pay Fine</Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="appeal">Appeal</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Images</CardTitle>
              <CardDescription>
                Images of the front and back of your ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {ticket.media?.map((media: any, index: number) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <img
                    src={media.url}
                    alt={`Ticket image ${index + 1}`}
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-2 bg-muted/20 text-center text-sm">
                    {index === 0 ? 'Front of ticket' : 'Back of ticket'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appeal">
          <Card>
            <CardHeader>
              <CardTitle>Generate Appeal</CardTitle>
              <CardDescription>
                Our AI can help you generate a customized appeal letter based on
                your ticket details and relevant legal precedents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Click the button below to start generating your appeal letter.
              </p>
              <Button>Generate Appeal Letter</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Add and view notes related to this ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You haven't added any notes to this ticket yet.</p>
              <Button>Add Note</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default TicketDetail;
