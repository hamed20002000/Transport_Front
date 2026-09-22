import _ from 'lodash';
import { createTheme } from 'src/shared/components/compat';
import { useSelector } from 'src/app/store';
import { useEffect } from 'react';
import { AppState } from 'src/app/store';
import components from 'src/app/theme/Components';
import typography from 'src/app/theme/Typography';
import { shadows, darkshadows } from 'src/app/theme/Shadows';
import { DarkThemeColors } from 'src/app/theme/DarkThemeColors';
import { LightThemeColors } from 'src/app/theme/LightThemeColors';
import { baseDarkTheme, baselightTheme } from 'src/app/theme/DefaultColors';


export const BuildTheme = (config: any = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const customizer = useSelector((state: AppState) => state.customizer);
  const defaultTheme = customizer.activeMode === 'dark' ? baseDarkTheme : baselightTheme;
  const defaultShadow = customizer.activeMode === 'dark' ? darkshadows : shadows;
  const themeSelect = customizer.activeMode === 'dark' ? darkthemeOptions : themeOptions;
  const baseMode = {
    cardShadow: customizer.isCardShadow,
    palette: {
      mode: customizer.activeMode,
    },
    shape: {
      borderRadius: customizer.borderRadius,
    },
    shadows: defaultShadow,
    typography: typography,
  };
  const theme = createTheme(
    _.merge({}, baseMode, defaultTheme, themeSelect, {
      direction: config.direction,
    }),
  );
  theme.components = components(theme);

  return theme;
};

const ThemeSettings = () => {
  const activDir = useSelector((state: AppState) => state.customizer.activeDir);
  const activeTheme = useSelector((state: AppState) => state.customizer.activeTheme);
  const theme = BuildTheme({
    direction: activDir,
    theme: activeTheme,
  });
  useEffect(() => {
    document.dir = activDir;
  }, [activDir]);

  return theme;
};

export { ThemeSettings };
