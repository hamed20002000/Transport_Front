import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import TicketListing from 'src/features/tickets/components/TicketListing';
import TicketFilter from 'src/features/tickets/components/TicketFilter';
import ChildCard from 'src/shared/components/ChildCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Tickets',
  },
];

const TicketList = () => {
  return (
    <PageContainer title="Tickets App" description="this is Note page">
      <Breadcrumb title="Tickets app" items={BCrumb} />
      <ChildCard>
        <TicketFilter />
        <TicketListing />
      </ChildCard>
    </PageContainer>
  );
};

export default TicketList;
