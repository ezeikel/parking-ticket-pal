export type VehicleInfo = {
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
  color: string;
  year: number;
  verification: {
    type: 'VEHICLE' | 'TICKET';
    status: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
    metadata?: Record<string, unknown>;
  };
};

const FALLBACK_VEHICLE_INFO: VehicleInfo = {
  make: 'Unknown',
  model: 'Unknown',
  bodyType: 'Unknown',
  fuelType: 'Unknown',
  color: 'Unknown',
  year: 0,
  verification: {
    type: 'VEHICLE',
    status: 'FAILED',
    metadata: { error: 'Failed to retrieve vehicle information' },
  },
};

export default async (vehicleRegistration: string): Promise<VehicleInfo> => {
  try {
    // get vehicle information from multiple sources
    const [mwayResponse, dvlaResponse] = await Promise.all([
      fetch(process.env.MWAY_VRM_CHECK_API_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vrm: vehicleRegistration }),
      }),
      fetch(process.env.DVLA_VEHICLE_ENQUIRY_API_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.DVLA_API_KEY as string,
        },
        body: JSON.stringify({ registrationNumber: vehicleRegistration }),
      }),
    ]);

    // if no response from mway api fallback to dvla api
    if (mwayResponse.ok) {
      const {
        vehicle: {
          colour,
          model,
          body,
          year,
          fuel,
          make: { display_name: displayName },
          genericModel: { name },
        },
      } = await mwayResponse.json();

      return {
        make: displayName,
        model: name || model,
        bodyType: body,
        fuelType: fuel,
        color: colour,
        year,
        verification: {
          type: 'VEHICLE',
          status: 'VERIFIED',
          metadata: { source: 'motorway' },
        },
      };
    }

    if (dvlaResponse.ok) {
      const { make, colour, fuelType, yearOfManufacture } =
        await dvlaResponse.json();

      return {
        make,
        model: 'Unknown', // DVLA doesn't provide model
        // convert colour to lowercase and capitalize first letter
        color: colour.charAt(0).toUpperCase() + colour.slice(1).toLowerCase(),
        fuelType,
        year: yearOfManufacture,
        bodyType: 'Unknown', // DVLA doesn't provide body type
        verification: {
          type: 'VEHICLE',
          status: 'VERIFIED',
          metadata: { source: 'dvla' },
        },
      };
    }

    // If both APIs fail, return fallback values
    return FALLBACK_VEHICLE_INFO;
  } catch (error) {
    console.error('Error fetching vehicle information:', error);
    return FALLBACK_VEHICLE_INFO;
  }
};
