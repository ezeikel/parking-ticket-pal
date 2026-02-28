import { Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/pro-solid-svg-icons';
import { getVehicles } from '@/app/actions/vehicle';
import { Button } from '@/components/ui/button';
import AddVehicleDialog from '@/components/AddVehicleDialog/AddVehicleDialog';
import AdBannerServer from '@/components/AdBanner/AdBannerServer';
import VehiclesGrid from '@/components/vehicles/VehiclesGrid';
import VehiclesEmptyState from '@/components/vehicles/VehiclesEmptyState';
import type { TicketStatus } from '@parking-ticket-pal/db/types';

const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  'ISSUED_DISCOUNT_PERIOD',
  'ISSUED_FULL_CHARGE',
  'NOTICE_TO_OWNER',
  'FORMAL_REPRESENTATION',
  'NOTICE_OF_REJECTION',
  'REPRESENTATION_ACCEPTED',
  'CHARGE_CERTIFICATE',
  'ORDER_FOR_RECOVERY',
  'TEC_OUT_OF_TIME_APPLICATION',
  'PE2_PE3_APPLICATION',
  'APPEAL_TO_TRIBUNAL',
  'ENFORCEMENT_BAILIFF_STAGE',
  'NOTICE_TO_KEEPER',
  'APPEAL_SUBMITTED_TO_OPERATOR',
  'APPEAL_REJECTED_BY_OPERATOR',
  'POPLA_APPEAL',
  'IAS_APPEAL',
  'APPEAL_UPHELD',
  'APPEAL_REJECTED',
  'DEBT_COLLECTION',
  'COURT_PROCEEDINGS',
  'CCJ_ISSUED',
];

const URGENT_TICKET_STATUSES: TicketStatus[] = [
  'ISSUED_FULL_CHARGE',
  'CHARGE_CERTIFICATE',
  'ORDER_FOR_RECOVERY',
  'ENFORCEMENT_BAILIFF_STAGE',
  'APPEAL_REJECTED',
  'DEBT_COLLECTION',
  'COURT_PROCEEDINGS',
  'CCJ_ISSUED',
];

const VehiclesContent = async () => {
  const vehicles = await getVehicles();

  if (!vehicles || vehicles.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-dark">Your Vehicles</h1>
        </div>
        <VehiclesEmptyState />
      </main>
    );
  }

  const vehiclesForUi = vehicles.map((vehicle) => {
    const activeTickets = vehicle.tickets.filter((ticket) =>
      ACTIVE_TICKET_STATUSES.includes(ticket.status),
    );
    const urgentTickets = activeTickets.filter((ticket) =>
      URGENT_TICKET_STATUSES.includes(ticket.status),
    );

    return {
      ...vehicle,
      activeTickets: activeTickets.length,
      hasUrgentTickets: urgentTickets.length > 0,
      urgentTicketCount: urgentTickets.length,
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark">Your Vehicles</h1>
        <AddVehicleDialog
          trigger={
            <Button className="hidden gap-2 bg-teal text-white hover:bg-teal-dark sm:flex">
              <FontAwesomeIcon icon={faPlus} />
              Add Vehicle
            </Button>
          }
        />
      </div>
      <VehiclesGrid vehicles={vehiclesForUi} />
    </main>
  );
};

const VehiclesPage = () => (
  <div className="min-h-screen bg-light">
    <Suspense fallback={null}>
      <AdBannerServer
        placement="vehicles-list"
        className="mx-auto max-w-7xl px-4 py-2"
      />
    </Suspense>
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-white" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="mb-3 aspect-video animate-pulse rounded-xl bg-white" />
                <div className="h-5 w-24 animate-pulse rounded bg-white" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white" />
              </div>
            ))}
          </div>
        </main>
      }
    >
      <VehiclesContent />
    </Suspense>
  </div>
);

export default VehiclesPage;
