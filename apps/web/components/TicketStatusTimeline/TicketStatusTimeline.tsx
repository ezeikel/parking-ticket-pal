'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faClock,
  faSterlingSign,
  faEnvelope,
  faFileInvoice,
  faGavel,
  faUserShield,
  faCircleCheck,
  faTrophy,
  faXmark,
  faCheck,
  faLightbulb,
  faInfoCircle,
  faBuilding,
  faScaleBalanced,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TicketStatus, IssuerType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';

type StageInfo = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  daysFromPrevious?: number;
  icon: IconDefinition;
  isBranch?: boolean;
  branchFrom?: string;
  statusMapping: TicketStatus[];
};

const councilStages: StageInfo[] = [
  {
    id: 'PCN_ISSUED',
    label: 'PCN Issued',
    shortLabel: 'PCN',
    description: 'Penalty Charge Notice placed on vehicle',
    icon: faTicket,
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
  },
  {
    id: 'DISCOUNT_WINDOW',
    label: '14-Day Discount Window',
    shortLabel: '14 Days',
    description: 'Pay 50% discount or submit informal challenge',
    daysFromPrevious: 14,
    icon: faClock,
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
  },
  {
    id: 'FULL_AMOUNT_DUE',
    label: 'Full Amount Due',
    shortLabel: 'Full Due',
    description: 'Discount expired. Full amount now payable',
    daysFromPrevious: 0,
    icon: faSterlingSign,
    statusMapping: [TicketStatus.ISSUED_FULL_CHARGE],
  },
  {
    id: 'NOTICE_TO_OWNER',
    label: 'Notice to Owner (NtO)',
    shortLabel: 'NtO',
    description:
      'Formal notice sent to registered keeper. You have 28 days to make formal representations',
    daysFromPrevious: 28,
    icon: faEnvelope,
    statusMapping: [
      TicketStatus.NOTICE_TO_OWNER,
      TicketStatus.FORMAL_REPRESENTATION,
      TicketStatus.NOTICE_OF_REJECTION,
    ],
  },
  {
    id: 'CHARGE_CERTIFICATE',
    label: 'Charge Certificate',
    shortLabel: 'Charge Cert',
    description:
      'Amount increased by 50%. Must pay within 14 days or council can apply to court',
    daysFromPrevious: 14,
    icon: faFileInvoice,
    statusMapping: [TicketStatus.CHARGE_CERTIFICATE],
  },
  {
    id: 'ORDER_FOR_RECOVERY',
    label: 'Order for Recovery',
    shortLabel: 'Recovery',
    description:
      'Debt registered in County Court. Can file PE/TE/N244 form to challenge',
    daysFromPrevious: 21,
    icon: faGavel,
    statusMapping: [TicketStatus.ORDER_FOR_RECOVERY],
  },
  {
    id: 'WARRANT_OF_CONTROL',
    label: 'Warrant of Control',
    shortLabel: 'Bailiffs',
    description: 'Enforcement agents (bailiffs) authorized to recover debt',
    daysFromPrevious: 14,
    icon: faUserShield,
    statusMapping: [TicketStatus.ENFORCEMENT_BAILIFF_STAGE],
  },
];

const councilBranches: StageInfo[] = [
  {
    id: 'CASE_CLOSED_PAID',
    label: 'Case Closed - Paid',
    shortLabel: 'Paid',
    description: 'Ticket paid in full. Case closed',
    icon: faCircleCheck,
    isBranch: true,
    branchFrom: 'any',
    statusMapping: [TicketStatus.PAID],
  },
  {
    id: 'CASE_CLOSED_APPEAL_WON',
    label: 'Case Closed - Appeal Won',
    shortLabel: 'Won',
    description: 'Appeal successful. PCN cancelled',
    icon: faTrophy,
    isBranch: true,
    branchFrom: 'any',
    statusMapping: [
      TicketStatus.REPRESENTATION_ACCEPTED,
      TicketStatus.APPEAL_UPHELD,
      TicketStatus.CANCELLED,
    ],
  },
];

