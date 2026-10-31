const sharp = require('sharp');
const path = require('path');

const input = path.join(
  __dirname,
  'public/icons/freight-plus-master.png'
);


const output = path.join(__dirname, 'public/icons');

async function generateIcons() {
  const sizes = [16, 32, 180, 192, 512];

  for (const size of sizes) {
    await sharp(input)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(path.join(output, `freight-plus-${size}.png`));

    console.log(`Created ${size}x${size} icon`);
  }
}

generateIcons().catch(console.error);