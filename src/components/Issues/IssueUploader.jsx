import React, { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './IssueUploader.css';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { upsertIssue } from '../../services/supabaseService';

// Root folder ID in Google Drive (the "PROJECT" folder you shared)
const ROOT_FOLDER_ID = '1JeYf62I-cfJPqEFhnq8v1ow4VavYhhNx';

/**
 * Parse a drawing filename to extract sheet_number and rev_value.
 *
 * PDF format: "{ProjectNo} - [{SheetNo}] - [{SheetName}] - REV {Rev}.pdf"
 *   e.g.  "11092 - [S4101] - [LEVEL 1 - OVERALL PLAN] - REV H.pdf"
 *
 * DWG format: "{ProjectNo} - [{SheetNo}.DWG] - [{SheetName}] - REV {Rev}.dwg"
 *   e.g.  "11092 - [S4101.DWG] - [LEVEL 1 - OVERALL PLAN] - REV H.dwg"
 */
function parseDrawingFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, ''); // remove file extension

  // Match [S4101] or [S4101.DWG] — capture only the sheet code, strip .DWG suffix
  const sheetMatch = base.match(/\[([A-Z0-9]+(?:\.[A-Z0-9]+)*)(?:\.DWG)?\]/i);
  const sheetNumber = sheetMatch
    ? sheetMatch[1].replace(/\.DWG$/i, '').toUpperCase()
    : null;

  // Match "REV H" or "REV 1" (last occurrence to avoid false positives)
  const revMatches = [...base.matchAll(/REV\s+([A-Z0-9]+)/gi)];
  const revValue = revMatches.length > 0
    ? revMatches[revMatches.length - 1][1].toUpperCase()
    : null;

  return { sheetNumber, revValue };
}

/**
 * Find matching drawing info from registerData given sheetNumber + revValue.
 * registerData.drawings[].revisions is an OBJECT keyed by date string:
 *   { "26.05.20": "H", "26.04.15": "G" }
 * Returns { sheetName, revDate } or null.
 */
function lookupDrawingInfo(registerData, sheetNumber, revValue) {
  if (!registerData?.drawings || !sheetNumber) return null;
  const drawing = registerData.drawings.find(d => d.sheetNo === sheetNumber);
  if (!drawing) return null;

  // revisions is an object keyed by date string, value is the revision letter
  let revDate = null;
  if (drawing.revisions) {
    const entry = Object.entries(drawing.revisions).find(
      ([, rev]) => rev && rev.toString().toUpperCase() === revValue?.toUpperCase()
    );
    if (entry) revDate = entry[0]; // the date key
  }

  return { sheetName: drawing.sheetName || '', revDate };
}

