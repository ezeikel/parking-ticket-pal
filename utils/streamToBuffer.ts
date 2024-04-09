import { Readable } from 'stream';
import { once } from 'events';

const streamToBuffer = async (readableStream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  readableStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  await once(readableStream, 'end');
  return Buffer.concat(chunks);
};

export default streamToBuffer;
