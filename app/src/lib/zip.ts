export interface ZipEntry {
  filename: string;
  bytes: Uint8Array;
}

const textEncoder = new TextEncoder();
const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < table.length; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number) {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  );
}

function writeBytes(output: number[], bytes: Uint8Array) {
  for (const byte of bytes) {
    output.push(byte);
  }
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

export function createZip(entries: ZipEntry[]) {
  const output: number[] = [];
  const centralDirectory: number[] = [];
  const now = dosDateTime(new Date());

  for (const entry of entries) {
    const filenameBytes = textEncoder.encode(entry.filename);
    const checksum = crc32(entry.bytes);
    const offset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0x0800);
    writeUint16(output, 0);
    writeUint16(output, now.dosTime);
    writeUint16(output, now.dosDate);
    writeUint32(output, checksum);
    writeUint32(output, entry.bytes.length);
    writeUint32(output, entry.bytes.length);
    writeUint16(output, filenameBytes.length);
    writeUint16(output, 0);
    writeBytes(output, filenameBytes);
    writeBytes(output, entry.bytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0x0800);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, now.dosTime);
    writeUint16(centralDirectory, now.dosDate);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, entry.bytes.length);
    writeUint32(centralDirectory, entry.bytes.length);
    writeUint16(centralDirectory, filenameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, offset);
    writeBytes(centralDirectory, filenameBytes);
  }

  const centralDirectoryOffset = output.length;
  writeBytes(output, new Uint8Array(centralDirectory));

  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, entries.length);
  writeUint16(output, entries.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}
