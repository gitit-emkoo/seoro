import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { ObjectStorage, StoredObject } from './storage.types';

@Injectable()
export class StorageService implements ObjectStorage {
  private readonly root =
    process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.root)) {
      mkdirSync(this.root, { recursive: true });
    }
  }

  async savePrivate(
    userId: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<StoredObject> {
    // path traversal 방지: userId 하위만 허용
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeName = originalName.replace(/[^\w.\-가-힣]/g, '_');
    const key = `${safeUser}/${Date.now()}_${randomUUID()}_${safeName}`;
    mkdirSync(join(this.root, safeUser), { recursive: true });
    await writeFile(join(this.root, key), buffer);
    return { key };
  }

  resolvePath(key: string) {
    const normalized = key.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new Error('Invalid storage key');
    }
    return join(this.root, normalized);
  }

  openReadStream(key: string) {
    return createReadStream(this.resolvePath(key));
  }
}
