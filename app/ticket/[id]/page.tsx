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
    <PageWrap>
      <h1>Ticket Page</h1>
      <pre>{JSON.stringify(ticket, null, 2)}</pre>
    </PageWrap>
  );
};

export default TicketPage;
