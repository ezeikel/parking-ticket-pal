import { Prisma } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleCardControls from '@/components/VehicleCardControls/VehicleCardControls';

type VehicleCardProps = {
  vehicle: Prisma.VehicleGetPayload<{
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
  };
};

const VehicleCard = ({ vehicle }: VehicleCardProps) => (
  <Card
    className={cn(
      'hover:shadow-md transition-all group',
      vehicle.hasUrgentTickets
        ? 'border-amber-500/50 hover:border-amber-500'
        : 'hover:border-primary/50',
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-base font-bold tracking-wider">
        {vehicle.registrationNumber}
      </CardTitle>
      <VehicleCardControls vehicle={vehicle} />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted flex-shrink-0">
          <Car className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {vehicle.make} {vehicle.model}
          </p>
          <p className="text-muted-foreground">{vehicle.color}</p>
          <p className="text-muted-foreground">{vehicle.year}</p>
        </div>
      </div>
      <div className="border-t pt-3">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
          Status
        </h4>
        {vehicle.activeTickets > 0 ? (
          <div className="flex items-center gap-2">
            {vehicle.hasUrgentTickets ? (
              <Badge variant="destructive" className="gap-1.5 pl-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {vehicle.activeTickets} Urgent Ticket(s)
              </Badge>
            ) : (
              <Badge variant="secondary">
                {vehicle.activeTickets} Active Ticket(s)
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active tickets.</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default VehicleCard;
