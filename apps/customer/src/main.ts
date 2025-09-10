import '@qrorderpos/ui';
import { apiClient } from '@qrorderpos/api-client';

document.getElementById('call')?.addEventListener('click', async () => {
  try {
    await apiClient.callWaiter('demo-session', 'help');
    alert('Waiter notified');
  } catch (e) {
    alert('Failed: ' + (e as Error).message);
  }
});
