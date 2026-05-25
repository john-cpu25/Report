import React, { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './IssueUploader.css';
import { supabase } from '../../supabaseClient';

const IssueUploader = ({ onUploadComplete, projectKey }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  const handleFiles = (newFiles) => {
    const filesWithStatus = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      url: null,
      errorMsg: null
    }));
    setFiles(prev => [...prev, ...filesWithStatus]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (fileObj, targetFolderId) => {
    setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));

    try {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      formData.append('folderId', targetFolderId || '1JeYf62I-cfJPqEFhnq8v1ow4VavYhhNx');

      const isLocal = window.location.hostname === 'localhost';
      const edgeFunctionUrl = isLocal 
          ? 'http://localhost:54321/functions/v1/upload-issue-attachment' 
          : `${supabase.supabaseUrl}/functions/v1/upload-issue-attachment`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          body: formData,
          headers: headers 
      });

      if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText);
      }

      const result = await response.json();

      if (result.success) {
        const fileData = {
          id: result.file.id,
          name: result.file.name,
          size_mb: (result.file.size / (1024 * 1024)).toFixed(2),
          url: result.file.webViewLink,
          uploaded_at: new Date().toISOString()
        };
        
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', url: fileData.url } : f));
        
        if (onUploadComplete) {
            onUploadComplete(fileData);
        }
      } else {
          throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error("Upload error:", error);
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', errorMsg: error.message } : f));
    }
  };

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    let targetFolderId = '1JeYf62I-cfJPqEFhnq8v1ow4VavYhhNx';

    if (projectKey) {
        setIsCreatingFolder(true);
        try {
            const today = new Date();
            const yy = String(today.getFullYear()).slice(2);
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const issueDate = `${yy}.${mm}.${dd}`;

            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const isLocal = window.location.hostname === 'localhost';
            const createFolderUrl = isLocal 
                ? 'http://localhost:54321/functions/v1/create-issue-folder' 
                : `${supabase.supabaseUrl}/functions/v1/create-issue-folder`;

            const res = await fetch(createFolderUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    rootFolderId: targetFolderId,
                    projectKey: projectKey,
                    issueDate: issueDate
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không thể tạo thư mục");
            targetFolderId = data.folderId;
        } catch (e) {
            console.error(e);
            alert("Lỗi khi tạo thư mục trên Drive: " + e.message);
            setIsCreatingFolder(false);
            return;
        }
        setIsCreatingFolder(false);
    }

    pendingFiles.forEach(fileObj => {
      uploadFile(fileObj, targetFolderId);
    });
  };

  const allSuccess = files.length > 0 && files.every(f => f.status === 'success');
  const hasPending = files.some(f => f.status === 'pending');

  return (
    <div className="issue-uploader-container">
      <div 
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input 
          ref={inputRef}
          type="file" 
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <UploadCloud size={40} className="upload-icon" />
        <p className="upload-text">Kéo thả file vào đây hoặc <span>chọn file</span></p>
        <p className="upload-hint">Hỗ trợ PDF, CAD (Tối đa 20MB)</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map(f => (
            <div key={f.id} className={`file-item status-${f.status}`}>
              <div className="file-info">
                <FileIcon size={20} className="file-icon" />
                <div className="file-details">
                  <span className="file-name">{f.file.name}</span>
                  <span className="file-size">{(f.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
              
              <div className="file-actions">
                {f.status === 'pending' && (
                  <button className="remove-btn" onClick={() => removeFile(f.id)}><X size={18} /></button>
                )}
                {f.status === 'uploading' && (
                  <Loader2 size={18} className="spin-icon" />
                )}
                {f.status === 'success' && (
                  <a href={f.url} target="_blank" rel="noreferrer"><CheckCircle size={18} className="success-icon" /></a>
                )}
                {f.status === 'error' && (
                  <AlertCircle size={18} className="error-icon" title={f.errorMsg} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPending && (
        <button className="start-upload-btn" onClick={startUpload} disabled={isCreatingFolder}>
          {isCreatingFolder ? (
            <><Loader2 size={16} className="spin-icon inline mr-2" /> Đang thiết lập thư mục Drive...</>
          ) : (
            "Tải lên Google Drive"
          )}
        </button>
      )}
      
      {allSuccess && (
        <div className="upload-complete-msg">
          <CheckCircle size={20} /> Đã tải lên tất cả thành công
        </div>
      )}
    </div>
  );
};

export default IssueUploader;
