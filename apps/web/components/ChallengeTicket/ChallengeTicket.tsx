'use client';

import { useState, useEffect } from 'react';
import { ChallengeType, IssuerType, TicketTier } from '@parking-ticket-pal/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faPaperPlane,
  faSpinnerThird,
  faExclamationTriangle,
  faEllipsis,
  faCheckCircle,
  faTimesCircle,
  faTrash,
} from '@fortawesome/pro-regular-svg-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getChallengeReasons } from '@/constants';
import { generateChallengeLetter } from '@/app/actions/letter';
import { challengeTicket, getTicketChallenges } from '@/app/actions/ticket';
import { toast } from 'sonner';
import { TicketWithRelations } from '@/types';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type ChallengeTicketProps = {
  ticket: TicketWithRelations;
  issuerType: IssuerType;
};

type ChallengeHistoryItem = {
  id: string;
  type: 'letter' | 'auto-challenge';
  timestamp: Date;
  status: 'success' | 'error' | 'pending';
  message?: string;
  challengeReason: string;
  additionalDetails?: string;
  letterId?: string;
  challengeId?: string;
};

const ChallengeHistoryListItem = ({
  item,
  onRetry,
}: {
  item: ChallengeHistoryItem;
  onRetry: (item: ChallengeHistoryItem) => void;
}) => {
  const statusConfig = {
    success: {
      icon: faCheckCircle,
      color: 'text-green-500',
      badge: 'default' as const,
    },
    error: {
      icon: faTimesCircle,
      color: 'text-red-500',
      badge: 'destructive' as const,
    },
    pending: {
      icon: faSpinnerThird,
      color: 'text-blue-500',
      badge: 'secondary' as const,
      spin: true,
    },
  };
  const config = statusConfig[item.status];

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <FontAwesomeIcon
            icon={config.icon}
            className={`${config.color} ${'spin' in config && config.spin ? 'animate-spin' : ''}`}
          />
        </div>
        <div>
          <p className="font-medium">
            {item.type === 'letter'
              ? 'Challenge Letter Generation'
              : 'Auto-Challenge Submission'}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.timestamp.toLocaleString()}
          </p>
          {item.message && (
            <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={config.badge}>{item.status}</Badge>
        {item.status === 'error' && (
          <Button size="sm" variant="outline" onClick={() => onRetry(item)}>
            Retry
          </Button>
        )}
      </div>
    </li>
  );
};

