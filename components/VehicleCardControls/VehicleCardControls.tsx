'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV,
  faTicketPerforated,
  faPen,
  faTrash,
} from '@fortawesome/pro-regular-svg-icons';
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
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FontAwesomeIcon icon={faEllipsisV} size="lg" />
            <span className="sr-only">Vehicle options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <FontAwesomeIcon
              icon={faTicketPerforated}
              size="lg"
              className="mr-2"
            />
            View Tickets
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            <FontAwesomeIcon icon={faPen} size="lg" className="mr-2" />
            Edit Vehicle
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-red-500 focus:text-red-500"
          >
            <FontAwesomeIcon icon={faTrash} size="lg" className="mr-2" />
            Delete Vehicle
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
