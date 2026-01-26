'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCar } from '@fortawesome/pro-solid-svg-icons';
import VehicleCard from '@/components/VehicleCard/VehicleCard';
import AddVehicleDialog from '@/components/AddVehicleDialog/AddVehicleDialog';
import { Button } from '@/components/ui/button';
import type { TicketStatus, Prisma } from '@parking-ticket-pal/db/types';
import { getVehicles } from '../actions/vehicle';

type VehicleWithTickets = Prisma.VehicleGetPayload<{
  select: {
    id: true;
    registrationNumber: true;
    make: true;
    model: true;
    year: true;
    color: true;
    tickets: {
      select: {
        id: true;
        status: true;
      };
    };
  };
}>;

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState<VehicleWithTickets[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      const data = await getVehicles();
      setVehicles(data);
      setIsLoading(false);
    };
    fetchVehicles();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light">
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
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-light">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-dark">Your Vehicles</h1>
          </div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon icon={faCar} className="text-2xl text-teal" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-dark">
              No vehicles yet
            </h2>
            <p className="mt-2 max-w-sm text-center text-gray">
              Add your first vehicle to start tracking tickets and managing
              appeals.
            </p>
            <AddVehicleDialog
              trigger={
                <Button className="mt-6 gap-2 bg-teal text-white hover:bg-teal-dark">
                  <FontAwesomeIcon icon={faPlus} />
                  Add Your First Vehicle
                </Button>
              }
            />
          </motion.div>
        </main>

        {/* Mobile FAB */}
        <AddVehicleDialog
          trigger={
            <motion.button
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg sm:hidden"
            >
              <FontAwesomeIcon icon={faPlus} className="text-lg" />
            </motion.button>
          }
        />
      </div>
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
    <div className="min-h-screen bg-light">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
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

        {/* Vehicles Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {vehiclesForUi.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Mobile FAB */}
      <AddVehicleDialog
        trigger={
          <motion.button
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg sm:hidden"
          >
            <FontAwesomeIcon icon={faPlus} className="text-lg" />
          </motion.button>
        }
      />
    </div>
  );
};

export default VehiclesPage;
