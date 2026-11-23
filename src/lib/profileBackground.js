const palette = Object.freeze({
  'sample-carbon': '#202024',
  'sample-graphite': '#343438',
  'sample-plum': '#352442',
  'sample-violet': '#493260',
});

const { loadImage } = require('@napi-rs/canvas');

const MAX_OUTPUT_BYTES = 2305536;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const thresholds = Object.freeze({ 1: 20, 2: 45, 3: 65 });

function imageIdentity(value, level) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.id === 'string' && UUID.test(value.id) && value.kind === 'image'
    && Number.isSafeInteger(value.revision) && value.revision > 0
    && Number.isInteger(value.slot) && Object.hasOwn(thresholds, value.slot)
    && Number.isSafeInteger(level) && level >= thresholds[value.slot];
}

function imageMetadata(value, level) {
  if (!imageIdentity(value, level) || value.mime !== 'image/png' || value.width !== 1000 || value.height !== 560) return null;
  if (Object.keys(value).some(key => !['id', 'kind', 'revision', 'mime', 'width', 'height', 'slot'].includes(key))) return null;
  return { id: value.id, kind: 'image', revision: value.revision, slot: value.slot };
}

function validPng(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 33 && buffer.length <= MAX_OUTPUT_BYTES
    && buffer.subarray(0, 8).equals(PNG_SIGNATURE) && buffer.readUInt32BE(8) === 13
    && buffer.toString('ascii', 12, 16) === 'IHDR'
    && buffer.readUInt32BE(16) === 1000 && buffer.readUInt32BE(20) === 560;
}

async function decodeBackgroundImage(buffer) {
  if (!validPng(buffer)) return null;
  try {
    const image = await loadImage(buffer);
    return image.width === 1000 && image.height === 560 ? image : null;
  } catch { return null; }
}

function allowedBackground(value, level) {
  if (imageIdentity(value, level)) {
    if (Object.keys(value).some(key => !['id', 'kind', 'revision', 'slot', 'buffer'].includes(key)) || !validPng(value.buffer)) return null;
    return { id: value.id, kind: 'image', revision: value.revision, slot: value.slot, buffer: value.buffer };
  }
  if (value?.kind === 'image') return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!Object.hasOwn(palette, value.id) || value.color !== palette[value.id]) return null;
  if (Object.keys(value).some(key => !['id', 'color'].includes(key))) return null;
  return { id: value.id, color: palette[value.id] };
}

module.exports = { allowedBackground, imageMetadata, decodeBackgroundImage, MAX_OUTPUT_BYTES };

