import React from 'react';
import {
  ImageIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  SparklesIcon,
  XIcon
} from '../Common/Icons';

export default function FileUploaderUI({ activeFile, onRemove }) {
  if (!activeFile) return null;

  const { fileObj, name, type, previewUrl } = activeFile;
  const isImage = type.startsWith('image/');
  
  // Extract file extension label
  const fileExt = name.split('.').pop().toUpperCase();
  
  // Format file size details
  const getFileSizeLabel = () => {
    if (!fileObj || !fileObj.size) return 'Unknown size';
    const sizeInBytes = fileObj.size;
    if (sizeInBytes < 1024) return `${sizeInBytes} Bytes`;
    const sizeInKB = sizeInBytes / 1024;
    if (sizeInKB < 1024) return `${sizeInKB.toFixed(1)} KB`;
    return `${(sizeInKB / 1024).toFixed(1)} MB`;
  };

  // Select SVG icon helper based on mime type
  const getFileIcon = () => {
    if (type.startsWith('video/')) return <SparklesIcon size={15} />;
    if (type.includes('sheet') || type.includes('excel') || name.endsWith('.csv')) return <LayoutDashboardIcon size={15} />;
    if (isImage) return <ImageIcon size={15} />;
    return <FileTextIcon size={15} />;
  };

  return (
    <div className="file-previews-container">
      <div className="preview-card">
        {isImage && previewUrl ? (
          <img 
            className="preview-thumbnail" 
            src={previewUrl} 
            alt="Selected upload preview" 
          />
        ) : (
          <div className="preview-icon-wrap">
            {getFileIcon()}
          </div>
        )}
        
        <div className="preview-details">
          <span className="preview-filename" title={name}>
            {name}
          </span>
          <span className="preview-meta">
            {fileExt} • {getFileSizeLabel()}
          </span>
        </div>

        <button 
          className="preview-remove" 
          type="button" 
          onClick={onRemove}
          aria-label="Remove attached file"
          title="Remove attached file"
        >
          <XIcon size={13} />
        </button>
      </div>
    </div>
  );
}
