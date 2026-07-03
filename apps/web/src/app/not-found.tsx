import Link from 'next/link';
import { ArrowLeftIcon } from '@/design-system/components/icons';
import { Button } from '@/design-system/components/ui/button';
import {
  ErrorPage,
  ErrorPageActions,
  ErrorPageCode,
  ErrorPageDescription,
  ErrorPageTitle
} from '@/design-system/components/ui/error-page';

export default function NotFound() {
  return (
    <ErrorPage>
      <ErrorPageCode>404</ErrorPageCode>
      <ErrorPageTitle>This page isn&rsquo;t here</ErrorPageTitle>
      <ErrorPageDescription>
        The page you were looking for doesn&rsquo;t exist or has moved. Head
        back to the inbox to keep going.
      </ErrorPageDescription>
      <ErrorPageActions>
        <Button render={<Link href="/" />} variant="default">
          <ArrowLeftIcon />
          Back to inbox
        </Button>
      </ErrorPageActions>
    </ErrorPage>
  );
}
