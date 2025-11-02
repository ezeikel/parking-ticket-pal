'use client';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCarSide } from '@fortawesome/pro-solid-svg-icons';
import 'mapbox-gl/dist/mapbox-gl.css';

type LocationMapProps = {
  longitude: number;
  latitude: number;
};

const LocationMap = ({ longitude, latitude }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // cleanup previous map instance
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // wait for container to be available
    if (!mapContainer.current) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14,
      interactive: false,
    });

    // create a custom marker element
    const markerEl = document.createElement('div');
    markerEl.className =
      'flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg cursor-pointer';
    const iconContainer = document.createElement('div');
    markerEl.appendChild(iconContainer);

    // use React to render the FontAwesome icon inside the marker
    const root = createRoot(iconContainer);
    root.render(
      <FontAwesomeIcon
        icon={faCarSide}
        className="text-primary-foreground"
        size="lg"
      />,
    );

    // add marker to the map
    new mapboxgl.Marker(markerEl)
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // cleanup on unmount
    // eslint-disable-next-line consistent-return
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [longitude, latitude]);

  return <div ref={mapContainer} className="h-full w-full rounded-lg" />;
};

export default LocationMap;
