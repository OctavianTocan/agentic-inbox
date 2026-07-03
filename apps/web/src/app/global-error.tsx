'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  unstable_retry
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#faf9f7',
          color: '#1c1a17',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#8a847b'
          }}
        >
          Something interrupted the app
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '-0.01em'
          }}
        >
          The app couldn&rsquo;t recover
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '28rem',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            color: '#6b665e'
          }}
        >
          Nothing was sent or changed on your behalf. Try reloading; if it keeps
          happening, refresh the page in a moment.
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            appearance: 'none',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: '#1c1a17',
            color: '#faf9f7'
          }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
