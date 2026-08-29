/**
 * File validation utility for supported formats in Local Image Assistant.
 */

export const SUPPORTED_EXTENSIONS = [
  // Images
  'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg',
  // Videos
  'mp4', 'avi', 'mov', 'mkv', 'webm',
  // Documents
  'pdf', 'docx', 'doc', 'pptx', 'ppt',
  // Data Sheets
  'xlsx', 'xls', 'csv',
  // Text / Code
  'txt', 'json', 'md', 'py', 'js', 'ts'
];

export function validateFileExtension(filename) {
  if (!filename) return false;
  const parts = filename.split('.');
  if (parts.length <= 1) return false;
  const ext = parts.pop().toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}
