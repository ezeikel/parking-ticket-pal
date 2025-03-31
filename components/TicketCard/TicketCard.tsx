import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Address, TicketStatus } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  faEllipsisVertical,
  faCar,
  faCalendar,
  faClock,
  faMoneyBill,
  faMapMarkerAlt,
} from '@fortawesome/pro-regular-svg-icons';
import { Prisma } from '@prisma/client';
import { formatDateWithDueStatus, calculateAmountDue } from '@/utils/dates';
import AmountDue from '@/components/AmountDue/AmountDue';
import { deleteTicket } from '@/app/actions';
import DueDate from '../DueDate/DueDate';
import getIssuerInitials from '@/utils/getIssuerInitials';

type TicketCardProps = {
  ticket: Prisma.TicketGetPayload<{
    include: {
      vehicle: true;
    };
  }>;
};

const TicketCard = ({ ticket }: TicketCardProps) => {
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

  // Get formatted date and due date info
  const issuedDateInfo = formatDateWithDueStatus(
    typeof ticket.issuedAt === 'string'
      ? ticket.issuedAt
      : ticket.issuedAt.toISOString(),
  );
  const amountInfo = calculateAmountDue(
    ticket.initialAmount,
    typeof ticket.issuedAt === 'string'
      ? ticket.issuedAt
      : ticket.issuedAt.toISOString(),
  );
  const statusInfo = getStatusInfo(ticket.status as TicketStatus);

  return (
    <Card className="overflow-hidden border hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {getIssuerInitials(ticket.issuer)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{ticket.pcnNumber}</p>
              <p className="text-sm text-muted-foreground">{ticket.issuer}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <FontAwesomeIcon
                  icon={faEllipsisVertical}
                  className="h-4 w-4"
                />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Pay Fine</DropdownMenuItem>
              <DropdownMenuItem>Generate Appeal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteTicket(ticket.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-2 space-y-4">
        <Badge
          variant={statusInfo.severity}
          className="w-full justify-center py-1 text-sm"
        >
          {ticket.status}
        </Badge>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faCar}
              className="h-4 w-4 text-muted-foreground"
            />
            <span>{ticket.vehicle.registrationNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faCalendar}
              className="h-4 w-4 text-muted-foreground"
            />
            <span>{issuedDateInfo.formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faClock}
              className="h-4 w-4 text-muted-foreground"
            />
            <div className="flex flex-col">
              <DueDate
                date={issuedDateInfo.dueDateFormatted}
                showMessage={false}
                colorClass={issuedDateInfo.status.color}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faMoneyBill}
              className="h-4 w-4 text-muted-foreground"
            />
            <AmountDue
              amount={amountInfo.amount}
              showMessage={false}
              status={amountInfo.status as 'discount' | 'standard' | 'overdue'}
              compact={true}
            />
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <FontAwesomeIcon
              icon={faMapMarkerAlt}
              className="h-4 w-4 text-muted-foreground"
            />
            <span className="truncate">
              {(ticket.location as Address)?.line1}
            </span>
          </div>
        </div>
      </CardContent>
      <div className="px-6 py-4 bg-muted/10">
        <Link href={`/tickets/${ticket.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default TicketCard;
