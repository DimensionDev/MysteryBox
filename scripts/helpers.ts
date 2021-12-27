export function buf2hex(b: Buffer) {
  return '0x' + b.toString('hex')
}

export function hex2buf(h: string) {
  return Buffer.from(h.replace(/^0x/i, ''), 'hex')
}
