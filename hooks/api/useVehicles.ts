import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@/types";
import { getVehicles } from "@/api";

type VehiclesResponse = {
  vehicles: Vehicle[];
}

const useVehicles = () => 
  useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

export default useVehicles;