// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Grid } from 'src/shared/components/compat';
import PageContainer from 'src/shared/components/container/PageContainer';

import WeeklyStats from 'src/features/dashboard/components/widgets/modern/WeeklyStats';
import YearlySales from 'src/features/dashboard/components/widgets/ecommerce/YearlySales';
import PaymentGateways from 'src/features/dashboard/components/widgets/ecommerce/PaymentGateways';
import WelcomeCard from 'src/features/dashboard/components/widgets/ecommerce/WelcomeCard';
import Expence from 'src/features/dashboard/components/widgets/ecommerce/Expence';
import Growth from 'src/features/dashboard/components/widgets/ecommerce/Growth';
import RevenueUpdates from 'src/features/dashboard/components/widgets/ecommerce/RevenueUpdates';
import SalesOverview from 'src/features/dashboard/components/widgets/ecommerce/SalesOverview';
import SalesTwo from 'src/features/dashboard/components/widgets/ecommerce/SalesTwo';
import Sales from 'src/features/dashboard/components/widgets/ecommerce/Sales';
import MonthlyEarnings from 'src/features/dashboard/components/widgets/ecommerce/MonthlyEarnings';
import ProductPerformances from 'src/features/dashboard/components/widgets/ecommerce/ProductPerformances';
import RecentTransactions from 'src/features/dashboard/components/widgets/ecommerce/RecentTransactions';

const Ecommerce = () => {
  return (
    <PageContainer title="eCommerce Dashboard" description="this is eCommerce Dashboard page">
      <Box mt={3}>
        <Grid container spacing={3}>
          {/* column */}
          <Grid item xs={12} lg={8}>
            <WelcomeCard />
          </Grid>

          {/* column */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Expence />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Sales />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <RevenueUpdates />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <SalesOverview />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <SalesTwo />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Growth />
              </Grid>
              <Grid item xs={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>
          {/* column */}
          <Grid item xs={12} sm={6} lg={4}>
            <WeeklyStats />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <YearlySales />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <PaymentGateways />
          </Grid>
          {/* column */}

          <Grid item xs={12} lg={4}>
            <RecentTransactions />
          </Grid>
          {/* column */}

          <Grid item xs={12} lg={8}>
            <ProductPerformances />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Ecommerce;
