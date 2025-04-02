import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faEdit,
  faCheckCircle,
  faExclamationCircle,
} from '@fortawesome/pro-regular-svg-icons';
import Link from 'next/link';
import { getVehicle } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import VehicleFormWrapper from '@/components/forms/VehicleForm/VehicleFormWrapper';
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
              verificationStatus={vehicle.verification?.status}
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
        <Link href={`/vehicles/${id}?mode=edit`}>
          <Button>
            <FontAwesomeIcon icon={faEdit} className="mr-2 h-4 w-4" />
            Edit Vehicle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Vehicle Information
            {vehicle.verification?.status === 'VERIFIED' ? (
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="h-5 w-5 text-green-500"
                title="Vehicle verified"
              />
            ) : vehicle.verification?.status === 'FAILED' ? (
              <FontAwesomeIcon
                icon={faExclamationCircle}
                className="h-5 w-5 text-red-500"
                title="Vehicle verification failed"
              />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Registration Number
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {vehicle.registrationNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Make</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.make}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Model</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.model}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Year</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.year}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Color</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.color}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Body Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.bodyType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fuel Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.fuelType}</dd>
            </div>
            {vehicle.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{vehicle.notes}</dd>
              </div>
            )}
            {vehicle.verification && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  Verification Status
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {vehicle.verification.status === 'VERIFIED'
                    ? 'Verified'
                    : vehicle.verification.status === 'FAILED'
                      ? 'Verification Failed'
                      : 'Unverified'}
                </dd>
                {vehicle.verification.verifiedAt && (
                  <dd className="mt-1 text-sm text-gray-500">
                    Last verified:{' '}
                    {new Date(vehicle.verification.verifiedAt).toLocaleString()}
                  </dd>
                )}
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <DeleteVehicleButton vehicleId={id} />
    </div>
  );
};

export default VehicleDetailPage;
