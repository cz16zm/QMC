const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Building QuantMethods Companion (QMC)...');

// 1. Run TypeScript Compiler
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful.');
} catch (error) {
  console.error('❌ TypeScript compilation failed.');
  process.exit(1);
}

// 2. Ensure build directory exists
const targetDir = path.join(__dirname, 'qmc');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 3. Copy index.html and CSS to build output
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(targetDir, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'qmc.css'), path.join(targetDir, 'qmc.css'));

// 4. Copy data folder (manifest, course introductions, & pristine JSONs) to build output
const sourceData = path.join(__dirname, 'data');
const targetData = path.join(targetDir, 'data');
if (fs.existsSync(sourceData)) {
  fs.cpSync(sourceData, targetData, { recursive: true });
}

console.log('🚀 QMC build completed successfully in /qmc/');
