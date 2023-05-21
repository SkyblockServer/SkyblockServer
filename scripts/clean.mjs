import { rm } from 'fs/promises';
import { join } from 'path';

await rm(join(process.cwd(), 'dist'), {
  force: true,
  recursive: true,
});

console.log('Cleaned Dist Directory!');
