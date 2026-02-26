const fs = require('fs');
const path = require('path');
const https = require('https');

const icons = [
  'cloud_upload',
  'folder_zip',
  'package_2',
  'video_file',
  'image',
  'insert_drive_file',
  'wifi_off',
  'pause',
  'close',
  'refresh',
  'delete',
  'content_copy',
  'arrow_forward',
  'share_reviews',
  'swap_horiz',
  'history',
  'devices',
  'add_link',
  'settings',
  'light_mode',
  'dark_mode'
];

const targetDir = path.join(__dirname, 'apps', 'client', 'src', 'assets', 'images', 'svgs');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function download(icon) {
  return new Promise((resolve) => {
    const url = `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${icon}/default/24px.svg`;
    const dest = path.join(targetDir, `${icon}.svg`);

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          fs.writeFileSync(dest, data);
          console.log(`Downloaded ${icon}.svg`);
        } else {
          console.error(`Failed to download ${icon}, Status: ${res.statusCode}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Error downloading ${icon}: ${err.message}`);
      resolve();
    });
  });
}

async function main() {
  console.log('Starting download of', icons.length, 'icons...');
  for (const icon of icons) {
    await download(icon);
  }
  console.log('Done downloading icons.');
}

main();
