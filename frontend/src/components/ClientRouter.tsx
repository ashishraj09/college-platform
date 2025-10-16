'use client';

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

export function ClientRouter({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server-side
  if (!mounted) {
    return null;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}
