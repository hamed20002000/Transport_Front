import { Grid } from 'src/shared/components/compat';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'src/app/store';

import { fetchPosts } from 'src/features/profile/model/UserProfileSlice';
import PostItem from 'src/features/profile/components/profile/PostItem';
import { PostTextBox } from 'src/features/profile/components/profile/PostTextBox';
import { PostType } from 'src/features/profile/types';

const Post = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const getPosts: PostType[] = useSelector((state) => state.userpostsReducer.posts);

  return (
    <Grid container spacing={3}>
      <Grid item sm={12}>
        <PostTextBox />
      </Grid>
      {getPosts.map((posts) => {
        return (
          <Grid item sm={12} key={posts.id}>
            <PostItem post={posts} />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default Post;
