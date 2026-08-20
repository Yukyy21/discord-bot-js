const path = require('node:path');
const fs = require('node:fs');

const ITEMS_DIR = path.join(__dirname, '..', 'assets', 'items');
const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function getItemImagePath(itemId) {
  for (const ext of EXTENSIONS) {
    const filePath = path.join(ITEMS_DIR, `${itemId}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function getItemImageAttachment(itemId) {
  const filePath = getItemImagePath(itemId);
  if (!filePath) return null;
  const ext = path.extname(filePath).slice(1);
  const attachmentName = `item_${itemId}.${ext}`;
  return { filePath, attachmentName, attachmentProtocol: `attachment://${attachmentName}` };
}

module.exports = { getItemImagePath, getItemImageAttachment };
