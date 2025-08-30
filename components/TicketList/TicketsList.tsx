import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import tw from "twrnc";
import { FlashList } from "@shopify/flash-list";
import { faCircleExclamation, faClock } from
  "@fortawesome/pro-regular-svg-icons";
import {
  differenceInMinutes, differenceInHours, differenceInDays,
  differenceInMilliseconds, parseISO, addDays
} from 'date-fns';
import useTickets from '@/hooks/api/useTickets';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Ticket, TicketStatus } from '@/types';

const DISCOUNT_THRESHOLD_MS = 172800000; // 48 hours in milliseconds

const gridGap = 16;

type CountdownTimerProps = {
  deadline: string;
};

const CountdownTimer = ({ deadline }: CountdownTimerProps) => {
  const calculateTimeLeft = (deadline: string) => {
    const now = new Date();
    const targetDate = parseISO(deadline);

    const days = differenceInDays(targetDate, now);
    const hours = differenceInHours(targetDate, now) % 24;
    const minutes = differenceInMinutes(targetDate, now) % 60;

    return { days, hours, minutes };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [deadline]);

  const { days, hours, minutes } = timeLeft;

  if (days <= 0 && hours <= 0 && minutes <= 0) return null;

  return (
    <View style={tw`flex-row items-center`}>
      <FontAwesomeIcon icon={faClock} size={16} color="#000" />
      <Text style={tw`ml-2 text-sm text-black`}>{`${days}d ${hours}h ${minutes}m
  left`}</Text>
    </View>
  );
};

const TicketItem = ({ ticket, style }: {
  ticket: Ticket;
  style: Record<string, unknown>
}) => {
  // Calculate estimated payment deadline based on issued date (typically 28 days for full payment)
  const estimatedFullPaymentDeadline = addDays(new Date(ticket.issuedAt), 28);
  const estimatedDiscountDeadline = addDays(new Date(ticket.issuedAt), 14);

  const isDiscountPeriod = ticket.status === TicketStatus.ISSUED_DISCOUNT_PERIOD;
  const paymentDeadline = isDiscountPeriod ? estimatedDiscountDeadline :
    estimatedFullPaymentDeadline;

  return (
    <View style={tw.style(`rounded-lg border border-[#e4e4e7] bg-white 
  text-[#09090b] shadow-sm`, {
      ...style
    })}
    >
      <View style={tw`flex-col gap-y-1.5 p-6`}>
        <Text style={tw.style(`font-semibold tracking-tight text-lg`, {
          whiteSpace: 'nowrap',
        })}>{`${ticket.pcnNumber} - ${ticket.issuer}`}</Text>
        <Text style={tw`text-sm text-[#71717a]`}>
          {`Issued on ${new Date(ticket.issuedAt).toLocaleDateString()} at ${new
            Date(ticket.issuedAt).toLocaleTimeString()}`}
        </Text>
      </View>
      <View style={tw`p-6 pt-0`}>
        <Text style={tw`mb-2`}>Contravention: {ticket.contraventionCode}</Text>
        <View style={tw`flex-row flex-wrap items-center justify-between`}>
          <CountdownTimer deadline={paymentDeadline.toISOString()} />
        </View>
      </View>
      <View style={tw`flex-row items-center p-6 pt-0 justify-end gap-x-2`}>
        <Pressable style={tw`py-2 px-4 rounded border border-[#e4e4e7] 
  hover:text-accent-foreground`}>
          <Text style={tw`text-sm font-bold`}>
            Challenge
          </Text>
        </Pressable>
        <Pressable style={tw`py-2 px-4 rounded bg-[#18181b] text-white 
  hover:bg-primary/90`}>
          <Text style={tw`text-sm text-white font-bold`}>
            Pay Now
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const TicketsList = () => {
  const { data: { tickets } = {}, isLoading } = useTickets();

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text>Loading...</Text>
      </View>
    )
  }

  if (!tickets || !tickets.length) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <Text>No tickets found.</Text>
      </View>
    )
  }

  // check for upcoming deadlines using estimated payment deadlines
  const hasUpcomingDeadlines = tickets.some(ticket => {
    const estimatedFullPaymentDeadline = addDays(new Date(ticket.issuedAt), 28);
    return differenceInMilliseconds(estimatedFullPaymentDeadline, new Date()) <
      DISCOUNT_THRESHOLD_MS;
  });

  return (
    <View style={tw`flex-1 gap-y-6 p-4`}>
      <View>
        {hasUpcomingDeadlines && (
          <View style={tw`rounded-lg bg-yellow-100 p-4 gap-y-2`} role="alert">
            <View style={tw`flex-row items-center`}>
              <FontAwesomeIcon style={tw`mr-2 text-yellow-800`}
                icon={faCircleExclamation} size={16} color={tw.color('text-yellow-800')} />
              <Text style={tw`text-yellow-800 font-semibold`}>Attention:</Text>
            </View>
            <Text style={tw`text-yellow-800`}>You have tickets with upcoming
              discount deadlines. Act now to save!</Text>
          </View>
        )
        }
      </View >
      <FlashList
        data={tickets}
        renderItem={({ item, index }) => {

          const isLastRow =
            Math.floor(index) ===
            Math.floor(tickets.length - 1);

          return (
            <TicketItem ticket={item} style={tw.style({
              marginBottom: isLastRow ? 0 : gridGap,
            })} />
          )
        }}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id.toString()}
      />
    </View >
  )
}

export default TicketsList;