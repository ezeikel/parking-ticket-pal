export default async (vehicleRegistration: string) => {
  // get vehicle information from multiple sources
  const [mwayResponse, dvlaResponse] = await Promise.all([
    fetch(process.env.MWAY_VRM_CHECK_API_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationNumber: vehicleRegistration }),
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
    };
  }

  if (dvlaResponse.ok) {
    const { make, colour, fuelType, yearOfManufacture } =
      await dvlaResponse.json();

    return {
      make,
      // convert colour to lowercase and capitalize first letter
      color: colour.charAt(0).toUpperCase() + colour.slice(1).toLowerCase(),
      fuelType,
      year: yearOfManufacture,
    };
  }

  throw new Error('Failed to retrieve vehicle information');
};
