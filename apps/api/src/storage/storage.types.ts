export type StoredObject = {
  key: string;
};

/**
 * 로컬 ↔ 클라우드 Object Storage 전환을 위한 저장소 인터페이스.
 * 현재 구현: LocalStorageService (디스크)
 * 향후 후보: Supabase Storage / S3 호환 구현체
 */
export interface ObjectStorage {
  savePrivate(
    userId: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<StoredObject>;
  resolvePath(key: string): string;
  openReadStream(key: string): NodeJS.ReadableStream;
}
