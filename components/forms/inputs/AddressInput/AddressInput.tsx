'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { Address } from '@/types';

// Make sure to add your Mapbox token to your environment variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// Add this type definition for the Mapbox result
type MapboxResult = {
  result: {
    place_name: string;
    geometry: { coordinates: number[] };
    context?: Array<{ id: string; text: string }>;
    text: string;
    address?: string;
    properties?: { address_line2?: string };
  };
};

type AddressInputProps = {
  onSelect: (address: Address) => void;
  className?: string;
  initialValue?: string;
};

const AddressInput = ({
  onSelect,
  className,
  initialValue,
}: AddressInputProps) => {
  const inputRef = useRef<HTMLDivElement | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const initializedRef = useRef(false);
  const [currentValue, setCurrentValue] = useState<string | undefined>(
    initialValue,
  );

  // Helper function to parse Mapbox response into our schema format
  const parseMapboxResponse = (result: any): Address => {
    // Extract context features (city, postcode, etc.)
    const contextFeatures = result.context || [];

    // Find postcode, city, county, country from context
    const postcode =
      contextFeatures.find((item: any) => item.id.includes('postcode'))?.text ||
      '';
    const city =
      contextFeatures.find((item: any) => item.id.includes('place'))?.text ||
      '';
    const county =
      contextFeatures.find((item: any) => item.id.includes('region'))?.text ||
      '';
    const country =
      contextFeatures.find((item: any) => item.id.includes('country'))?.text ||
      'United Kingdom';

    // Street address components
    const streetNumber = result.address || '';
    const streetName = result.text || '';

    // Construct line1 and line2
    const line1 = streetNumber ? `${streetNumber} ${streetName}` : streetName;
    const line2 = result.properties?.address_line2 || '';

    return {
      line1,
      ...(line2 ? { line2 } : {}),
      city,
      ...(county ? { county } : {}),
      postcode,
      country,
      coordinates: {
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
      },
    };
  };

  useEffect(() => {
    if (!inputRef.current || initializedRef.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken!,
      types: 'address',
      countries: 'gb', // restrict to the UK
      autocomplete: true,
      placeholder: 'Start typing an address',
    });

    geocoderRef.current = geocoder;
    geocoder.addTo(inputRef.current);

    // If we have an initial value, set it
    if (currentValue && geocoder) {
      const inputEl = inputRef.current.querySelector(
        'input',
      ) as HTMLInputElement;
      if (inputEl) {
        inputEl.value = currentValue;
      }
    }

    geocoder.on('result', (e: MapboxResult) => {
      // parse Mapbox response into our schema format
      const addressParts = parseMapboxResponse(e.result);

      // Update our local state with the selected address text
      setCurrentValue(e.result.place_name);

      // Call the onSelect callback
      onSelect(addressParts);
    });

    // style the geocoder to match the current UI
    const geocoderEl = inputRef.current.querySelector(
      '.mapboxgl-ctrl-geocoder',
    ) as HTMLElement;
    if (geocoderEl) {
      geocoderEl.style.width = '100%';
      geocoderEl.style.maxWidth = 'none';
      geocoderEl.style.boxShadow = 'none';
      geocoderEl.style.border = '1px solid hsl(var(--input))';
      geocoderEl.style.borderRadius = 'var(--radius)';
    }

    initializedRef.current = true;

    return () => {
      if (geocoderRef.current) {
        geocoderRef.current.onRemove();
        geocoderRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [onSelect, currentValue]);

  // Update the input value if initialValue changes
  useEffect(() => {
    setCurrentValue(initialValue);

    if (initialValue && inputRef.current) {
      const inputEl = inputRef.current.querySelector(
        'input',
      ) as HTMLInputElement;
      if (inputEl) {
        inputEl.value = initialValue;
      }
    }
  }, [initialValue]);

  return <div ref={inputRef} className={className} />;
};

export default AddressInput;
