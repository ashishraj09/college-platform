
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import '../index.css';
import '../App.css';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/react';


import DashboardLayout from '../layouts/DashboardLayout';
import { AuthProvider } from '../contexts/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
  const getLayout = (Component as any).getLayout || ((page: React.ReactNode) => (
    <DashboardLayout>{page}</DashboardLayout>
  ));
  return (
    <Provider store={store}>
      <AuthProvider>
        {getLayout(<Component {...pageProps} />)}
        <Analytics />
      </AuthProvider>
    </Provider>
  );
}

export default MyApp;
