// src/layouts/full/shared/sidebar/SidebarItems.tsx
import React from 'react';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery, CircularProgress, Typography } from 'src/shared/components/compat';
import { useSelector, useDispatch } from 'src/app/store';
import { toggleMobileSidebar } from 'src/app/store/customizer/CustomizerSlice';
import NavItem from 'src/app/layouts/full/vertical/sidebar/NavItem';
import NavCollapse from 'src/app/layouts/full/vertical/sidebar/NavCollapse';
import NavGroup from 'src/app/layouts/full/vertical/sidebar/NavGroup/NavGroup';
import { AppState } from 'src/app/store';
import { useAuth } from 'src/core/auth/AuthContext';
import { IconLayoutDashboard } from '@tabler/icons-react';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  const dispatch = useDispatch();

  const { menuItems, isAuthDataLoading } = useAuth();

  const [openCollapseId, setOpenCollapseId] = React.useState<string | null>(null);

  const handleToggleCollapse = (id: string) => {
    setOpenCollapseId((prevId) => (prevId === id ? null : id));
  };

  React.useEffect(() => {
    let newOpenCollapseId: string | null = null;
    menuItems.forEach(item => {
      if (item.children) {
        const isActiveParent = item.children.some((child: any) =>
          child.href === pathname ||
          (child.children && child.children.some((grandchild: any) => grandchild.href === pathname))
        );
        if (isActiveParent && item.id) {
          newOpenCollapseId = item.id;
        }
      }
    });
    setOpenCollapseId(newOpenCollapseId);
  }, [pathname, menuItems]);

  if (isAuthDataLoading) {
    return (
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant="body1" sx={{ ml: 2 }}>Menüler yükleniyor...</Typography>
      </Box>
    );
  }


  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        <NavItem
          item={{ id: 'admin-overview', title: 'پنل مدیریت', href: '/admin', icon: IconLayoutDashboard }}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={() => { if (!lgUp) dispatch(toggleMobileSidebar()); }}
        />
        {menuItems.map((item) => {
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                isOpen={item.id === openCollapseId}
                onToggle={handleToggleCollapse}
              />
            );
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={() => dispatch(toggleMobileSidebar())}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};

export default SidebarItems;
