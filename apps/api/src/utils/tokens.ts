import crypto from 'crypto';

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateApiKey() {
  return `dch_live_${crypto.randomBytes(24).toString('base64url')}`;
}
