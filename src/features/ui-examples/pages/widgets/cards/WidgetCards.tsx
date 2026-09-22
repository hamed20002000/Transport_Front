// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';

import PaymentGateways from 'src/features/dashboard/components/widgets/ecommerce/PaymentGateways';
import RecentTransactions from 'src/features/dashboard/components/widgets/ecommerce/RecentTransactions';
import TopCards from 'src/features/dashboard/components/widgets/modern/TopCards';
import UpcomingAcitivity from 'src/features/ui-examples/components/widgets/cards/UpcomingActivity';
import ComplexCard from 'src/features/ui-examples/components/widgets/cards/ComplexCard';
import MusicCard from 'src/features/ui-examples/components/widgets/cards/MusicCard';
import EcommerceCard from 'src/features/ui-examples/components/widgets/cards/EcommerceCard';
import FollowerCard from 'src/features/ui-examples/components/widgets/cards/FollowerCard';
import FriendCard from 'src/features/ui-examples/components/widgets/cards/FriendCard';
import ProfileCard from 'src/features/ui-examples/components/widgets/cards/ProfileCard';

import Settings from 'src/features/ui-examples/components/widgets/cards/Settings';
import GiftCard from 'src/features/ui-examples/components/widgets/cards/GiftCard';


const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Cards',
  },
];

const WidgetCards = () => {
  return (
    <PageContainer title="Cards" description="this is Cards page">
    {/* breadcrumb */}
    <Breadcrumb title="Cards" items={BCrumb} />
    {/* end breadcrumb */}
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TopCards />
      </Grid>
      <Grid item xs={12}>
        <ComplexCard />
      </Grid>
      <Grid item xs={12}>
        <EcommerceCard />
      </Grid>
      <Grid item xs={12}>
        <MusicCard />
      </Grid>
      <Grid item xs={12}>
        <FollowerCard />
      </Grid>
      <Grid item xs={12}>
        <FriendCard />
      </Grid>
      <Grid item xs={12}>
        <ProfileCard />
      </Grid>
      <Grid item xs={12} sm={6} lg={4}>
        <Settings />
      </Grid>
      <Grid item xs={12} lg={8}>
        <GiftCard />
      </Grid>
      <Grid item xs={12} sm={6} lg={4}>
        <PaymentGateways />
      </Grid>
      <Grid item xs={12} sm={6} lg={4}>
        <UpcomingAcitivity />
      </Grid>
      <Grid item xs={12} sm={6} lg={4}>
        <RecentTransactions />
      </Grid>
    </Grid>
    </PageContainer>
  );
};

export default WidgetCards;
