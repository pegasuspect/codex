import { Socket, createConnection } from "node:net";

type HeaderValue =
  | { signature: "o" | "s" | "g"; value: string }
  | { signature: "u"; value: number };

type Message = {
  type: number;
  serial: number;
  sender?: string;
  path?: string;
  interface?: string;
  member?: string;
  errorName?: string;
  signature?: string;
  replySerial?: number;
  body: Buffer;
};

const messageType = {
  methodCall: 1,
  methodReturn: 2,
  error: 3,
  signal: 4,
} as const;

const headerField = {
  path: 1,
  interface: 2,
  member: 3,
  errorName: 4,
  replySerial: 5,
  destination: 6,
  sender: 7,
  signature: 8,
} as const;

class Writer {
  chunks: Buffer[] = [];
  length = 0;

  pad(alignment: number) {
    const padding = (alignment - (this.length % alignment)) % alignment;
    if (padding) this.write(Buffer.alloc(padding));
  }

  write(buffer: Buffer) {
    this.chunks.push(buffer);
    this.length += buffer.length;
  }

  byte(value: number) {
    const buffer = Buffer.alloc(1);
    buffer.writeUInt8(value);
    this.write(buffer);
  }

  uint32(value: number) {
    this.pad(4);
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value);
    this.write(buffer);
  }

  int32(value: number) {
    this.pad(4);
    const buffer = Buffer.alloc(4);
    buffer.writeInt32LE(value);
    this.write(buffer);
  }

  string(value: string) {
    this.pad(4);
    const bytes = Buffer.from(value, "utf8");
    this.uint32(bytes.length);
    this.write(bytes);
    this.byte(0);
  }

  signature(value: string) {
    const bytes = Buffer.from(value, "ascii");
    this.byte(bytes.length);
    this.write(bytes);
    this.byte(0);
  }

  variant(value: HeaderValue) {
    this.signature(value.signature);
    writeValue(this, value.signature, value.value);
  }

  buffer() {
    return Buffer.concat(this.chunks, this.length);
  }
}

class Reader {
  offset = 0;

  constructor(readonly buffer: Buffer) {}

  pad(alignment: number) {
    this.offset += (alignment - (this.offset % alignment)) % alignment;
  }

