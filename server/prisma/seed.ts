import { dataStore } from '../src/data/store';

export async function seed() {
  dataStore.reset();
  console.log('Seeded JSON datastore');
}

if (process.argv[1]?.includes('seed')) {
  seed().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