const privateStages: StageInfo[] = [
  {
    id: 'NOTICE_ISSUED',
    label: 'Parking Charge Notice',
    shortLabel: 'PCN',
    description: 'Notice issued by private parking company',
    icon: faTicket,
    statusMapping: [TicketStatus.ISSUED_DISCOUNT_PERIOD],
  },
  {
    id: 'REMINDER_SENT',
    label: 'Reminder Letter',
    shortLabel: 'Reminder',
    description: 'First reminder sent. Amount may increase',
    daysFromPrevious: 28,
    icon: faEnvelope,
    statusMapping: [TicketStatus.NOTICE_TO_KEEPER],
  },
  {
    id: 'DEBT_COLLECTION',
    label: 'Debt Collection',
    shortLabel: 'Debt',
    description: 'Passed to debt collection agency',
    daysFromPrevious: 28,
    icon: faBuilding,
    statusMapping: [TicketStatus.DEBT_COLLECTION],
  },
  {
    id: 'LEGAL_ACTION',
    label: 'Legal Action Threatened',
    shortLabel: 'Legal',
    description: 'Letter before claim sent',
    daysFromPrevious: 14,
    icon: faScaleBalanced,
    statusMapping: [TicketStatus.COURT_PROCEEDINGS],
  },
  {
    id: 'CCJ_ISSUED',
    label: 'County Court Judgment',
    shortLabel: 'CCJ',
    description: 'CCJ registered against you',
    daysFromPrevious: 30,
    icon: faGavel,
    statusMapping: [TicketStatus.CCJ_ISSUED],
  },
];

type TicketStatusTimelineProps = {
  currentStatus: TicketStatus;
  issuerType: IssuerType;
  onStatusChange: (newStatus: TicketStatus) => void;
};