const ChallengeTicket = ({ ticket, issuerType }: ChallengeTicketProps) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isAutoChallenging, setIsAutoChallenging] = useState(false);
  const [challengeHistory, setChallengeHistory] = useState<
    ChallengeHistoryItem[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { track } = useAnalytics();

  // Load challenge history from database
  useEffect(() => {
    const loadChallengeHistory = async () => {
      try {
        // Load challenges from database using server action
        const challenges = await getTicketChallenges(ticket.id);
        if (challenges) {
          const historyItems: ChallengeHistoryItem[] = challenges.map(
            (challenge) => ({
              id: challenge.id,
              type: challenge.type === 'LETTER' ? 'letter' : 'auto-challenge',
              timestamp: new Date(challenge.createdAt),
              status: (() => {
                switch (challenge.status) {
                  case 'SUCCESS':
                    return 'success';
                  case 'ERROR':
                    return 'error';
                  default:
                    return 'pending';
                }
              })(),
              message: undefined, // Will be populated once Prisma client is regenerated
              challengeReason: challenge.reason,
              additionalDetails: challenge.customReason || undefined,
              challengeId: challenge.id,
              letterId: undefined, // Will be populated once Prisma client is regenerated
            }),
          );
          setChallengeHistory(historyItems);
        }
      } catch (error) {
        console.error('Failed to load challenge history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChallengeHistory();
  }, [ticket.id]);

  const challengeReasons = getChallengeReasons(issuerType);
  const hasChallengeReason = selectedReason;
  const isProTier = ticket.tier === TicketTier.PREMIUM;

  const handleAction = async (
    action: 'letter' | 'auto-challenge',
    apiCall: () => Promise<any>,
    setLoading: (loading: boolean) => void,
  ) => {
    if (!hasChallengeReason) {
      toast.error('Please select a challenge reason first.');
      return;
    }
    setLoading(true);
    const pendingItem: ChallengeHistoryItem = {
      id: `${action}-${Date.now()}`,
      type: action,
      timestamp: new Date(),
      status: 'pending',
      challengeReason: selectedReason!,
      additionalDetails: customReason || undefined,
    };
    setChallengeHistory((prev) => [pendingItem, ...prev]);

    try {
      const result = await apiCall();
      if (result && result.success) {
        setChallengeHistory((prev) =>
          prev.map((item) =>
            item.id === pendingItem.id
              ? {
                  ...item,
                  status: 'success',
                  message:
                    result.message ||
                    `Challenge ${action === 'letter' ? 'letter generated' : 'auto-submitted'} successfully.`,
                  letterId: result.letterId,
                  challengeId: result.challengeId,
                }
              : item,
          ),
        );
        toast.success(
          result.message ||
            `Challenge ${action === 'letter' ? 'letter generated' : 'auto-submitted'} successfully.`,
        );
      } else {
        throw new Error(result?.message || 'API call failed');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      setChallengeHistory((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id
            ? { ...item, status: 'error', message }
            : item,
        ),
      );
      toast.error(
        `Failed to ${action === 'letter' ? 'generate challenge letter' : 'auto-submit challenge'}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLetter = async () => {
    // ensure we get the label, not the key
    const challengeReasonEntry =
      challengeReasons[selectedReason as keyof typeof challengeReasons];

    if (!challengeReasonEntry) {
      console.error(
        'Selected reason not found in challenge reasons:',
        selectedReason,
      );
      toast.error('Invalid challenge reason selected.');
      return;
    }

    const challengeReasonLabel = challengeReasonEntry.label;

    await track(TRACKING_EVENTS.CHALLENGE_LETTER_GENERATED, {
      ticketId: ticket.id,
      challengeType: ChallengeType.LETTER,
    });

    handleAction(
      'letter',
      () =>
        generateChallengeLetter(
          ticket.id,
          challengeReasonLabel,
          customReason || undefined,
        ),
      setIsGeneratingLetter,
    );
  };

  const handleAutoChallenge = async () => {
    // ensure we get the label, not the key
    const challengeReasonEntry =
      challengeReasons[selectedReason as keyof typeof challengeReasons];

    if (!challengeReasonEntry) {
      console.error(
        'Selected reason not found in challenge reasons:',
        selectedReason,
      );
      toast.error('Invalid challenge reason selected.');
      return;
    }

    const challengeReasonLabel = challengeReasonEntry.label;

    await track(TRACKING_EVENTS.CHALLENGE_SUBMITTED, {
      ticketId: ticket.id,
      challengeId: '', // TODO: figure out how to get the challenge id
    });

    handleAction(
      'auto-challenge',
      () =>
        challengeTicket(ticket.pcnNumber, challengeReasonLabel, customReason),
      setIsAutoChallenging,
    );
  };

  const handleRetry = (item: ChallengeHistoryItem) => {
    if (item.type === 'letter') {
      return handleAction(
        'letter',
        () =>
          generateChallengeLetter(
            ticket.id,
            item.challengeReason,
            item.additionalDetails,
          ),
        setIsGeneratingLetter,
      );
    }
    return handleAction(
      'auto-challenge',
      () =>
        challengeTicket(
          ticket.pcnNumber,
          item.challengeReason,
          item.additionalDetails,
        ),
      setIsAutoChallenging,
    );
  };

  const handleClearForm = () => {
    setSelectedReason('');
    setCustomReason('');
    toast.info('Challenge form cleared.');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Challenge This Ticket</CardTitle>
            <CardDescription>
              Provide a reason for your challenge to generate a letter or
              auto-submit.
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <FontAwesomeIcon icon={faEllipsis} size="lg" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearForm}>
                <FontAwesomeIcon icon={faTrash} size="lg" className="mr-2" />
                Clear Form
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="challenge-reason" className="font-medium">
              Why are you challenging this ticket?
            </Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a common reason for challenging" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(challengeReasons).map(([key, reason]) => (
                  <SelectItem key={key} value={key}>
                    <p className="font-medium">{reason.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {reason.description}
                    </p>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-reason">Additional details (optional)</Label>
            <Textarea
              id="custom-reason"
              placeholder="Provide any other relevant information..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {(() => {
          if (isLoadingHistory) {
            return (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Challenge History</h3>
                <div className="flex items-center justify-center py-8">
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="animate-spin text-muted-foreground"
                  />
                  <span className="ml-2 text-muted-foreground">
                    Loading challenge history...
                  </span>
                </div>
              </div>
            );
          }

          if (challengeHistory.length > 0) {
            return (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Challenge History</h3>
                <ul className="space-y-3">
                  {challengeHistory.map((item) => (
                    <ChallengeHistoryListItem
                      key={item.id}
                      item={item}
                      onRetry={handleRetry}
                    />
                  ))}
                </ul>
              </div>
            );
          }

          return null;
        })()}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-muted/50 px-6 py-4">
        {isProTier ? (
          <>
            <div>
              {!hasChallengeReason && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="h-4 w-4"
                  />
                  <span>Select a reason to proceed.</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAutoChallenge}
                disabled={
                  !hasChallengeReason || isAutoChallenging || isGeneratingLetter
                }
                variant="outline"
              >
                <FontAwesomeIcon
                  icon={isAutoChallenging ? faSpinnerThird : faPaperPlane}
                  className={`mr-2 h-4 w-4 ${isAutoChallenging ? 'animate-spin' : ''}`}
                />
                Auto-Submit
              </Button>
              <Button
                onClick={handleGenerateLetter}
                disabled={
                  !hasChallengeReason || isGeneratingLetter || isAutoChallenging
                }
              >
                <FontAwesomeIcon
                  icon={isGeneratingLetter ? faSpinnerThird : faFileLines}
                  className={`mr-2 h-4 w-4 ${isGeneratingLetter ? 'animate-spin' : ''}`}
                />
                Generate Letter
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full text-center">
            <p className="mb-2 font-semibold">
              Upgrade to PREMIUM to challenge this ticket.
            </p>
            <Button>Upgrade Now</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ChallengeTicket;
