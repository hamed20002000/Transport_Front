import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from 'src/app/App';
import { AppProviders } from 'src/app/providers/AppProviders';
import Spinner from 'src/shared/components/spinner/Spinner';
import 'src/shared/utils/i18n';
// Renews the sign-in (refresh token) for every request from the first one.
import 'src/core/auth/session';
import 'src/app/mocks';
import 'src/app/styles/admin.css';

document.body.classList.add('admin-shell');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AppProviders>
      <Suspense fallback={<Spinner />}>
        <App />
      </Suspense>
    </AppProviders>
  </BrowserRouter>,
);