const TicketStatusTimeline = ({
  currentStatus,
  issuerType,
  onStatusChange,
}: TicketStatusTimelineProps) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const stages = issuerType === 'PRIVATE_COMPANY' ? privateStages : councilStages;
  const branches = councilBranches;

  // Find current stage index based on status
  const currentStageIndex = stages.findIndex((s) =>
    s.statusMapping.includes(currentStatus),
  );

  // Check if current status is a branch (closed status)
  const isBranchStatus = branches.some((b) =>
    b.statusMapping.includes(currentStatus),
  );

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleStageClick = (stageId: string) => {
    const stage = [...stages, ...branches].find((s) => s.id === stageId);
    if (!stage) return;

    const isCurrentStage =
      currentStageIndex >= 0 && stages[currentStageIndex]?.id === stageId;
    const isBranchCurrent = branches.some(
      (b) => b.id === stageId && b.statusMapping.includes(currentStatus),
    );

    if (isCurrentStage || isBranchCurrent) {
      setSelectedStage(selectedStage === stageId ? null : stageId);
    } else {
      setSelectedStage(stageId);
      setPendingStage(stageId);
    }
  };

  const confirmStageChange = () => {
    if (pendingStage) {
      const stage = [...stages, ...branches].find((s) => s.id === pendingStage);
      if (stage && stage.statusMapping.length > 0) {
        onStatusChange(stage.statusMapping[0]);
      }
      setPendingStage(null);
      setSelectedStage(null);
    }
  };

  const cancelStageChange = () => {
    setPendingStage(null);
    setSelectedStage(null);
  };

  const getStageStatus = (index: number) => {
    if (isBranchStatus) return 'upcoming'; // If case is closed, all main stages are "done"
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-dark">PCN Journey</h3>
        <span className="text-xs text-gray">
          {issuerType === 'PRIVATE_COMPANY' ? 'Private Parking' : 'Council PCN'}
        </span>
      </div>

      {/* Timeline Container with scroll indicators */}
      <div className="relative">
        {/* Left fade gradient */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white to-transparent"
            />
          )}
        </AnimatePresence>

        {/* Right fade gradient */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-white to-transparent"
            />
          )}
        </AnimatePresence>

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="scrollbar-hide overflow-x-auto pb-4"
        >
          <div className="flex min-w-max items-start gap-0">
            {stages.map((stage, index) => {
              const status = getStageStatus(index);
              const isPending = pendingStage === stage.id;

              return (
                <div key={stage.id} className="flex items-start">
                  {/* Stage Node */}
                  <button
                    type="button"
                    onClick={() => handleStageClick(stage.id)}
                    className="group flex flex-col items-center"
                  >
                    {/* Circle */}
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        status === 'completed'
                          ? 'border-dark bg-dark text-white'
                          : status === 'current'
                            ? 'border-dark bg-white text-dark ring-4 ring-dark/10'
                            : isPending
                              ? 'border-dark/50 bg-dark/5 text-dark/70 ring-4 ring-dark/10'
                              : 'border-gray/30 bg-white text-gray/50 hover:border-gray/50 hover:text-gray'
                      }`}
                    >
                      <FontAwesomeIcon icon={stage.icon} className="text-sm" />
                      {status === 'completed' && (
                        <div className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                          <FontAwesomeIcon
                            icon={faCircleCheck}
                            className="text-xs text-dark"
                          />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`mt-2 max-w-[80px] text-center text-xs font-medium transition-colors ${
                        status === 'current' || status === 'completed'
                          ? 'text-dark'
                          : isPending
                            ? 'text-dark/70'
                            : 'text-gray'
                      }`}
                    >
                      {stage.shortLabel}
                    </span>

                    {/* Current Indicator */}
                    {status === 'current' && (
                      <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-dark"
                      >
                        You are here
                      </motion.span>
                    )}
                  </button>

                  {/* Connector Line */}
                  {index < stages.length - 1 && (
                    <div className="mt-5 flex items-center px-1">
                      <div
                        className={`h-0.5 w-12 transition-colors ${
                          status === 'completed' ? 'bg-dark' : 'bg-gray/20'
                        }`}
                      />
                      {stages[index + 1].daysFromPrevious !== undefined &&
                        stages[index + 1].daysFromPrevious !== 0 && (
                          <span className="mx-1 text-[10px] text-gray">
                            {stages[index + 1].daysFromPrevious}d
                          </span>
                        )}
                      <div
                        className={`h-0.5 w-12 transition-colors ${
                          status === 'completed' ? 'bg-dark' : 'bg-gray/20'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Branch Outcomes */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4">
        {branches.map((branch) => {
          const isActive = branch.statusMapping.includes(currentStatus);
          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => handleStageClick(branch.id)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-dark text-white'
                  : pendingStage === branch.id
                    ? 'bg-dark/10 text-dark ring-2 ring-dark/10'
                    : 'bg-light text-gray hover:bg-dark/5 hover:text-dark'
              }`}
            >
              <FontAwesomeIcon icon={branch.icon} />
              {branch.label}
            </button>
          );
        })}
      </div>

      {/* Stage Detail Popup */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 rounded-xl border border-border bg-white p-4 shadow-lg"
          >
            {(() => {
              const stage = [...stages, ...branches].find(
                (s) => s.id === selectedStage,
              );
              if (!stage) return null;

              const isCurrentStage =
                (currentStageIndex >= 0 &&
                  stages[currentStageIndex]?.id === selectedStage) ||
                branches.some(
                  (b) =>
                    b.id === selectedStage &&
                    b.statusMapping.includes(currentStatus),
                );

              return (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dark/10">
                        <FontAwesomeIcon icon={stage.icon} className="text-dark" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-dark">{stage.label}</h4>
                        <p className="text-sm text-gray">{stage.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStage(null)}
                      className="text-gray hover:text-dark"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>

                  {/* Confirmation Actions */}
                  {pendingStage === selectedStage && !isCurrentStage && (
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <p className="text-sm text-gray">
                        Update status to{' '}
                        <span className="font-semibold text-dark">{stage.label}</span>?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelStageChange}
                          className="bg-transparent"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={confirmStageChange}
                          className="bg-teal text-white hover:bg-teal-dark"
                        >
                          <FontAwesomeIcon icon={faCheck} className="mr-1.5" />
                          Confirm
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Stage Tips */}
                  {selectedStage === 'DISCOUNT_WINDOW' && (
                    <div className="mt-4 rounded-lg bg-amber/10 p-3">
                      <p className="flex items-start gap-2 text-sm text-amber-600">
                        <FontAwesomeIcon icon={faLightbulb} className="mt-0.5" />
                        <span>
                          <strong>Pro tip:</strong> Most councils will &quot;freeze&quot;
                          the discount if you challenge within 14 days. If rejected, they
                          usually re-offer the discount period.
                        </span>
                      </p>
                    </div>
                  )}

                  {selectedStage === 'ORDER_FOR_RECOVERY' && (
                    <div className="mt-4 rounded-lg bg-teal/10 p-3">
                      <p className="flex items-start gap-2 text-sm text-teal">
                        <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5" />
                        <span>
                          You can file a <strong>PE2/PE3</strong> (out of time witness
                          statement) or <strong>TE7/TE9</strong> form to revert to an
                          earlier stage.
                        </span>
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketStatusTimeline;
