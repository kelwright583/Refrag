/**
 * Storage path utilities
 */

/**
 * Generate storage path for evidence
 * Format: org/{org_id}/case/{case_id}/{uuid}-{filename}
 */
export function generateStoragePath(
  orgId: string,
  caseId: string,
  fileName: string
): string {
  const uuid = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `org/${orgId}/case/${caseId}/${uuid}-${sanitizedFileName}`;
}

/**
 * Get file extension from filename or content type
 */
export function getFileExtension(fileName: string, contentType?: string): string {
  if (fileName.includes('.')) {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }
  
  // Fallback to content type
  if (contentType) {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'application/pdf': 'pdf',
    };
    return mimeMap[contentType] || '';
  }
  
  return '';
}
