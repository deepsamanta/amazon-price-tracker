
// Custom build script for Vercel deployment
import { execSync } from 'child_process';

// Run the standard Vite build for the client
console.log('Building client with Vite...');
execSync('vite build', { stdio: 'inherit' });

// Build the API functions
console.log('Building API routes with esbuild...');
execSync('npx esbuild server/index.ts api/vercel.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/api', { 
  stdio: 'inherit' 
});

// Copy data.json to the dist folder
console.log('Copying data.json to dist folder...');
execSync('cp data.json dist/', { stdio: 'inherit' });

console.log('Build completed successfully!');
