import { clsx, type ClassValue } from "clsx"

import { twMerge } from "tailwind-merge"



export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Alternative name for cn function - commonly used for conditional classes
export function classNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getThumbnail(fileType: string, fileUrl: string): string {
  // If it's an image, return the file URL directly
  if (fileType.startsWith('image/')) {
    return fileUrl;
  }

  // Return appropriate thumbnail based on file type
  switch (fileType) {
    case 'application/pdf':
      return '/thumbnails/pdf.png';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '/thumbnails/doc.png';
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return '/thumbnails/ppt.png';
    default:
      return '/thumbnails/file.png';
  }
}