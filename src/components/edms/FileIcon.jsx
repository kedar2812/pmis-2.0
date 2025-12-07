import {
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Windows 11 style yellow folder color
const FOLDER_COLOR = '#FFC107'; // Amber-400 equivalent

export const FileIcon = ({ item, size = 24, isOpen = false, className }) => {
  // Check if it's a folder (FolderNode) - Documents don't have a 'type' field that matches these values
  if ('type' in item) {
    const folderNode = item;
    if (folderNode.type === 'project' || folderNode.type === 'phase' || folderNode.type === 'discipline') {
      return (
        <div className={cn('relative', className)}>
          {isOpen ? (
            <FolderOpen size={size} className="text-amber-500" fill={FOLDER_COLOR} />
          ) : (
            <Folder size={size} className="text-amber-500" fill={FOLDER_COLOR} />
          )}
        </div>
      );
    }
  }

  // It's a Document - show file type icon
  const doc = item;
  const iconClass = cn('flex-shrink-0', className);
  
  // Check if mimeType exists (it's a Document)
  if ('mimeType' in doc && doc.mimeType) {
    switch (doc.mimeType) {
      case 'application/pdf':
        return <FileText className={cn(iconClass, 'text-red-600')} size={size} />;
      case 'application/dwg':
        return <FileText className={cn(iconClass, 'text-blue-600')} size={size} />;
      case 'application/xlsx':
        return <FileSpreadsheet className={cn(iconClass, 'text-green-600')} size={size} />;
      case 'image/jpeg':
      case 'image/png':
        return <FileImage className={cn(iconClass, 'text-purple-600')} size={size} />;
      case 'video/mp4':
        return <FileVideo className={cn(iconClass, 'text-pink-600')} size={size} />;
      default:
        return <File className={cn(iconClass, 'text-gray-500')} size={size} />;
    }
  }
  
  // Fallback
  return <File className={cn(iconClass, 'text-gray-500')} size={size} />;
};


