import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TicketStatus, Address } from '@/types';
import {
  faArrowLeft,
  faCalendar,
  faCar,
  faClock,
  faMapMarkerAlt,
  faMoneyBill,
} from '@fortawesome/pro-regular-svg-icons';
import { getTicket } from '@/app/actions';
import { formatDateWithDueStatus, calculateAmountDue } from '@/utils/dates';
import DueDate from '@/components/DueDate/DueDate';
import AmountDue from '@/components/AmountDue/AmountDue';

type TicketPageProps = {
  params: Promise<{ id: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;
  const ticket = await getTicket(id);

  // Status color and severity
  const getStatusInfo = (
    status: TicketStatus,
  ): { color: string; severity: 'low' | 'medium' | 'high' } => {
    switch (status) {
      case TicketStatus.PAID:
      case TicketStatus.REPRESENTATION_ACCEPTED:
      case TicketStatus.APPEAL_UPHELD:
        return { color: 'green', severity: 'low' };
      case TicketStatus.ISSUED_DISCOUNT_PERIOD:
      case TicketStatus.ISSUED_FULL_CHARGE:
      case TicketStatus.NOTICE_TO_OWNER:
      case TicketStatus.NOTICE_TO_KEEPER:
      case TicketStatus.FORMAL_REPRESENTATION:
      case TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR:
      case TicketStatus.POPLA_APPEAL:
      case TicketStatus.IAS_APPEAL:
      case TicketStatus.APPEAL_TO_TRIBUNAL:
        return { color: 'orange', severity: 'medium' };
      case TicketStatus.NOTICE_OF_REJECTION:
      case TicketStatus.CHARGE_CERTIFICATE:
      case TicketStatus.ORDER_FOR_RECOVERY:
      case TicketStatus.TEC_OUT_OF_TIME_APPLICATION:
      case TicketStatus.PE2_PE3_APPLICATION:
      case TicketStatus.ENFORCEMENT_BAILIFF_STAGE:
      case TicketStatus.APPEAL_REJECTED_BY_OPERATOR:
      case TicketStatus.APPEAL_REJECTED:
      case TicketStatus.DEBT_COLLECTION:
      case TicketStatus.COURT_PROCEEDINGS:
      case TicketStatus.CCJ_ISSUED:
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

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            <span>Back to Tickets</span>
          </Button>
        </Link>
      </div>

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
              <div className="border rounded-lg overflow-hidden">
                <img
                  src="https://placehold.co/500x300"
                  alt="Front of ticket"
                  className="w-full h-auto object-cover"
                />
                <div className="p-2 bg-muted/20 text-center text-sm">
                  Front of ticket
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src="https://placehold.co/500x300"
                  alt="Back of ticket"
                  className="w-full h-auto object-cover"
                />
                <div className="p-2 bg-muted/20 text-center text-sm">
                  Back of ticket
                </div>
              </div>
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
    </div>
  );
};

export default TicketPage;
