// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, Theme } from 'src/shared/components/compat';
import Breadcrumb from 'src/app/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/shared/components/container/PageContainer';
import NoteSidebar from 'src/features/notes/components/NoteSidebar';
import NoteContent from 'src/features/notes/components/NoteContent';
import AppCard from 'src/shared/components/AppCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Notes',
  },
];

const Notes = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));

  useEffect(() => {
    if (lgDown) {
      setMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setMobileSidebarOpen(true);
    }
  }, [lgDown, isMobileSidebarOpen]);

  return (
    <PageContainer title="Notes ui" description="this is Note page">
      <Breadcrumb title="Note app" items={BCrumb} />
      <AppCard>
        {isMobileSidebarOpen ? (
          <NoteSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        ) : (
          <></>
        )}

        <Box flexGrow={1}>
          <NoteContent toggleNoteSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default Notes;
