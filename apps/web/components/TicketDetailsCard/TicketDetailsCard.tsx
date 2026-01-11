'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { TicketStatus } from '@parking-ticket-pal/db';
import {
  faCalendarDays,
  faCarSide,
  faCircleSterling,
  faClock,
  faFileLines,
  faMapMarkerAlt,
  faRotateLeft,
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
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import LocationMap from '@/components/LocationMap/LocationMap';
import TicketStatusTimeline from '@/components/TicketStatusTimeline/TicketStatusTimeline';
import TicketDetailControls from '@/components/TicketDetailControls/TicketDetailControls';
import TicketNotes from '@/components/TicketNotes/TicketNotes';
import getIssuerInitials from '@/utils/getIssuerInitials';
import { calculateAmountDue, formatDateWithDueStatus } from '@/utils/dates';
import DueDate from '@/components/DueDate/DueDate';
import AmountDue from '@/components/AmountDue/AmountDue';
import { getContraventionDetails } from '@/constants';
import { TicketWithRelations } from '@/types';
import { Address } from '@parking-ticket-pal/types';

type InfoItemProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  description?: string | null;
};

const InfoItem = ({ icon, label, value, description }: InfoItemProps) => (
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
      {icon}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-base font-medium">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  </div>
);

type TicketDetailsCardProps = {
  ticket: TicketWithRelations;
};

