
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import '../index.css';
import '../App.css';
import '../styles/globals.css';


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
      </AuthProvider>
    </Provider>
  );
}

export default MyApp;
