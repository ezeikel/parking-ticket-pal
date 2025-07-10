'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getTimelineByIssuer, type TimelineStage } from '@/constants/timelines';
import type { TicketStatus } from '@/types';
import { IssuerType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TicketStatusTimelineProps = {
  currentStatus: TicketStatus;
  issuerType: IssuerType;
   
  onStatusChange: (newStatus: TicketStatus) => void;
};

const stageTypeColors = {
  initial: 'bg-blue-500 border-blue-500',
  payment: 'bg-blue-500 border-blue-500',
  appeal: 'bg-amber-500 border-amber-500',
  legal: 'bg-amber-500 border-amber-500',
  enforcement: 'bg-red-500 border-red-500',
  bailiff: 'bg-red-700 border-red-700',
  closed: 'bg-green-500 border-green-500',
};

const TicketStatusTimeline = ({
  currentStatus,
  issuerType,
  onStatusChange,
}: TicketStatusTimelineProps) => {
  const timeline = useMemo(() => getTimelineByIssuer(issuerType), [issuerType]);

  const currentStageIndex = useMemo(() => {
    const index = timeline.findIndex((stage) =>
      stage.statusMapping.includes(currentStatus),
    );
    return index === -1 ? 0 : index;
  }, [timeline, currentStatus]);

  const [selectedStage, setSelectedStage] = useState<TimelineStage>(
    timeline[currentStageIndex],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stageToConfirm, setStageToConfirm] = useState<TimelineStage | null>(
    null,
  );

  const handleStageClick = (stage: TimelineStage) => {
    setSelectedStage(stage);
  };

  const handleSetAsCurrentClick = (stage: TimelineStage) => {
    if (
      stage.statusMapping.length > 0 &&
      stage.id !== timeline[currentStageIndex]?.id
    ) {
      setStageToConfirm(stage);
      setDialogOpen(true);
    }
  };

  const confirmStatusChange = () => {
    if (stageToConfirm && stageToConfirm.statusMapping.length > 0) {
      onStatusChange(stageToConfirm.statusMapping[0]);
    }
    setDialogOpen(false);
    setStageToConfirm(null);
  };

  return (
    <div className="flex flex-col gap-y-6 w-full mb-4">
      <div className="relative w-full overflow-x-auto scrollbar-hide">
        <div className="relative flex items-start min-w-max pt-2">
          {/* TODO: needed top padding otherwise top of marker is cut off */}
          {timeline.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isSelected = selectedStage?.id === stage.id;
            const color = stageTypeColors[stage.stageType];
            const isLast = index === timeline.length - 1;

            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={stage.id}
                role="button"
                tabIndex={0}
                className="relative flex flex-col items-center group cursor-pointer"
                onClick={() => handleStageClick(stage)}
                style={{ width: '200px', minWidth: '200px' }}
              >
                {/* Top half - Timeline lines and circle */}
                <div className="relative w-full flex items-center justify-center">
                  {/* Left line (except for first item) */}
                  {index > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border" />
                  )}

                  {/* Right line (except for last item) */}
                  {!isLast && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border" />
                  )}

                  {/* Progress line - left side */}
                  {index > 0 && index <= currentStageIndex && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-purple-500" />
                  )}

                  {/* Progress line - right side */}
                  {!isLast && index < currentStageIndex && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-purple-500" />
                  )}

                  {/* Stage Marker */}
                  <div
                    className={cn(
                      'relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300',
                      {
                        [`${color} scale-125 shadow-lg`]: isCurrent,
                        'bg-blue-500 border-blue-500':
                          isCompleted && !isCurrent,
                        'bg-background border-border':
                          !isCompleted && !isCurrent,
                        'border-primary': isSelected && !isCurrent,
                      },
                    )}
                  >
                    {/* Show inner dot for selected (but not current) stages */}
                    {isSelected && !isCurrent && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                    {/* Show checkmark for completed (and not selected) stages */}
                    {isCompleted && !isSelected && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Bottom half - Stage Title */}
                <div className="w-full px-2 py-2">
                  <span
                    className={cn(
                      'block text-xs text-center w-full transition-colors',
                      isCurrent || isSelected
                        ? 'font-bold text-primary'
                        : 'text-muted-foreground',
                      'group-hover:text-primary',
                    )}
                  >
                    {stage.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedStage && (
        <div className="p-4 border rounded-lg bg-muted/50 transition-all duration-500">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedStage.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedStage.description}
              </p>
            </div>
            {selectedStage.id !== timeline[currentStageIndex]?.id &&
              selectedStage.statusMapping.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 bg-transparent"
                  onClick={() => handleSetAsCurrentClick(selectedStage)}
                >
                  Set as Current
                </Button>
              )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              What you can do:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedStage.actions.length > 0 ? (
                selectedStage.actions.map((action) => (
                  <Badge key={action.label} variant="secondary">
                    {action.label}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No specific actions at this stage.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the ticket status to &quot;
              {stageToConfirm?.title}
              &quot;? This may have irreversible consequences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStageToConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TicketStatusTimeline;
