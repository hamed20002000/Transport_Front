// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from 'src/shared/components/compat';
import PageContainer from 'src/shared/components/container/PageContainer';

import ProfileBanner from 'src/features/profile/components/profile/ProfileBanner';
import IntroCard from 'src/features/profile/components/profile/IntroCard';
import PhotosCard from 'src/features/profile/components/profile/PhotosCard';
import Post from 'src/features/profile/components/profile/Post';

const UserProfile = () => {
  return (
    <PageContainer title="User Profile" description="this is User Profile page">

      <Grid container spacing={3}>
        <Grid item sm={12}>
          <ProfileBanner />
        </Grid>

        <Grid item sm={12} lg={4} xs={12}>
          <Grid container spacing={3}>
            <Grid item sm={12}>
              <IntroCard />
            </Grid>
            <Grid item sm={12}>
              <PhotosCard />
            </Grid>
          </Grid>
        </Grid>
        <Grid item sm={12} lg={8} xs={12}>
          <Post />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default UserProfile;
