import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faEye,
  faTrashAlt,
} from '@fortawesome/pro-duotone-svg-icons';
import { LoaderType } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteTicket, generateChallengeLetter } from '@/app/actions';
import { useToast } from '@/components/ui/use-toast';
import Loader from '../Loader/Loader';

type TicketActionsCellProps = {
  row: any;
};

const TicketActionsCell = ({ row }: TicketActionsCellProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <div className="flex gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`ticket/${row.original.id}`}>
                <FontAwesomeIcon
                  icon={faEye}
                  size="lg"
                  className="cursor-pointer"
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white font-sans">
              <p>View ticket</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <FontAwesomeIcon
                icon={faWandMagicSparkles}
                size="lg"
                className="cursor-pointer"
                onClick={async () => {
                  setIsLoading(true);
                  // generate challenge letter
                  await generateChallengeLetter(row.original.id as string);

                  setIsLoading(false);

                  toast({
                    title: `Challenge letter generated for ticket: ${row.original.pcnNumber}`,
                    description:
                      'Check your email for the generated challenge letter.',
                  });
                }}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white font-sans">
              <p>Generate a challenge letter using AI</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <FontAwesomeIcon
                icon={faTrashAlt}
                size="lg"
                className="cursor-pointer"
                onClick={() => deleteTicket(row.original.id)}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white font-sans">
              <p>View ticket</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <AlertDialog open={isLoading} onOpenChange={setIsLoading}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              Generating letter for ticket {row.original.pcnNumber}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Loader
                className="my-8"
                type={LoaderType.CREATING_CHALLENGE_LETTER}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TicketActionsCell;
