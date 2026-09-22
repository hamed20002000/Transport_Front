// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import PageContainer from 'src/shared/components/container/PageContainer';
import ProfileBanner from 'src/features/profile/components/profile/ProfileBanner';
import FollowerCard from 'src/features/profile/components/followers/FollowerCard';


const Followers = () => {
  return (
    <PageContainer title="User Profile" description="this is User Profile page">
     
      <Grid container spacing={3}>
        <Grid item sm={12}>
          <ProfileBanner />
        </Grid>
        <Grid item sm={12}>
          <FollowerCard />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Followers;
