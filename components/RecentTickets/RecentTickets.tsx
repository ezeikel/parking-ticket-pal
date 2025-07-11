import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/pro-regular-svg-icons';
import { getTickets } from '@/app/actions/ticket';
import TicketCard from '@/components/TicketCard/TicketCard';

const RecentTickets = async () => {
  const tickets = (await getTickets()) ?? [];
  const recentTickets = tickets
    .sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
    )
    .slice(0, 3);

  if (!recentTickets.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-slab font-medium text-2xl">
          Recent Tickets
        </CardTitle>
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            View All
            <FontAwesomeIcon icon={faArrowRight} size="sm" className="ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {recentTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentTickets;
