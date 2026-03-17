'use client';

import { useCallback, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird, faStreetView } from '@fortawesome/pro-solid-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type StreetViewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
};

const StreetViewModal = ({
  open,
  onOpenChange,
  latitude,
  longitude,
}: StreetViewModalProps) => {
  const [loading, setLoading] = useState(true);
  const [noCoverage, setNoCoverage] = useState(false);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const containerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (panoramaRef.current) {
        google.maps.event.clearInstanceListeners(panoramaRef.current);
        panoramaRef.current = null;
      }

      if (!node) return;

      setLoading(true);
      setNoCoverage(false);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY;
      if (!apiKey) {
        setLoading(false);
        setNoCoverage(true);
        return;
      }

      setOptions({ key: apiKey, v: 'weekly' });

      importLibrary('streetView')
        .then(() => {
          if (!node.isConnected) return;

          const service = new google.maps.StreetViewService();
          service
            .getPanorama({
              location: { lat: latitude, lng: longitude },
              radius: 50,
              preference: google.maps.StreetViewPreference.NEAREST,
              sources: [google.maps.StreetViewSource.DEFAULT],
            })
            .then((response) => {
              if (!node.isConnected) return;

              const panorama = new google.maps.StreetViewPanorama(node, {
                position: response.data.location!.latLng,
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
                addressControl: false,
                fullscreenControl: false,
                motionTrackingControl: false,
              });

              panoramaRef.current = panorama;

              panorama.addListener('pano_changed', () => {
                setLoading(false);
              });

              setTimeout(() => setLoading(false), 3000);
            })
            .catch(() => {
              if (!node.isConnected) return;
              setNoCoverage(true);
              setLoading(false);
            });
        })
        .catch(() => {
          setLoading(false);
          setNoCoverage(true);
        });
    },
    [latitude, longitude],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-4xl h-[80vh] flex-col p-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faStreetView} className="text-teal" />
            Street View
          </DialogTitle>
          <DialogDescription className="sr-only">
            Interactive Street View panorama of the ticket location
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 mx-6 mb-6 rounded-lg overflow-hidden">
          <div ref={containerCallbackRef} className="h-full w-full" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-light">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="animate-spin text-3xl text-teal"
              />
            </div>
          )}

          {noCoverage && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-light gap-3">
              <FontAwesomeIcon
                icon={faStreetView}
                className="text-4xl text-gray"
              />
              <p className="text-sm text-gray text-center max-w-xs">
                Street View is not available at this location.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreetViewModal;
