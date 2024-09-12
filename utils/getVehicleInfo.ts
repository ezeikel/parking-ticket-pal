export default async (vehicleRegistration: string) => {
  const [dvlaResponse, mwayResponse] = await Promise.all([
    fetch(process.env.MWAY_VRM_CHECK_API_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vrm: vehicleRegistration }),
    }),
    fetch(process.env.DVLA_ENQUIRY_API_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationNumber: vehicleRegistration }),
    }),
  ]);

  // if no response from mway api fallback to dvla api
  if (mwayResponse.ok) {
    const {
      data: {
        vehicle: { colour, model, body, year, fuel },
        make: { display_name: displayName },
        generic_model: { name },
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
    const {
      data: { make, colour, fuelType, yearOfManufacture },
    } = await dvlaResponse.json();

    return {
      make,
      // convert colour to lowercase and capitalize first letter
      color: colour.charAt(0).toUpperCase() + colour.slice(1).toLowerCase(),
      fuelType,
      year: yearOfManufacture,
    };
  }

  // TODO: when calling this function wrap in try catch and handle error
  throw new Error('Failed to retrieve vehicle information');
};
