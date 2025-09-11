const fs = require('fs');
const path = require('path');

// Create dist/ocr directory if it doesn't exist
const distOcrDir = path.join(__dirname, '..', 'dist', 'ocr');
if (!fs.existsSync(distOcrDir)) {
  fs.mkdirSync(distOcrDir, { recursive: true });
}

// Copy JSON files from src/ocr to dist/ocr
const srcOcrDir = path.join(__dirname, '..', 'src', 'ocr');
const jsonFiles = fs.readdirSync(srcOcrDir).filter(file => file.endsWith('.json'));

jsonFiles.forEach(file => {
  const srcPath = path.join(srcOcrDir, file);
  const destPath = path.join(distOcrDir, file);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${file} to dist/ocr/`);
});

console.log('Asset copying completed successfully!');
