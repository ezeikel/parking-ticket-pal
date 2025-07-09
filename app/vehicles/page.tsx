import React from 'react';
import VehicleCard from '@/components/VehicleCard/VehicleCard';
import AddVehicleDialog from '@/components/AddVehicleDialog/AddVehicleDialog';
import IssueNotification from '@/components/IssueNotification/IssueNotification';
import EmptyList from '@/components/EmptyList/EmptyList';
import { TicketStatus } from '@prisma/client';
import { getVehicles } from '../actions/vehicle';

const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.ISSUED_DISCOUNT_PERIOD,
  TicketStatus.ISSUED_FULL_CHARGE,
  TicketStatus.NOTICE_TO_OWNER,
  TicketStatus.FORMAL_REPRESENTATION,
  TicketStatus.NOTICE_OF_REJECTION,
  TicketStatus.REPRESENTATION_ACCEPTED,
  TicketStatus.CHARGE_CERTIFICATE,
  TicketStatus.ORDER_FOR_RECOVERY,
  TicketStatus.TEC_OUT_OF_TIME_APPLICATION,
  TicketStatus.PE2_PE3_APPLICATION,
  TicketStatus.APPEAL_TO_TRIBUNAL,
  TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
  TicketStatus.NOTICE_TO_KEEPER,
  TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR,
  TicketStatus.APPEAL_REJECTED_BY_OPERATOR,
  TicketStatus.POPLA_APPEAL,
  TicketStatus.IAS_APPEAL,
  TicketStatus.APPEAL_UPHELD,
  TicketStatus.APPEAL_REJECTED,
  TicketStatus.DEBT_COLLECTION,
  TicketStatus.COURT_PROCEEDINGS,
  TicketStatus.CCJ_ISSUED,
];

const URGENT_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.ISSUED_FULL_CHARGE,
  TicketStatus.CHARGE_CERTIFICATE,
  TicketStatus.ORDER_FOR_RECOVERY,
  TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
  TicketStatus.APPEAL_REJECTED,
  TicketStatus.DEBT_COLLECTION,
  TicketStatus.COURT_PROCEEDINGS,
  TicketStatus.CCJ_ISSUED,
];

const VehiclesPage = async () => {
  const vehicles = await getVehicles();

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <EmptyList
          title="No vehicles yet"
          description="Add your first vehicle to get started."
          buttonText="Add Vehicle"
          buttonLink="/vehicles/new"
        />
      </div>
    );
  }

  const vehiclesForUi = vehicles.map((vehicle) => {
    const activeTickets = vehicle.tickets.filter((ticket) =>
      ACTIVE_TICKET_STATUSES.includes(ticket.status),
    );
    const hasUrgentTickets = activeTickets.some((ticket) =>
      URGENT_TICKET_STATUSES.includes(ticket.status),
    );

    return {
      ...vehicle,
      activeTickets: activeTickets.length,
      hasUrgentTickets,
    };
  });

  const totalUrgentIssues = vehiclesForUi.filter(
    (v) => v.hasUrgentTickets,
  ).length;

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/50">
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-slab font-bold text-3xl">Your Vehicles</h1>
          <AddVehicleDialog />
        </div>

        {vehiclesForUi.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {vehiclesForUi.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">No vehicles found</h2>
            <p className="text-muted-foreground mt-2">
              Get started by adding your first vehicle.
            </p>
          </div>
        )}
      </main>
      <IssueNotification issueCount={totalUrgentIssues} />
    </div>
  );
};

export default VehiclesPage;
