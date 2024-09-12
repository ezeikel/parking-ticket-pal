export default async (address: string) => {
  // use mapbox api to get lat and lng from address string
  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
      address,
    )}&access_token=${process.env.MAPBOX_API_KEY}&limit=1&autocomplete=false&country=UK`,
  );

  const data = await response.json();

  // return lat and lng and full address
  return {
    lat: data.features[0].properties.coordinates.latitude,
    lng: data.features[0].properties.coordinates.longitude,
    fullAddress: data.features[0].properties.full_address,
  };
};
