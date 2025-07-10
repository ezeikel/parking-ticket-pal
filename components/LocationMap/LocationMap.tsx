'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/pro-solid-svg-icons';
import { createRoot } from 'react-dom/client';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

type LocationMapProps = {
  longitude: number;
  latitude: number;
};

const LocationMap = ({ longitude, latitude }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14,
      interactive: false, // Make map non-interactive for a static view
    });

    // Create a custom marker element
    const markerEl = document.createElement('div');
    markerEl.className =
      'flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg cursor-pointer';
    const iconContainer = document.createElement('div');
    markerEl.appendChild(iconContainer);

    // Use React to render the FontAwesome icon inside the marker
    const root = createRoot(iconContainer);
    root.render(
      <FontAwesomeIcon
        icon={faMapMarkerAlt}
        className="text-primary-foreground"
        size="lg"
      />,
    );

    // Add marker to the map
    new mapboxgl.Marker(markerEl)
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup on unmount
    // eslint-disable-next-line consistent-return
    return () => map.current?.remove();
  }, [longitude, latitude]);

  return <div ref={mapContainer} className="h-full w-full rounded-lg" />;
};

export default LocationMap;
