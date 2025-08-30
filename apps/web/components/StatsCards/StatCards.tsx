import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicketPerforated,
  faClock,
  faMoneyBill,
  faCarSide,
} from '@fortawesome/pro-regular-svg-icons';
import { getTickets } from '@/app/actions/ticket';

const StatsCards = async () => {
  const tickets = (await getTickets()) ?? [];

  const totalTickets = tickets.length;
  const upcomingDue = tickets.filter((ticket) => {
    const dueDate = new Date(ticket.issuedAt);
    dueDate.setDate(dueDate.getDate() + 14); // Assuming 14 days to pay
    return (
      dueDate > new Date() &&
      dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ); // Next 7 days
  }).length;

  const totalAmount = tickets.reduce(
    (acc, ticket) => acc + ticket.initialAmount,
    0,
  );
  const uniqueVehicles = new Set(tickets.map((ticket) => ticket.vehicleId))
    .size;

  const stats = [
    {
      title: 'Total Tickets',
      value: totalTickets,
      icon: faTicketPerforated,
      description: 'All parking tickets',
    },
    {
      title: 'Upcoming Due',
      value: upcomingDue,
      icon: faClock,
      description: 'Due in next 7 days',
    },
    {
      title: 'Total Amount',
      value: `£${(totalAmount / 100).toFixed(2)}`,
      icon: faMoneyBill,
      description: 'Across all tickets',
    },
    {
      title: 'Vehicles',
      value: uniqueVehicles,
      icon: faCarSide,
      description: 'Unique vehicles',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <FontAwesomeIcon
              icon={stat.icon}
              size="sm"
              className="text-muted-foreground scale-150"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
