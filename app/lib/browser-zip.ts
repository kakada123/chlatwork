export type ZipEntryInput = {
  name: string;
  blob: Blob;
  modifiedAt?: Date;
};

const textEncoder = new TextEncoder();
const crcTable = createCrcTable();

export async function createStoredZip(entries: ZipEntryInput[]) {
  const preparedEntries = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      nameBytes: textEncoder.encode(entry.name),
      data: new Uint8Array(await entry.blob.arrayBuffer()),
      modifiedAt: entry.modifiedAt ?? new Date(),
    })),
  );

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of preparedEntries) {
    const crc = crc32(entry.data);
    const { dosDate, dosTime } = toDosDateTime(entry.modifiedAt);
    const localHeader = createLocalHeader({
      nameBytes: entry.nameBytes,
      dataSize: entry.data.byteLength,
      crc,
      dosDate,
      dosTime,
    });
    const centralHeader = createCentralHeader({
      nameBytes: entry.nameBytes,
      dataSize: entry.data.byteLength,
      crc,
      dosDate,
      dosTime,
      localHeaderOffset: offset,
    });

    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + entry.data.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralParts.reduce(
    (total, part) => total + part.byteLength,
    0,
  );
  const endRecord = createEndRecord({
    entryCount: preparedEntries.length,
    centralDirectorySize,
    centralDirectoryOffset,
  });

  return new Blob([...localParts, ...centralParts, endRecord], {
    type: "application/zip",
  });
}

function createLocalHeader(input: ZipHeaderInput) {
  const header = new Uint8Array(30 + input.nameBytes.byteLength);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, input.dosTime, true);
  view.setUint16(12, input.dosDate, true);
  view.setUint32(14, input.crc, true);
  view.setUint32(18, input.dataSize, true);
  view.setUint32(22, input.dataSize, true);
  view.setUint16(26, input.nameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  header.set(input.nameBytes, 30);

  return header;
}

function createCentralHeader(input: ZipHeaderInput & { localHeaderOffset: number }) {
  const header = new Uint8Array(46 + input.nameBytes.byteLength);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, input.dosTime, true);
  view.setUint16(14, input.dosDate, true);
  view.setUint32(16, input.crc, true);
  view.setUint32(20, input.dataSize, true);
  view.setUint32(24, input.dataSize, true);
  view.setUint16(28, input.nameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, input.localHeaderOffset, true);
  header.set(input.nameBytes, 46);

  return header;
}

function createEndRecord(input: {
  entryCount: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, input.entryCount, true);
  view.setUint16(10, input.entryCount, true);
  view.setUint32(12, input.centralDirectorySize, true);
  view.setUint32(16, input.centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

function toDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);

  for (let i = 0; i < table.length; i += 1) {
    let crc = i;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[i] = crc >>> 0;
  }

  return table;
}

type ZipHeaderInput = {
  nameBytes: Uint8Array;
  dataSize: number;
  crc: number;
  dosDate: number;
  dosTime: number;
};
