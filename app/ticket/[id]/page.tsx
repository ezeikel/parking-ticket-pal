import { getTicket } from '@/app/actions';
import PageWrap from '@/components/PageWrap/PageWrap';

type TicketPageProps = {
  params: {
    id: string;
  };
};

const TicketPage = async ({ params: { id } }: TicketPageProps) => {
  const ticket = await getTicket(id);

  return (
    <PageWrap className="gap-y-16">
      <h1 className="font-sans text-4xl font-bold text-center">
        Ticket {ticket?.pcnNumber}
      </h1>
      <pre>{JSON.stringify(ticket, null, 2)}</pre>
    </PageWrap>
  );
};

export default TicketPage;
