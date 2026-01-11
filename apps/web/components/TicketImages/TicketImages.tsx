'use client';

import type { Media } from '@parking-ticket-pal/db/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

type TicketImagesProps = {
  images: Pick<Media, 'id' | 'url' | 'description'>[];
};

const TicketImages = ({ images }: TicketImagesProps) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Images</CardTitle>
        <CardDescription>
          The original images uploaded for this ticket.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {images.map((image, index) => (
          <div key={image.id} className="overflow-hidden rounded-lg border">
            <img
              src={image.url || '/placeholder.svg'}
              alt={image.description || `Ticket image ${index + 1}`}
              className="aspect-video w-full object-cover"
            />
            {image.description && (
              <div className="bg-muted/50 p-2 text-center text-sm font-medium">
                {image.description}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TicketImages;