  byte() {
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  uint32() {
    this.pad(4);
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  int32() {
    this.pad(4);
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  string() {
    this.pad(4);
    const length = this.uint32();
    const value = this.buffer.toString("utf8", this.offset, this.offset + length);
    this.offset += length + 1;
    return value;
  }

  signature() {
    const length = this.byte();
    const value = this.buffer.toString("ascii", this.offset, this.offset + length);
    this.offset += length + 1;
    return value;
  }
}

const writeValue = (writer: Writer, signature: string, value: unknown) => {
  if (signature === "s" || signature === "o") writer.string(String(value));
  else if (signature === "g") writer.signature(String(value));
  else if (signature === "u") writer.uint32(Number(value));
  else if (signature === "i") writer.int32(Number(value));
  else if (signature === "b") writer.uint32(value ? 1 : 0);
  else if (signature === "v") {
    const [innerSignature, innerValue] = value as [string, unknown];
    writer.signature(innerSignature);
    writeValue(writer, innerSignature, innerValue);
  }
  else if (signature === "as") {
    const array = value as string[];
    const body = new Writer();
    for (const item of array) body.string(item);
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.pad(4);
    writer.write(buffer);
  } else if (signature === "ai") {
    const array = value as number[];
    const body = new Writer();
    for (const item of array) body.int32(item);
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.pad(4);
    writer.write(buffer);
  } else if (signature === "ay") {
    const bytes = Buffer.from(value as Uint8Array);
    writer.pad(4);
    writer.uint32(bytes.length);
    writer.write(bytes);
  } else if (signature === "a(iiay)") {
    const pixmaps = value as [number, number, Uint8Array][];
    const body = new Writer();
    for (const [width, height, bytes] of pixmaps) {
      body.pad(8);
      body.int32(width);
      body.int32(height);
      writeValue(body, "ay", bytes);
    }
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.pad(8);
    writer.write(buffer);
  } else if (signature === "a{sv}") {
    const entries = value as Record<string, [string, unknown]>;
    const body = new Writer();
    for (const [key, variant] of Object.entries(entries)) {
      body.pad(8);
      body.string(key);
      writeValue(body, "v", variant);
    }
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.pad(8);
    writer.write(buffer);
  } else if (signature === "av") {
    const variants = value as [string, unknown][];
    const body = new Writer();
    for (const variant of variants) writeValue(body, "v", variant);
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.write(buffer);
  } else if (signature === "(ia{sv}av)") {
    const [id, properties, children] = value as [number, Record<string, [string, unknown]>, [string, unknown][]];
    writer.pad(8);
    writer.int32(id);
    writeValue(writer, "a{sv}", properties);
    writeValue(writer, "av", children);
  } else if (signature === "a(ia{sv})") {
    const entries = value as [number, Record<string, [string, unknown]>][];
    const body = new Writer();
    for (const [id, properties] of entries) {
      body.pad(8);
      body.int32(id);
      writeValue(body, "a{sv}", properties);
    }
    const buffer = body.buffer();
    writer.pad(4);
    writer.uint32(buffer.length);
    writer.pad(8);
    writer.write(buffer);
  } else if (signature === "(sa(iiay)ss)") {
    const [icon, pixmaps, title, text] = value as [string, unknown[], string, string];
    writer.pad(8);
    writer.string(icon);
    writeValue(writer, "a(iiay)", pixmaps);
    writer.string(title);
    writer.string(text);
  } else {
    throw new Error(`unsupported D-Bus signature: ${signature}`);
  }
};

const readValue = (reader: Reader, signature: string): unknown => {
  if (signature === "s" || signature === "o") return reader.string();
  if (signature === "g") return reader.signature();
  if (signature === "u") return reader.uint32();
  if (signature === "i") return reader.int32();
  if (signature === "b") return reader.uint32() !== 0;
  if (signature === "v") {
    const innerSignature = reader.signature();
    return [innerSignature, readValue(reader, innerSignature)];
  }
  if (signature === "as") {
    reader.pad(4);
    const length = reader.uint32();
    reader.pad(4);
    const end = reader.offset + length;
    const values: string[] = [];
    while (reader.offset < end) values.push(reader.string());
    return values;
  }
  if (signature === "ai") {
    reader.pad(4);
    const length = reader.uint32();
    reader.pad(4);
    const end = reader.offset + length;
    const values: number[] = [];
    while (reader.offset < end) values.push(reader.int32());
    return values;
  }
  throw new Error(`unsupported D-Bus read signature: ${signature}`);
};

const writeStruct = (writer: Writer, code: number, value: HeaderValue) => {
  writer.pad(8);
  writer.byte(code);
  writer.variant(value);
};

const headerValue = (signature: HeaderValue["signature"], value: string | number): HeaderValue =>
  signature === "u" ? { signature, value: Number(value) } : { signature, value: String(value) };

const createMessage = (
  type: number,
  serial: number,
  fields: Record<number, HeaderValue | undefined>,
  bodySignature = "",
  bodyValues: unknown[] = [],
) => {
  const body = new Writer();
  const bodyTypes = splitSignature(bodySignature);
  for (let index = 0; index < bodyTypes.length; index += 1) {
    writeValue(body, bodyTypes[index], bodyValues[index]);
  }

  const fieldBody = new Writer();
  for (const [rawCode, value] of Object.entries(fields)) {
    if (value) writeStruct(fieldBody, Number(rawCode), value);
  }
  const fieldBuffer = fieldBody.buffer();

  const header = Buffer.alloc(16);
  header.writeUInt8("l".charCodeAt(0), 0);
  header.writeUInt8(type, 1);
  header.writeUInt8(0, 2);
  header.writeUInt8(1, 3);
  header.writeUInt32LE(body.length, 4);
  header.writeUInt32LE(serial, 8);
  header.writeUInt32LE(fieldBuffer.length, 12);

  const message = Buffer.concat([header, fieldBuffer, Buffer.alloc((8 - ((16 + fieldBuffer.length) % 8)) % 8), body.buffer()]);
  return message;
};

const splitSignature = (signature: string) => {
  const parts: string[] = [];
  for (let index = 0; index < signature.length; index += 1) {
    const char = signature[index];
    if (char === "a" && signature[index + 1] === "{") {
      const end = signature.indexOf("}", index);
      parts.push(signature.slice(index, end + 1));
      index = end;
    } else if (char === "a" && signature[index + 1] === "(") {
      const end = signature.indexOf(")", index);
      parts.push(signature.slice(index, end + 1));
      index = end;
    } else if (char === "a") {
      parts.push(signature.slice(index, index + 2));
      index += 1;
    } else if (char === "(") {
      const end = signature.indexOf(")", index);
      parts.push(signature.slice(index, end + 1));
      index = end;
    } else {
      parts.push(char);
    }
  }
  return parts.filter(Boolean);
};

const parseMessage = (buffer: Buffer): Message => {
  const bodyLength = buffer.readUInt32LE(4);
  const serial = buffer.readUInt32LE(8);
  const headerLength = buffer.readUInt32LE(12);
  const headerEnd = 16 + headerLength;
  const bodyStart = headerEnd + ((8 - (headerEnd % 8)) % 8);
  const reader = new Reader(buffer.subarray(16, headerEnd));
  const fields: Message = { type: buffer.readUInt8(1), serial, body: buffer.subarray(bodyStart, bodyStart + bodyLength) };

  while (reader.offset < reader.buffer.length) {
    reader.pad(8);
    const code = reader.byte();
    const signature = reader.signature();
    const value = readValue(reader, signature);
    if (code === headerField.path) fields.path = String(value);
    else if (code === headerField.interface) fields.interface = String(value);
    else if (code === headerField.member) fields.member = String(value);
    else if (code === headerField.errorName) fields.errorName = String(value);
    else if (code === headerField.replySerial) fields.replySerial = Number(value);
    else if (code === headerField.sender) fields.sender = String(value);
    else if (code === headerField.signature) fields.signature = String(value);
  }

  return fields;
};

const busPath = () => {
  const address = process.env.DBUS_SESSION_BUS_ADDRESS ?? "";
  const match = /(?:^|;)unix:path=([^,;]+)/.exec(address);
  if (!match) throw new Error("DBUS_SESSION_BUS_ADDRESS does not contain a unix:path session bus");
  return decodeURIComponent(match[1]);
};

const uidHex = () => String(process.getuid?.() ?? 0).split("").map((char) => char.charCodeAt(0).toString(16)).join("");

export class SessionBus {
  private socket: Socket;
  private serial = 1;
  private pending = new Map<number, { resolve: (message: Message) => void; reject: (error: Error) => void }>();
  private buffer = Buffer.alloc(0);
  uniqueName = "";
  onMethodCall?: (message: Message) => void;

  private constructor(socket: Socket) {
    this.socket = socket;
    socket.on("data", (chunk) => this.receive(chunk));
  }

  static async connect() {
    const socket = createConnection(busPath());
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });

    await authenticate(socket);
    const bus = new SessionBus(socket);
    const hello = await bus.call("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus", "Hello");
    bus.uniqueName = readValue(new Reader(hello.body), "s") as string;
    return bus;
  }

  disconnect() {
    this.socket.end();
  }

  private nextSerial() {
    const serial = this.serial;
    this.serial += 1;
    return serial;
  }

  async call(destination: string, path: string, iface: string, member: string, signature = "", values: unknown[] = []) {
    const serial = this.nextSerial();
    const message = createMessage(
      messageType.methodCall,
      serial,
      {
        [headerField.path]: headerValue("o", path),
        [headerField.interface]: headerValue("s", iface),
        [headerField.member]: headerValue("s", member),
        [headerField.destination]: headerValue("s", destination),
        [headerField.signature]: signature ? headerValue("g", signature) : undefined,
      },
      signature,
      values,
    );

    const reply = new Promise<Message>((resolve, reject) => this.pending.set(serial, { resolve, reject }));
    this.socket.write(message);
    return reply;
  }

  methodReturn(call: Message, signature = "", values: unknown[] = []) {
    this.socket.write(createMessage(
      messageType.methodReturn,
      this.nextSerial(),
      {
        [headerField.destination]: call.sender ? headerValue("s", call.sender) : undefined,
        [headerField.replySerial]: headerValue("u", call.serial),
        [headerField.signature]: signature ? headerValue("g", signature) : undefined,
      },
      signature,
      values,
    ));
  }

  signal(path: string, iface: string, member: string, signature = "", values: unknown[] = []) {
    this.socket.write(createMessage(
      messageType.signal,
      this.nextSerial(),
      {
        [headerField.path]: headerValue("o", path),
        [headerField.interface]: headerValue("s", iface),
        [headerField.member]: headerValue("s", member),
        [headerField.signature]: signature ? headerValue("g", signature) : undefined,
      },
      signature,
      values,
    ));
  }

  private receive(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 16) {
      const bodyLength = this.buffer.readUInt32LE(4);
      const headerLength = this.buffer.readUInt32LE(12);
      const headerEnd = 16 + headerLength;
      const total = headerEnd + ((8 - (headerEnd % 8)) % 8) + bodyLength;
      if (this.buffer.length < total) return;

      const message = parseMessage(this.buffer.subarray(0, total));
      this.buffer = this.buffer.subarray(total);

      if (message.type === messageType.methodReturn || message.type === messageType.error) {
        const pending = message.replySerial ? this.pending.get(message.replySerial) : undefined;
        if (message.replySerial) this.pending.delete(message.replySerial);
        if (pending && message.type === messageType.error) {
          pending.reject(new Error(message.errorName ?? "D-Bus method call failed"));
        } else if (pending) {
          pending.resolve(message);
        }
      } else if (message.type === messageType.methodCall) {
        this.onMethodCall?.(message);
      }
    }
  }
}

export const readBodyValue = (message: Message, signature: string) =>
  readValue(new Reader(message.body), signature);

export const readBodyValues = (message: Message, signatures: string[]) => {
  const reader = new Reader(message.body);
  return signatures.map((signature) => readValue(reader, signature));
};

const authenticate = (socket: Socket) =>
  new Promise<void>((resolve, reject) => {
    let text = "";
    const onData = (chunk: Buffer) => {
      text += chunk.toString("ascii");
      if (!text.includes("\r\n")) return;
      socket.off("data", onData);
      if (!text.startsWith("OK ")) {
        reject(new Error(`D-Bus authentication failed: ${text.trim()}`));
        return;
      }
      socket.write("BEGIN\r\n");
      resolve();
    };
    socket.on("data", onData);
    socket.write(`\0AUTH EXTERNAL ${uidHex()}\r\n`);
  });
