import { api } from '@/lib/api';
import { clearOnboarding, loadOnboarding } from '@/lib/onboarding';

export async function syncLocalOnboardingToServer(
  source: 'SELF' | 'INVITE' | 'SKIPPED' = 'SELF',
) {
  const local = loadOnboarding();
  await api('/api/onboarding/complete', {
    body: {
      selectedCodes: local.selectedCodes ?? [],
      source,
      note: local.surveyNote || undefined,
    },
  });
  clearOnboarding();
}