const TicketDetailsCard = ({ ticket }: TicketDetailsCardProps) => {
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(
    ticket.status,
  );

  const location = ticket.location as Address | null;
  const hasCoordinates =
    location?.coordinates?.latitude && location?.coordinates?.longitude;

  const handleStatusChange = (newStatus: TicketStatus) => {
    // TODO: update the status in the db
    setCurrentStatus(newStatus);
  };

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

  // Status color and severity
  const getStatusInfo = (
    status: TicketStatus,
  ): { color: string; severity: 'low' | 'medium' | 'high' } => {
    switch (status) {
      case TicketStatus.PAID:
      case TicketStatus.REPRESENTATION_ACCEPTED:
      case TicketStatus.APPEAL_UPHELD:
      case TicketStatus.CANCELLED:
        return { color: 'green', severity: 'low' };
      case TicketStatus.ISSUED_DISCOUNT_PERIOD:
      case TicketStatus.ISSUED_FULL_CHARGE:
      case TicketStatus.NOTICE_TO_OWNER:
      case TicketStatus.FORMAL_REPRESENTATION:
      case TicketStatus.NOTICE_OF_REJECTION:
      case TicketStatus.CHARGE_CERTIFICATE:
      case TicketStatus.TEC_OUT_OF_TIME_APPLICATION:
      case TicketStatus.PE2_PE3_APPLICATION:
      case TicketStatus.APPEAL_TO_TRIBUNAL:
      case TicketStatus.NOTICE_TO_KEEPER:
      case TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR:
      case TicketStatus.APPEAL_REJECTED_BY_OPERATOR:
      case TicketStatus.POPLA_APPEAL:
      case TicketStatus.IAS_APPEAL:
      case TicketStatus.APPEAL_REJECTED:
        return { color: 'orange', severity: 'medium' };
      case TicketStatus.ENFORCEMENT_BAILIFF_STAGE:
      case TicketStatus.ORDER_FOR_RECOVERY:
      case TicketStatus.DEBT_COLLECTION:
      case TicketStatus.COURT_PROCEEDINGS:
      case TicketStatus.CCJ_ISSUED:
        return { color: 'red', severity: 'high' };
      default:
        return { color: 'gray', severity: 'low' };
    }
  };

  const contraventionDetails = getContraventionDetails(
    ticket.contraventionCode,
  );

  const statusInfo = getStatusInfo(ticket?.status as TicketStatus);

  const renderFooterActions = () => {
    switch (ticket.status) {
      case TicketStatus.PAID:
        return (
          <Button variant="outline">
            <FontAwesomeIcon icon={faRotateLeft} size="lg" className="mr-2" />
            Unmark as Paid
          </Button>
        );
      case TicketStatus.REPRESENTATION_ACCEPTED:
      case TicketStatus.APPEAL_UPHELD:
      case TicketStatus.CANCELLED:
        return (
          <Button variant="outline">
            <FontAwesomeIcon icon={faRotateLeft} size="lg" className="mr-2" />
            Reopen Case
          </Button>
        );
      default:
        return (
          <>
            <Button variant="outline">Mark as Paid</Button>
            <Button variant="outline">Mark as Cancelled</Button>
            <Button>Pay Fine</Button>
          </>
        );
    }
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {getIssuerInitials(ticket?.issuer as string)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{ticket.pcnNumber}</CardTitle>
              <CardDescription className="text-base">
                {ticket.issuer}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={statusInfo.severity}
              className="px-3 py-1 text-sm capitalize"
            >
              {ticket.status.replace(/_/g, ' ').toLowerCase()}
            </Badge>
            <TicketDetailControls ticket={ticket} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <TicketStatusTimeline
          currentStatus={currentStatus}
          issuerType={ticket.issuerType}
          onStatusChange={handleStatusChange}
        />
        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 pt-6 border-t">
          <InfoItem
            icon={
              <FontAwesomeIcon
                icon={faCarSide}
                size="lg"
                className="text-muted-foreground"
              />
            }
            label="Vehicle"
            value={ticket.vehicle.registrationNumber}
          />
          <InfoItem
            icon={
              <FontAwesomeIcon
                icon={faCalendarDays}
                size="lg"
                className="text-muted-foreground"
              />
            }
            label="Date Issued"
            value={issuedDateInfo.formattedDate}
          />
          <InfoItem
            icon={
              <FontAwesomeIcon
                icon={faClock}
                size="lg"
                className="text-muted-foreground"
              />
            }
            label="Due Date"
            value={
              <DueDate
                date={issuedDateInfo.dueDateFormatted}
                daysMessage={issuedDateInfo.status.daysMessage}
                colorClass={issuedDateInfo.status.color}
              />
            }
          />
          <div className="md:col-span-2">
            <InfoItem
              icon={
                <FontAwesomeIcon
                  icon={faCircleSterling}
                  size="lg"
                  className="text-muted-foreground"
                />
              }
              label="Amount Due"
              value={
                <AmountDue
                  amount={amountInfo.amount}
                  message={amountInfo.message}
                  status={
                    amountInfo.status as 'discount' | 'standard' | 'overdue'
                  }
                />
              }
            />
          </div>
          <div className="md:col-span-2">
            <InfoItem
              icon={
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  size="lg"
                  className="text-muted-foreground"
                />
              }
              label="Location"
              value={
                location
                  ? `${location.line1}, ${location.city}, ${location.county}, ${location.postcode}`
                  : 'Location not available'
              }
            />
          </div>
          <div className="md:col-span-2">
            <InfoItem
              icon={
                <FontAwesomeIcon
                  icon={faFileLines}
                  size="lg"
                  className="text-muted-foreground"
                />
              }
              label="Contravention"
              value={`${ticket.contraventionCode}: ${contraventionDetails.title}`}
              description={contraventionDetails.description}
            />
          </div>
        </div>
        <div className="h-64 w-full overflow-hidden rounded-lg bg-muted">
          {hasCoordinates ? (
            <LocationMap
              latitude={location!.coordinates.latitude}
              longitude={location!.coordinates.longitude}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Location data not available
            </div>
          )}
        </div>
        <TicketNotes ticketId={ticket.id} initialNotes={ticket.notes || ''} />
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t bg-muted/50 px-6 py-4">
        {renderFooterActions()}
      </CardFooter>
    </Card>
  );
};

export default TicketDetailsCard;
