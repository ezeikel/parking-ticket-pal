import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit } from '@fortawesome/pro-regular-svg-icons';
import Link from 'next/link';
import { getVehicle } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import VehicleFormWrapper from '@/components/forms/VehicleForm/VehicleFormWrapper';
import getIssuerInitials from '@/utils/getIssuerInitials';
import DeleteVehicleButton from '@/components/buttons/DeleteVehicleButton/DeleteVehicleButton';

type VehicleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    mode?: string;
  }>;
};

const VehicleDetailPage = async ({
  params,
  searchParams,
}: VehicleDetailPageProps) => {
  const { id } = await params;
  const { mode } = await searchParams;
  const vehicle = await getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  const isEditMode = mode === 'edit';

  if (isEditMode) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/vehicles/${id}`}>
              <Button variant="ghost" size="icon">
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Edit Vehicle</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleFormWrapper
              initialData={{
                registrationNumber: vehicle.registrationNumber,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year.toString(),
                color: vehicle.color,
                bodyType: vehicle.bodyType,
                fuelType: vehicle.fuelType,
                notes: vehicle.notes,
              }}
              vehicleId={id}
              submitLabel="Update Vehicle"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vehicles">
            <Button variant="ghost" size="icon">
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Vehicle Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/vehicles/${id}?mode=edit`}>
            <Button className="flex items-center gap-2">
              <FontAwesomeIcon icon={faEdit} className="h-4 w-4" />
              <span>Edit Vehicle</span>
            </Button>
          </Link>
          <DeleteVehicleButton vehicleId={id} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {vehicle.registrationNumber}
                </h3>
                <p className="text-muted-foreground">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{vehicle.color}</p>
                </div>
              </div>
              {vehicle.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{vehicle.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associated Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.tickets?.length ? (
              <div className="space-y-4">
                {vehicle.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                          {getIssuerInitials(ticket.issuer)}
                        </div>
                        <div>
                          <p className="font-medium">{ticket.pcnNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(ticket.issuedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        £{(ticket.initialAmount / 100).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No tickets associated with this vehicle.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
