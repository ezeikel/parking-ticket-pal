import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/pro-regular-svg-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getVehicles } from '@/app/actions/vehicle';
import EmptyList from '@/components/EmptyList/EmptyList';

const VehiclesPage = async () => {
  const vehicles = await getVehicles();

  if (!vehicles?.length) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-slab font-bold text-3xl">Your Vehicles</h1>
          <Button className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            <span>Add Vehicle</span>
          </Button>
        </div>
        <EmptyList
          title="No vehicles yet"
          description="Add your first vehicle to get started."
          buttonText="Add Vehicle"
          buttonLink="/vehicles/new"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-slab font-bold text-3xl">Your Vehicles</h1>
        <Link href="/vehicles/new">
          <Button className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            <span>Add Vehicle</span>
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {vehicle.registrationNumber}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year:</span>
                    <span>{vehicle.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color:</span>
                    <span>{vehicle.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tickets:</span>
                    <span>{vehicle.tickets?.length ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default VehiclesPage;
