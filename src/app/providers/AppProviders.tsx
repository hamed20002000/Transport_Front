import { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor, useSelector } from 'src/app/store';
import { ThemeSettings } from 'src/app/theme/Theme';
import RTL from 'src/app/layouts/full/shared/customizer/RTL';
import { AuthProvider } from 'src/core/auth/AuthContext';
import NotifyBootstrap from 'src/core/socket/NotifyBootstrap';
import { ThemeProvider } from 'src/shared/components/compat';
import { TooltipProvider } from 'src/shared/components/tooltip/TooltipContext';

function WorkspaceProviders({ children }: { children: ReactNode }) {
  const theme = ThemeSettings();
  const direction = useSelector((state) => state.customizer.activeDir);
  return (
    <AuthProvider>
      <NotifyBootstrap />
      <TooltipProvider>
        <ThemeProvider theme={theme}>
          <RTL direction={direction}>{children}</RTL>
        </ThemeProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WorkspaceProviders>{children}</WorkspaceProviders>
      </PersistGate>
    </Provider>
  );
}
