import sharp from 'sharp';
import fs from 'fs';

const images = [
  'assets/img/species/chimaera.jpg',
  'assets/img/species/colombiana.jpg',
  'assets/img/species/fragrans.jpg',
  'assets/img/species/makinoi.jpg',
  'assets/img/species/oblanceolata.jpg',
  'assets/img/species/ramentacea.jpg'
];

async function resizeImage(filePath) {
  console.log(`Processing: ${filePath}`);
  
  const originalSize = fs.statSync(filePath).size;
  console.log(`  Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    await sharp(filePath)
      .resize(2000, 2000, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer(async (err, data) => {
        if (err) {
          console.error(`  Error: ${err.message}`);
          return;
        }
        
        const newSize = data.length;
        console.log(`  New size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Reduction: ${((1 - newSize / originalSize) * 100).toFixed(1)}%`);
        
        await sharp(data).toFile(filePath);
        console.log(`  Saved: ${filePath}`);
      });
  } catch (err) {
    console.error(`  Error processing ${filePath}: ${err.message}`);
  }
}

async function main() {
  for (const file of images) {
    await resizeImage(file);
  }
  console.log('\nDone!');
}

main().catch(console.error);