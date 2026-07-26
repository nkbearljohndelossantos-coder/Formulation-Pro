import { ensurePerfumeAdminAccounts } from '../services/seedPerfumeAdminService.js';

async function run() {
  console.log('Running Perfume Admin accounts setup...');
  await ensurePerfumeAdminAccounts();
  process.exit(0);
}

run();
