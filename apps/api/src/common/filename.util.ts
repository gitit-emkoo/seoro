/**
 * Multer가 한글 파일명을 latin1로 해석하는 경우를 UTF-8로 복원합니다.
 */
export function decodeUploadFileName(originalName: string | undefined | null): string {
  const raw = (originalName || 'file').trim() || 'file';
  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    // 복원 결과가 깨진 치환문자만이면 원본 유지
    if (!decoded || decoded.includes('\uFFFD')) return raw;
    return decoded;
  } catch {
    return raw;
  }
}
