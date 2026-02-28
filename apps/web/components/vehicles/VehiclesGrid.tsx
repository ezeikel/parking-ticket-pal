'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Prisma } from '@parking-ticket-pal/db/types';
import VehicleCard from '@/components/VehicleCard/VehicleCard';

type VehicleForUi = Prisma.VehicleGetPayload<{
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
}> & {
  activeTickets: number;
  hasUrgentTickets: boolean;
  urgentTicketCount: number;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const VehiclesGrid = ({ vehicles }: { vehicles: VehicleForUi[] }) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    <AnimatePresence mode="popLayout">
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </AnimatePresence>
  </motion.div>
);

export default VehiclesGrid;
