import type { Variants } from 'framer-motion';

/**
 * Shared slide animation variants for wizard step transitions.
 * Used by both TicketWizard (guest) and AddDocumentWizard (logged-in).
 *
 * Usage:
 * ```tsx
 * <motion.div
 *   custom={direction}
 *   variants={slideVariants}
 *   initial="enter"
 *   animate="center"
 *   exit="exit"
 *   transition={{ duration: 0.3 }}
 * >
 * ```
 */
export const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

/**
 * Shared modal/dialog animation variants for wizard containers.
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
};

/**
 * Shared backdrop animation variants.
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
