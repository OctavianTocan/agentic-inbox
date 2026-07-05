import { cookies } from 'next/headers';

import { AuditPage } from '@/components/audit/audit-page';
import {
  parseWidthCookie,
  SIDEBAR_WIDTH_COOKIE_NAME
} from '@/design-system/components/ui/sidebar-width';

export default async function AgentAuditPage() {
  const cookieStore = await cookies();
  const persistedWidth = parseWidthCookie(
    cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value,
    264,
    220,
    360
  );

  return <AuditPage persistedWidth={persistedWidth} />;
}
