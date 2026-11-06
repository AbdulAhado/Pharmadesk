/**
 * PharmaDesk Device Identification Service
 * Generates and securely persists a stable hardware/device identifier.
 */

const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let cachedDeviceId = null;

function getDeviceFilePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'device_identity.json');
}

/**
 * Generate stable hardware fingerprint based on system CPU, MAC, and platform metadata.
 */
function generateRawFingerprint() {
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model || 'GenericCPU';
  const network = os.networkInterfaces();
  let mac = '';

  for (const name of Object.keys(network)) {
    for (const net of network[name] || []) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        mac = net.mac;
        break;
      }
    }
    if (mac) break;
  }

  const raw = [
    os.platform(),
    os.arch(),
    cpuModel,
    os.hostname(),
    mac || 'DEFAULT-MAC-NODE',
  ].join('|#|');

  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();

  // Format: PHD-XXXX-XXXX-XXXX-XXXX (16 chars from hash)
  const part1 = hash.substring(0, 4);
  const part2 = hash.substring(4, 8);
  const part3 = hash.substring(8, 12);
  const part4 = hash.substring(12, 16);

  return `PHD-${part1}-${part2}-${part3}-${part4}`;
}

/**
 * Get or initialize persistent Device ID.
 */
function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const filePath = getDeviceFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && data.deviceId && data.deviceId.startsWith('PHD-')) {
        cachedDeviceId = data.deviceId;
        return cachedDeviceId;
      }
    }

    // First time generation
    const newId = generateRawFingerprint();
    const payload = {
      deviceId: newId,
      createdAt: new Date().toISOString(),
      platform: os.platform(),
      hostname: os.hostname(),
    };

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

    cachedDeviceId = newId;
    return cachedDeviceId;
  } catch (err) {
    console.warn('[DeviceService] Fallback to ephemeral ID:', err.message);
    cachedDeviceId = generateRawFingerprint();
    return cachedDeviceId;
  }
}

/**
 * Get detailed device diagnostics.
 */
function getDeviceInfo() {
  return {
    deviceId: getDeviceId(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    cpuModel: os.cpus()[0]?.model || 'N/A',
    totalMemoryGB: (os.totalmem() / (1024 ** 3)).toFixed(1),
  };
}

module.exports = {
  getDeviceId,
  getDeviceInfo,
};

