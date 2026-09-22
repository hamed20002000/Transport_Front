import { useMediaQuery, Box, Drawer, Container, Theme } from 'src/shared/components/compat';
import NavListing from 'src/app/layouts/full/horizontal/navbar/NavListing/NavListing';
import { useSelector, useDispatch } from 'src/app/store';
import { toggleMobileSidebar } from 'src/app/store/customizer/CustomizerSlice';
import SidebarItems from 'src/app/layouts/full/vertical/sidebar/SidebarItems';
import { AppState } from 'src/app/store';

const Navigation = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const dispatch = useDispatch();

  if (lgUp) {
    return (
      <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }} py={2}>
        <Container
          sx={{
            maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
          }}
        >
          <NavListing />
        </Container>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={customizer.isMobileSidebar}
      onClose={() => dispatch(toggleMobileSidebar())}
      variant="temporary"
      PaperProps={{
        sx: {
          width: customizer.SidebarWidth,
          border: '0 !important',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <Box px={2}>
        <h2>Setah</h2>
      </Box>
      <SidebarItems />
    </Drawer>
  );
};

export default Navigation;
