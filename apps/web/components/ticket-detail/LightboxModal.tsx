'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faImage } from '@fortawesome/pro-solid-svg-icons';

type LightboxModalProps = {
  imageUrl: string | null;
  onClose: () => void;
};

const LightboxModal = ({ imageUrl, onClose }: LightboxModalProps) => {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/90 p-4"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="max-h-[80vh] max-w-4xl overflow-hidden rounded-lg bg-light"
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Full size view"
                className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex h-96 items-center justify-center">
                <FontAwesomeIcon
                  icon={faImage}
                  className="text-4xl text-gray/40"
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LightboxModal;
