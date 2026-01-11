'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import mapboxgl from 'mapbox-gl';
import { Prisma } from '@parking-ticket-pal/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCarMirrors } from '@fortawesome/pro-solid-svg-icons';

type MapViewProps = {
  tickets: Prisma.TicketGetPayload<{
    include: {
      vehicle: true;
    };
  }>[];
};

const MapView = ({ tickets }: MapViewProps) => {
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.118092, 51.509865], // London
      zoom: 10,
    });

    // add markers for each ticket
    tickets.forEach((ticket) => {
      const location = ticket.location as any;
      if (location?.coordinates?.latitude && location?.coordinates?.longitude) {
        const { latitude, longitude } = location.coordinates;

        // create marker element
        const markerEl = document.createElement('div');
        markerEl.className =
          'size-8 bg-primary rounded-full flex items-center justify-center shadow-md cursor-pointer';

        // create container for the icon
        const iconContainer = document.createElement('div');

        // use react to render the FontAwesome icon
        // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
        const { createRoot } = require('react-dom/client');
        const root = createRoot(iconContainer);

        root.render(
          <FontAwesomeIcon icon={faCarMirrors} style={{ color: '#FFF' }} />,
        );

        // append the icon container to the marker
        markerEl.appendChild(iconContainer);

        // add popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          maxWidth: '300px',
        }).setHTML(`
          <div class="p-3 space-y-2 font-sans">
            <div class="font-medium text-base">${ticket.pcnNumber}</div>
            <div class="text-sm text-muted-foreground">${ticket.issuer}</div>
            <div class="text-sm">${location.line1}${location.line2 ? `, ${location.line2}` : ''}, ${location.city}</div>
            <a href="/tickets/${ticket.id}" class="mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 shadow-sm hover:bg-primary/90">
              View Details <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </a>
          </div>
        `);

        // add marker to map
        new mapboxgl.Marker(markerEl)
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
      }
    });

    // add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // cleanup
    return () => map.remove();
  }, [tickets]);

  return (
    <Card className="w-full h-[600px] relative overflow-hidden">
      <div id="map" className="w-full h-full" />
    </Card>
  );
};

export default MapView;
