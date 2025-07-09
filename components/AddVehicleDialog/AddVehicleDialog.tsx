'use client';

import { useState, useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2, Search, ArrowLeft, Info } from 'lucide-react';
import { getVehicleDetails, createVehicle } from '@/app/actions/vehicle';
import { toast } from 'sonner';

type Step = 'enterReg' | 'reviewDetails' | 'manualEntry';

const AddVehicleDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('enterReg');
  const [registration, setRegistration] = useState('');

  // Action state for finding the vehicle
  const [findState, findAction, isFinding] = useActionState(getVehicleDetails, {
    success: false,
  });
  // Action state for creating the vehicle
  const [createState, createAction, isCreating] = useActionState(
    createVehicle,
    null,
  );

  const vehicleInfo = findState.success ? findState.data : null;

  // Effect to handle state changes after API calls
  useEffect(() => {
    // Successful vehicle lookup
    if (findState.success && findState.data) {
      setStep('reviewDetails');
    }
    // Failed vehicle lookup
    else if (findState.error) {
      toast.info(findState.error);
      setStep('manualEntry'); // Go to manual entry on failure
    }
  }, [findState]);

  useEffect(() => {
    // Successful vehicle creation
    if (createState?.success) {
      toast.success('Vehicle added successfully!');
      setOpen(false);
    } else if (createState?.error) {
      toast.error(createState.error);
    }
  }, [createState]);

  // Reset component state when dialog is closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('enterReg');
        setRegistration('');
      }, 200);
    }
  }, [open]);

  const renderContent = () => {
    switch (step) {
      case 'enterReg':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Add a new vehicle</DialogTitle>
              <DialogDescription>
                Enter your vehicle's registration to find its details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-end gap-2">
                <div className="grid flex-grow items-center gap-1.5">
                  <Label htmlFor="rego">Registration Number</Label>
                  <Input
                    id="rego"
                    name="registrationNumber"
                    placeholder="e.g., LV72EPC"
                    value={registration}
                    onChange={(e) =>
                      setRegistration(e.target.value.toUpperCase())
                    }
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  formAction={findAction}
                  disabled={isFinding || registration.length < 2}
                >
                  {isFinding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="sr-only">Find Vehicle</span>
                </Button>
              </div>
            </div>
          </>
        );

      case 'reviewDetails':
        if (!vehicleInfo) return null;
        return (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Vehicle Details</DialogTitle>
              <DialogDescription>
                Is this information for {registration.toUpperCase()} correct?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Hidden inputs to pass full vehicle data to the createVehicle action */}
              <input
                type="hidden"
                name="registrationNumber"
                value={registration}
              />
              <input type="hidden" name="make" value={vehicleInfo.make} />
              <input type="hidden" name="model" value={vehicleInfo.model} />
              <input type="hidden" name="color" value={vehicleInfo.color} />
              <input type="hidden" name="year" value={vehicleInfo.year} />
              <input
                type="hidden"
                name="bodyType"
                value={vehicleInfo.bodyType}
              />
              <input
                type="hidden"
                name="fuelType"
                value={vehicleInfo.fuelType}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Make</Label>
                  <p className="font-semibold">{vehicleInfo.make}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="font-semibold">{vehicleInfo.model}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Colour
                  </Label>
                  <p className="font-semibold">{vehicleInfo.color}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <p className="font-semibold">{vehicleInfo.year}</p>
                </div>
              </div>
              <div className="text-center text-sm">
                <span
                  className="text-primary hover:underline cursor-pointer"
                  onClick={() => setStep('manualEntry')}
                >
                  Wrong details? Enter them manually.
                </span>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('enterReg')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                formAction={createAction}
                disabled={isCreating}
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Vehicle
              </Button>
            </DialogFooter>
          </>
        );

      case 'manualEntry':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Enter Vehicle Details</DialogTitle>
              <DialogDescription>
                Please provide the correct details for your vehicle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {findState.error && (
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{findState.error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="manual-rego">Registration</Label>
                <Input
                  id="manual-rego"
                  name="registrationNumber"
                  value={registration}
                  readOnly
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manual-make">Make</Label>
                  <Input
                    id="manual-make"
                    name="make"
                    defaultValue={vehicleInfo?.make}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-model">Model</Label>
                  <Input
                    id="manual-model"
                    name="model"
                    defaultValue={vehicleInfo?.model}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manual-color">Colour</Label>
                  <Input
                    id="manual-color"
                    name="color"
                    defaultValue={vehicleInfo?.color}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-year">Year</Label>
                  <Input
                    id="manual-year"
                    name="year"
                    type="number"
                    defaultValue={vehicleInfo?.year}
                  />
                </div>
              </div>
              {/* Hidden inputs for fields not shown in manual entry for simplicity */}
              <input
                type="hidden"
                name="bodyType"
                value={vehicleInfo?.bodyType || 'Unknown'}
              />
              <input
                type="hidden"
                name="fuelType"
                value={vehicleInfo?.fuelType || 'Unknown'}
              />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('enterReg')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                formAction={createAction}
                disabled={isCreating}
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Vehicle
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form>{renderContent()}</form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVehicleDialog;
