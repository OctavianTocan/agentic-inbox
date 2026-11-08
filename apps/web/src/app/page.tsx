import { cookies } from 'next/headers';

import { InboxShell } from '@/components/inbox/inbox-shell';
import {
  parseWidthCookie,
  SIDEBAR_WIDTH_COOKIE_NAME
} from '@/design-system/components/ui/sidebar-width';

export default async function InboxPage() {
  const cookieStore = await cookies();
  const persistedWidth = parseWidthCookie(
    cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value,
    264,
    220,
    360
  );

  return <InboxShell persistedWidth={persistedWidth} />;
}
