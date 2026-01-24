'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsis,
  faTicket,
  faPen,
  faTrash,
} from '@fortawesome/pro-solid-svg-icons';
import EditVehicleDialog from '@/components/EditVehicleDialog/EditVehicleDialog';
import DeleteVehicleDialog from '@/components/DeleteVehicleDialog/DeleteVehicleDialog';

type VehicleData = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  notes?: string | null;
};

type VehicleCardControlsProps = {
  vehicle: VehicleData;
};

const VehicleCardControls = ({ vehicle }: VehicleCardControlsProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-dark shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <FontAwesomeIcon icon={faEllipsis} />
            <span className="sr-only">Vehicle options</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <FontAwesomeIcon icon={faTicket} className="mr-2 text-xs" />
            View Tickets
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <FontAwesomeIcon icon={faPen} className="mr-2 text-xs" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-coral focus:text-coral"
          >
            <FontAwesomeIcon icon={faTrash} className="mr-2 text-xs" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditVehicleDialog
        vehicle={vehicle}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <DeleteVehicleDialog
        vehicle={vehicle}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
};

export default VehicleCardControls;