const IssueUploader = ({ onUploadComplete, projectKey, projectId, registerData }) => {
  const [dragActive, setDragActive]   = useState(false);
  const [files, setFiles]             = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg]     = useState('');
  const inputRef                      = useRef(null);
  const { uploadFiles }               = useGoogleDrive();

  // ── Drag & drop handlers ──────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) handleFiles(Array.from(e.target.files));
  };

  const handleFiles = (newFiles) => {
    const withStatus = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      url: null,
      errorMsg: null,
    }));
    setFiles(prev => [...prev, ...withStatus]);
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  // ── Upload via Google OAuth → save to NMK_Issue ───────────────────────────
  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setStatusMsg('Đang xác thực Google...');

    setFiles(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading' } : f
    ));

    try {
      await uploadFiles(
        pendingFiles.map(f => f.file),
        ROOT_FOLDER_ID,
        projectKey || 'UNKNOWN',
        async (result, index) => {
          const fileObj  = pendingFiles[index];
          const fileName = fileObj.file.name;
          const ext      = fileName.split('.').pop()?.toLowerCase();
          const fileType = (ext === 'dwg' || ext === 'dxf') ? 'dwg' : 'pdf';

          // Update UI status
          setFiles(prev => prev.map(f =>
            f.file === fileObj.file
              ? { ...f, status: 'success', url: result.webViewLink }
              : f
          ));
          setStatusMsg(`✅ Uploaded: ${fileName}`);

          // Parse filename → match registerData
          const { sheetNumber, revValue } = parseDrawingFilename(fileName);
          const drawingInfo = sheetNumber
            ? lookupDrawingInfo(registerData, sheetNumber, revValue)
            : null;

          console.log(`[Issue] projectId=${projectId}, file=${fileName}, sheet=${sheetNumber}, rev=${revValue}, date=${drawingInfo?.revDate}`);

          // Save to NMK_Issue if we have enough info
          if (sheetNumber && projectId) {
            try {
              const saved = await upsertIssue({
                project_id:   projectId,
                sheet_number: sheetNumber,
                sheet_name:   drawingInfo?.sheetName || '',
                rev_date:     drawingInfo?.revDate   || '',
                rev_value:    revValue               || '',
                type:         fileType,
                url:          result.webViewLink,
              });
              console.log(`[Issue] ✅ Saved to DB:`, saved);
              setStatusMsg(prev => prev + ` | DB: ✅ ${sheetNumber}`);
            } catch (dbErr) {
              console.error('[Issue] DB save error:', dbErr);
              setStatusMsg(prev => prev + ` | DB: ❌ ${dbErr.message}`);
            }
          } else {
            console.warn(`[Issue] ⚠️ Skipping DB: sheetNumber=${sheetNumber}, projectId=${projectId}`);
            setStatusMsg(prev => prev + ` | DB: ⚠️ Cannot parse sheet number`);
          }

          if (onUploadComplete) {
            onUploadComplete({
              id:          result.id,
              name:        result.name,
              url:         result.webViewLink,
              downloadUrl: result.webContentLink,
              type:        fileType,
              sheetNumber,
              revValue,
              revDate:     drawingInfo?.revDate,
              uploaded_at: new Date().toISOString(),
            });
          }
        }
      );
      setStatusMsg('✅ Tất cả file đã tải lên thành công!');
    } catch (err) {
      console.error('Upload error:', err);
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'error', errorMsg: err.message } : f
      ));
      setStatusMsg(`❌ Lỗi: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const hasPending   = files.some(f => f.status === 'pending');
  const hasUploading = files.some(f => f.status === 'uploading');
  const allSuccess   = files.length > 0 && files.every(f => f.status === 'success');

  return (
    <div className="issue-uploader-container">
      {/* Drop zone */}
      <div
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag}
        onDragOver={handleDrag}  onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple
          accept=".pdf,.dwg,.dxf"
          onChange={handleChange} style={{ display: 'none' }} />
        <UploadCloud size={40} className="upload-icon" />
        <p className="upload-text">Kéo thả file vào đây hoặc <span>chọn file</span></p>
        <p className="upload-hint">Hỗ trợ PDF · DWG · DXF</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map(f => {
            const ext = f.file.name.split('.').pop()?.toLowerCase();
            const typeLabel = (ext === 'dwg' || ext === 'dxf') ? 'DWG' : 'PDF';
            return (
              <div key={f.id} className={`file-item status-${f.status}`}>
                <div className="file-info">
                  <span className={`file-type-badge type-${typeLabel.toLowerCase()}`}>{typeLabel}</span>
                  <div className="file-details">
                    <span className="file-name">{f.file.name}</span>
                    <span className="file-size">{(f.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
                <div className="file-actions">
                  {f.status === 'pending'   && <button className="remove-btn" onClick={() => removeFile(f.id)}><X size={18} /></button>}
                  {f.status === 'uploading' && <Loader2 size={18} className="spin-icon" />}
                  {f.status === 'success'   && <a href={f.url} target="_blank" rel="noreferrer"><CheckCircle size={18} className="success-icon" /></a>}
                  {f.status === 'error'     && <AlertCircle size={18} className="error-icon" title={f.errorMsg} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {statusMsg && (
        <p style={{ fontSize: '0.82rem', marginTop: '8px', color: '#888' }}>{statusMsg}</p>
      )}

      {(hasPending || hasUploading) && (
        <button className="start-upload-btn" onClick={startUpload} disabled={isUploading || hasUploading}>
          {isUploading || hasUploading
            ? <><Loader2 size={16} className="spin-icon inline mr-2" /> Đang tải lên...</>
            : 'Tải lên Google Drive'}
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
