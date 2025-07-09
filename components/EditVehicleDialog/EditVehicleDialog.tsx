'use client';

import { useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { updateVehicle } from '@/app/actions/vehicle';
import { toast } from 'sonner';

type VehicleData = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  notes?: string | null;
};

type EditVehicleDialogProps = {
  vehicle: VehicleData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const EditVehicleDialog = ({
  vehicle,
  open,
  onOpenChange,
}: EditVehicleDialogProps) => {
  const [updateState, updateAction, isUpdating] = useActionState(
    updateVehicle,
    null,
  );

  useEffect(() => {
    if (updateState?.success) {
      toast.success('Vehicle updated successfully!');
      onOpenChange(false);
    } else if (updateState?.error) {
      toast.error(updateState.error);
    }
  }, [updateState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={updateAction}>
          <input type="hidden" name="id" value={vehicle.id} />
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update the details for {vehicle.registrationNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="registrationNumber">Registration</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={vehicle.registrationNumber}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" name="make" defaultValue={vehicle.make} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" defaultValue={vehicle.model} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Colour</Label>
                <Input id="color" name="color" defaultValue={vehicle.color} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  defaultValue={vehicle.year}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="e.g., Scuff mark on rear bumper..."
                defaultValue={vehicle.notes || ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditVehicleDialog;
