import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faCarSide,
  faTicketPerforated,
  faCalendar,
} from '@fortawesome/pro-regular-svg-icons';

const QuickActions = () => {
  const actions = [
    {
      title: 'Upload Ticket',
      description: 'Add a new parking ticket',
      icon: faUpload,
      href: '/new',
      variant: 'default' as const,
    },
    {
      title: 'Manage Vehicles',
      description: 'View and edit your vehicles',
      icon: faCarSide,
      href: '/vehicles',
      variant: 'outline' as const,
    },
    {
      title: 'View Tickets',
      description: 'See all your tickets',
      icon: faTicketPerforated,
      href: '/tickets',
      variant: 'outline' as const,
    },
    {
      title: 'Upcoming Due',
      description: 'Tickets due soon',
      icon: faCalendar,
      href: '/tickets?filter=upcoming',
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Button
            variant={action.variant}
            className="w-full h-auto py-6 flex flex-col items-center gap-2"
          >
            <FontAwesomeIcon
              icon={action.icon}
              size="sm"
              className="scale-150"
            />
            <div className="flex flex-col items-center">
              <span className="font-semibold">{action.title}</span>
              <span className="text-sm text-muted-foreground">
                {action.description}
              </span>
            </div>
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default QuickActions;
