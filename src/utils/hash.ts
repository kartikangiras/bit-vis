import * as crypto from 'crypto';

export function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(
    crypto.createHash('sha256').update(data).digest()
  );
}

export function hash256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

export function hash160(data: Uint8Array): Uint8Array {
  const sha = sha256(data);
  return new Uint8Array(
    crypto.createHash('ripemd160').update(sha).digest()
  );
}
