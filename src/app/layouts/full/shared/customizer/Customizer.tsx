import { FC, useState } from 'react';
import { Fab, Drawer, Slider, Divider, styled, IconButton, Typography, Tooltip, Stack } from 'src/shared/components/compat';
import { useSelector, useDispatch } from 'src/app/store';
import { Box, BoxProps } from 'src/shared/components/compat';
import { IconX, IconSettings } from '@tabler/icons-react';
import {
  setDarkMode,
  toggleLayout,
  toggleSidebar,
  toggleHorizontal,
  setBorderRadius,
  setCardShadow,
} from 'src/app/store/customizer/CustomizerSlice';
import { AppState } from 'src/app/store';
import Scrollbar from 'src/shared/components/scrollbar/Scrollbar';
import { WbSunnyTwoTone as WbSunnyTwoToneIcon } from 'src/shared/components/compat/icons';
import { DarkModeTwoTone as DarkModeTwoToneIcon } from 'src/shared/components/compat/icons';
import { AspectRatioTwoTone as AspectRatioTwoToneIcon } from 'src/shared/components/compat/icons';
import { CallToActionTwoTone as CallToActionTwoToneIcon } from 'src/shared/components/compat/icons';
import { ViewSidebarTwoTone as ViewSidebarTwoToneIcon } from 'src/shared/components/compat/icons';
import { WebAssetTwoTone as WebAssetTwoToneIcon } from 'src/shared/components/compat/icons';
import { ViewComfyTwoTone, PaddingTwoTone, BorderOuter } from 'src/shared/components/compat/icons';

const SidebarWidth = '320px';
const Customizer: FC = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const customizer = useSelector((state: AppState) => state.customizer);

  const dispatch = useDispatch();

  const StyledBox = styled(Box)<BoxProps>(({ theme }) => ({
    boxShadow: theme.shadows[8],
    padding: '20px',
    cursor: 'pointer',
    justifyContent: 'center',
    display: 'flex',
    transition: '0.1s ease-in',
    border: '1px solid rgba(145, 158, 171, 0.12)',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  }));




  return (
    <div>
      {/* ------------------------------------------- */}
      {/* --Floating Button to open customizer ------ */}
      {/* ------------------------------------------- */}
      <Tooltip title="Settings">
        <Fab
          color="primary"
          aria-label="settings"
          sx={{ position: 'fixed', left: '25px', bottom: '15px' }}
          onClick={() => setShowDrawer(true)}
        >
          <IconSettings stroke={1.5} />
        </Fab>
      </Tooltip>



      <Drawer
        anchor="left"
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        PaperProps={{
          sx: {
            width: SidebarWidth,
          },
        }}
      >
        {/* ------------------------------------------- */}
        {/* ------------ Customizer Sidebar ------------- */}
        {/* ------------------------------------------- */}
        <Scrollbar sx={{ height: 'calc(100vh - 5px)' }}>
          <Box p={2} display="flex" justifyContent={'space-between'} alignItems="center">
            <Typography variant="h4">Ayarlar</Typography>

            <IconButton color="inherit" onClick={() => setShowDrawer(false)}>
              <IconX size="1rem" />
            </IconButton>
          </Box>
          <Divider />
          <Box p={3}>
            {/* ------------------------------------------- */}
            {/* ------------ Dark light theme setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Tema Seçeneği
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox onClick={() => dispatch(setDarkMode('light'))} display="flex" gap={1}>
                <WbSunnyTwoToneIcon
                  color={customizer.activeMode === 'light' ? 'primary' : 'inherit'}
                />
                Işık
              </StyledBox>
              <StyledBox onClick={() => dispatch(setDarkMode('dark'))} display="flex" gap={1}>
                <DarkModeTwoToneIcon
                  color={customizer.activeMode === 'dark' ? 'primary' : 'inherit'}
                />
                Karanlık
              </StyledBox>
            </Stack>

            <Box pt={3} />
            {/* Direction (right-to-left) and colour (the brand orange) are fixed for Trabot; no options here. */}
            {/* ------------------------------------------- */}
            {/* ------------ Layout Horizontal / Vertical ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Düzen Türü
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox onClick={() => dispatch(toggleHorizontal(false))} display="flex" gap={1}>
                <ViewComfyTwoTone
                  color={customizer.isHorizontal === false ? 'primary' : 'inherit'}
                />
                Dikey
              </StyledBox>
              <StyledBox onClick={() => dispatch(toggleHorizontal(true))} display="flex" gap={1}>
                <PaddingTwoTone color={customizer.isHorizontal === true ? 'primary' : 'inherit'} />
                Yatay
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Layout Boxed / Full ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Konteyner Seçeneği
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox onClick={() => dispatch(toggleLayout('boxed'))} display="flex" gap={1}>
                <CallToActionTwoToneIcon
                  color={customizer.isLayout === 'boxed' ? 'primary' : 'inherit'}
                />
                Kutulu
              </StyledBox>
              <StyledBox onClick={() => dispatch(toggleLayout('full'))} display="flex" gap={1}>
                <AspectRatioTwoToneIcon
                  color={customizer.isLayout === 'full' ? 'primary' : 'inherit'}
                />
                Tam dolu
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Sidebar Color setting ------------- */}
            {/* ------------------------------------------- */}

            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            {customizer.isHorizontal ? (
              ''
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Kenar Çubuğu Türü
                </Typography>
                <Stack direction={'row'} gap={2} my={2}>
                  <StyledBox onClick={() => dispatch(toggleSidebar())} display="flex" gap={1}>
                    <WebAssetTwoToneIcon color={!customizer.isCollapse ? 'primary' : 'inherit'} />
                    Tam dolu
                  </StyledBox>
                  <StyledBox onClick={() => dispatch(toggleSidebar())} display="flex" gap={1}>
                    <ViewSidebarTwoToneIcon color={customizer.isCollapse ? 'primary' : 'inherit'} />
                    küçük
                  </StyledBox>
                </Stack>
              </>
            )}
            <Box pt={4} />
            <Typography variant="h6" gutterBottom>
              Kart ile
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox onClick={() => dispatch(setCardShadow(false))} display="flex" gap={1}>
                <BorderOuter color={!customizer.isCardShadow ? 'primary' : 'inherit'} />
                Sınır
              </StyledBox>
              <StyledBox onClick={() => dispatch(setCardShadow(true))} display="flex" gap={1}>
                <CallToActionTwoToneIcon color={customizer.isCardShadow ? 'primary' : 'inherit'} />
                Gölge
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Tema Sınır Yarıçapı
            </Typography>

            <Slider
              size="small"
              value={customizer.borderRadius}
              aria-label="Small"
              min={4}
              max={24}
              onChange={(event: any) => dispatch(setBorderRadius(event.target.value))}
              valueLabelDisplay="auto"
            />
          </Box>
        </Scrollbar>
      </Drawer>
    </div>
  );
};

export default Customizer;
