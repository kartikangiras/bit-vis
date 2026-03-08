export function readXorKey(filePath: string): Uint8Array {
  const fs = require('fs');
  return new Uint8Array(fs.readFileSync(filePath));
}

export function xorDecode(data: Uint8Array, key: Uint8Array): Uint8Array {
  if (key.length === 0 || (key.length === 1 && key[0] === 0)) {
    return data;
  }
  
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}
