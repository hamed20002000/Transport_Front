// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import YearlyBreakup from 'src/features/dashboard/components/widgets/modern/YearlyBreakup';
import Projects from 'src/features/dashboard/components/widgets/modern/Projects';
import Customers from 'src/features/dashboard/components/widgets/modern/Customers';
import SalesTwo from 'src/features/dashboard/components/widgets/ecommerce/SalesTwo';
import MonthlyEarnings from 'src/features/dashboard/components/widgets/ecommerce/MonthlyEarnings';
import SalesOverview from 'src/features/dashboard/components/widgets/ecommerce/SalesOverview';
import RevenueUpdates from 'src/features/dashboard/components/widgets/ecommerce/RevenueUpdates';
import YearlySales from 'src/features/dashboard/components/widgets/ecommerce/YearlySales';
import MostVisited from 'src/features/ui-examples/components/widgets/charts/MostVisited';
import PageImpressions from 'src/features/ui-examples/components/widgets/charts/PageImpressions';
import Followers from 'src/features/ui-examples/components/widgets/charts/Followers';
import Views from 'src/features/ui-examples/components/widgets/charts/Views';
import Earned from 'src/features/ui-examples/components/widgets/charts/Earned';
import CurrentValue from 'src/features/ui-examples/components/widgets/charts/CurrentValue';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Charts',
  },
];

const WidgetCharts = () => {
  return (
    <PageContainer title="Charts" description="this is Charts page">
      {/* breadcrumb */}
      <Breadcrumb title="Charts" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={3}>
          <Followers />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Views />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Earned />
        </Grid>
        <Grid item xs={12} sm={3}>
          <SalesTwo />
        </Grid>
        <Grid item xs={12}>
          <CurrentValue />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <YearlyBreakup />
            </Grid>
            <Grid item xs={12}>
              <MonthlyEarnings />
            </Grid>
            <Grid item xs={12}>
              <MostVisited />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <YearlySales />
            </Grid>
            <Grid item xs={12}>
              <PageImpressions />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Customers />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Projects />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <RevenueUpdates />
            </Grid>
            <Grid item xs={12}>
              <SalesOverview />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default WidgetCharts;
