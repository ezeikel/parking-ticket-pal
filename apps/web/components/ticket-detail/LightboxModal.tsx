'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

type LightboxModalProps = {
  images: string[];
  index: number;
  onClose: () => void;
};

const LightboxModal = ({ images, index, onClose }: LightboxModalProps) => (
  <Lightbox
    open={images.length > 0}
    close={onClose}
    index={index}
    slides={images.map((src) => ({ src }))}
    plugins={[Zoom, Thumbnails, Fullscreen]}
    zoom={{ maxZoomPixelRatio: 3 }}
    thumbnails={{ position: 'bottom', width: 80, height: 60 }}
    carousel={{ finite: images.length <= 1 }}
    styles={{
      container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
    }}
  />
);

export default LightboxModal;
