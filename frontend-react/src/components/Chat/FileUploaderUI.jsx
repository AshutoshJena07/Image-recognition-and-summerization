import React from 'react';

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

  // Select icon helper based on mime type
  const getFileIcon = () => {
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📕';
    if (type.includes('sheet') || type.includes('excel') || name.endsWith('.csv')) return '📊';
    if (type.includes('word') || type.includes('document')) return '📘';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📙';
    return '📄';
  };

  return (
    <div className="file-previews-container">
      <div className="preview-card">
        {isImage ? (
          <img 
            className="preview-thumbnail" 
            src={previewUrl} 
            alt="Selected upload preview" 
          />
        ) : (
          <div 
            style={{ 
              fontSize: '16px', 
              display: 'grid', 
              placeItems: 'center', 
              width: '28px', 
              height: '28px', 
              background: 'var(--bg-surface-hover)', 
              borderRadius: 'var(--radius-xs)', 
              border: '1px solid var(--border-default)' 
            }}
          >
            {getFileIcon()}
          </div>
        )}
        
        <div className="preview-details">
          <span className="preview-filename" title={name}>
            {name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {fileExt} File • {getFileSizeLabel()}
          </span>
        </div>

        <button 
          className="preview-remove" 
          type="button" 
          onClick={onRemove}
          aria-label="Remove attached file"
        >
          ×
        </button>
      </div>
    </div>
  );
}
