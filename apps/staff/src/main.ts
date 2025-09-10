import '@qrorderpos/ui';
import { apiClient } from '@qrorderpos/api-client';

async function load() {
  const tables = await apiClient.getMenu(); // placeholder call
  document.getElementById('tables')!.textContent = `Menu items: ${tables.length}`;
}
load();
