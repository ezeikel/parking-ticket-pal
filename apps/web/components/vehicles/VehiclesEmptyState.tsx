'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCar } from '@fortawesome/pro-solid-svg-icons';
import AddVehicleDialog from '@/components/AddVehicleDialog/AddVehicleDialog';
import { Button } from '@/components/ui/button';

const VehiclesEmptyState = () => (
  <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
        <FontAwesomeIcon icon={faCar} className="text-2xl text-teal" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-dark">No vehicles yet</h2>
      <p className="mt-2 max-w-sm text-center text-gray">
        Add your first vehicle to start tracking tickets and managing appeals.
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
  </>
);

export default VehiclesEmptyState;
