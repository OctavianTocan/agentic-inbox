'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowLeftIcon, RefreshCwIcon } from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import {
  ErrorPage,
  ErrorPageActions,
  ErrorPageCode,
  ErrorPageDescription,
  ErrorPageTitle
} from '@/design-system/components/ui/error-page';

export default function InboxError({
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
    <ErrorPage>
      <ErrorPageCode>Something interrupted the inbox</ErrorPageCode>
      <ErrorPageTitle>This view didn&rsquo;t load</ErrorPageTitle>
      <ErrorPageDescription>
        Nothing was sent or changed on your behalf. You can try loading this
        view again, or head back to the inbox and pick up where you left off.
      </ErrorPageDescription>
      <ErrorPageActions>
        <Button onClick={() => unstable_retry()} variant="default">
          <RefreshCwIcon />
          Try again
        </Button>
        <Button render={<Link href="/" />} variant="outline">
          <ArrowLeftIcon />
          Back to inbox
        </Button>
      </ErrorPageActions>
    </ErrorPage>
  );
}
