// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Drawer, Theme, useMediaQuery } from 'src/shared/components/compat';
import NoteList from 'src/features/notes/components/NoteList';

const drawerWidth = 260;

interface NoteType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const NoteSidebar = ({ isMobileSidebarOpen, onSidebarClose }: NoteType) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        zIndex: lgUp ? 0 : 1,
        [`& .UiDrawer-paper`]: { position: 'relative' },
      }}
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant={lgUp ? 'persistent' : 'temporary'}
    >
      <NoteList />
    </Drawer>
  );
};

export default NoteSidebar;
