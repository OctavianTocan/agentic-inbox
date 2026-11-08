'use client';

import { useEffect } from 'react';

/** Loads React Grab only for local development sessions. */
export function ReactGrabSetup(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    let isMounted = true;
    void import('react-grab').catch((error: unknown) => {
      if (isMounted) {
        console.warn('React Grab failed to load', error);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
