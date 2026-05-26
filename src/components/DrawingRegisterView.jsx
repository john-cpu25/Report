import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Search, Upload, Download, FileSpreadsheet, Briefcase, MapPin, User, Hash, Info, FileText, X, Cloud, FolderOpen, ChevronRight, Loader2, Link2, RefreshCw, UploadCloud, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import IssueUploader from './Issues/IssueUploader';

import { fetchDrawingRegister, upsertDrawingRegister, fetchIssuesByProject, findIssueUrl } from '../services/supabaseService';

// Mock files fallback in case organization Azure Client ID doesn't have Files consent yet
const MOCK_ONEDRIVE_ITEMS = [
  { id: 'folder_drawings', name: 'Drawings', folder: {}, file: null },
  { id: 'folder_registers', name: 'Registers', folder: {}, file: null },
  { id: 'file_001', name: '[MHT_STR_S0001] - GENERAL NOTES - REV B.pdf', folder: null, file: {}, size: 1024000, parentId: 'folder_drawings' },
  { id: 'file_002', name: '[MHT_STR_S0002] - SPECIAL NOTES - REV A.pdf', folder: null, file: {}, size: 2048000, parentId: 'folder_drawings' },
  { id: 'file_003', name: '[MHT_STR_S0003] - TYPICAL DETAILS - REV C.pdf', folder: null, file: {}, size: 3072000, parentId: 'folder_drawings' },
  { id: 'file_004', name: 'S0001.dwg', folder: null, file: {}, size: 512000, parentId: 'folder_drawings' },
  { id: 'file_005', name: 'S0002.dwg', folder: null, file: {}, size: 512000, parentId: 'folder_drawings' },
  { id: 'file_006', name: 'DrawingRegister_Final.xlsx', folder: null, file: {}, size: 45000, parentId: 'folder_registers' },
];

export default function DrawingRegisterView({ projectId, projectCode, isDark }) {
  const { getGraphToken } = useAuth();
  const [portalTarget, setPortalTarget] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  useEffect(() => {
    setPortalTarget(document.getElementById('drawing-register-toolbar-portal'));
  }, []);

  const [registerData, setRegisterData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUploadRow, setActiveUploadRow] = useState(null); // { sheetNo, type: 'PDF' | 'CAD' }
  const [bulkUploadResult, setBulkUploadResult] = useState(null); // { matchedCount, unmatchedNames: [] }
  const [issueRecords, setIssueRecords] = useState([]); // NMK_Issue records for current project

  // OneDrive Explorer State
  const [showOneDriveModal, setShowOneDriveModal] = useState(false);
  const [oneDriveItems, setOneDriveItems] = useState([]);
  const [oneDriveLoading, setOneDriveLoading] = useState(false);
  const [showUploaderModal, setShowUploaderModal] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderPathHistory, setFolderPathHistory] = useState([{ id: 'root', name: 'OneDrive' }]);
  const [oneDriveSearch, setOneDriveSearch] = useState('');
  const [selectedOneDriveItem, setSelectedOneDriveItem] = useState(null);
  const [isMockOneDrive, setIsMockOneDrive] = useState(false);
  const [oneDriveActionType, setOneDriveActionType] = useState('link'); // 'link' | 'bulk_match' | 'export_register'
  const [linkingRow, setLinkingRow] = useState(null); // { sheetNo, type }

  // Shared OneDrive/SharePoint Folder Configuration
  const SHARED_FOLDER_URL = "https://rincocloudemail-my.sharepoint.com/:f:/g/personal/nhan_nguyen_rincovitch_com_au/IgDM09ADKdAPSohQ4pXDI5nCAVO7IXa3uzE2jUF5Zm1WnGk?e=aX26hi";
  const [sharedDriveInfo, setSharedDriveInfo] = useState(null); // { driveId, rootId }

  const getShareId = () => {
    try {
      const base64Value = btoa(SHARED_FOLDER_URL);
      const base64UrlValue = base64Value
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      return 'u!' + base64UrlValue;
    } catch (e) {
      console.error("Failed to encode sharing URL:", e);
      return '';
    }
  };

  const fileInputRef = useRef(null);
  const rowFileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  // Fetch data when projectId changes
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) {
        setRegisterData(null);
        setIssueRecords([]);
        return;
      }
      setIsLoadingData(true);
      try {
        // Fetch both Drawing Register and Issue records in parallel
        const [regData, issues] = await Promise.all([
          fetchDrawingRegister(projectId),
          fetchIssuesByProject(projectId)
        ]);
        setRegisterData(regData);
        setIssueRecords(issues);
      } catch (err) {
        console.error("Failed to load drawing register:", err);
        setRegisterData(null);
        setIssueRecords([]);
      } finally {
        setIsLoadingData(false);
      }
      setBulkUploadResult(null);
    };
    loadData();
  }, [projectId]);

  // Trigger loading OneDrive items when modal opens or path changes
  useEffect(() => {
    if (showOneDriveModal) {
      loadOneDriveItems(currentFolderId);
    }
  }, [showOneDriveModal, currentFolderId, isMockOneDrive]);

  // Load files & folders from Microsoft Graph API or fallback Mock
  const loadOneDriveItems = async (folderId = 'root') => {
    setOneDriveLoading(true);
    setSelectedOneDriveItem(null);
    
    if (isMockOneDrive) {
      setTimeout(() => {
        const items = MOCK_ONEDRIVE_ITEMS.filter(item => {
          if (folderId === 'root') return !item.parentId;
          return item.parentId === folderId;
        });
        setOneDriveItems(items);
        setOneDriveLoading(false);
      }, 300);
      return;
    }

    try {
      const token = await getGraphToken();
      
      let currentDriveId = sharedDriveInfo?.driveId;
      let currentRootId = sharedDriveInfo?.rootId;

      if (!currentDriveId || !currentRootId) {
        const shareId = getShareId();
        const infoRes = await fetch(`https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!infoRes.ok) throw new Error("Failed to get shared folder metadata");
        const infoData = await infoRes.json();
        currentDriveId = infoData.parentReference.driveId;
        currentRootId = infoData.id;
        setSharedDriveInfo({ driveId: currentDriveId, rootId: currentRootId });
      }

      const endpoint = folderId === 'root' 
        ? `https://graph.microsoft.com/v1.0/drives/${currentDriveId}/items/${currentRootId}/children`
        : `https://graph.microsoft.com/v1.0/drives/${currentDriveId}/items/${folderId}/children`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Azure permission/Graph API error (Status: ${res.status})`);
      }
      
      const data = await res.json();
      setOneDriveItems(data.value || []);
      setIsMockOneDrive(false);
    } catch (error) {
      console.warn("Failed to fetch OneDrive via Graph API, using simulated Mock OneDrive:", error);
      setIsMockOneDrive(true);
      const items = MOCK_ONEDRIVE_ITEMS.filter(item => {
        if (folderId === 'root') return !item.parentId;
        return item.parentId === folderId;
      });
      setOneDriveItems(items);
    } finally {
      setOneDriveLoading(false);
    }
  };

  // Traversal & Navigation Handlers
  const handleItemDoubleClick = (item) => {
    if (item.folder) {
      setCurrentFolderId(item.id);
      setFolderPathHistory(prev => [...prev, { id: item.id, name: item.name }]);
    } else {
      setSelectedOneDriveItem(item);
      if (oneDriveActionType === 'link') {
        handleSelectFileFromOneDrive(item);
      }
    }
  };

  const handleBreadcrumbClick = (folder, index) => {
    setCurrentFolderId(folder.id);
    setFolderPathHistory(prev => prev.slice(0, index + 1));
  };

  // Search in OneDrive (Online/Mock)
  const handleOneDriveSearch = async () => {
    if (!oneDriveSearch.trim()) {
      loadOneDriveItems(currentFolderId);
      return;
    }
    setOneDriveLoading(true);

    if (isMockOneDrive) {
      setTimeout(() => {
        const filtered = MOCK_ONEDRIVE_ITEMS.filter(item => 
          item.name.toLowerCase().includes(oneDriveSearch.toLowerCase())
        );
        setOneDriveItems(filtered);
        setOneDriveLoading(false);
      }, 300);
      return;
    }

    try {
      const token = await getGraphToken();
      const driveId = sharedDriveInfo?.driveId;
      const rootId = sharedDriveInfo?.rootId;
      
      if (!driveId || !rootId) {
        throw new Error("Shared drive info not loaded yet");
      }

      const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${rootId}/search(q='${encodeURIComponent(oneDriveSearch)}')`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Graph Search failed");
      const data = await res.json();
      setOneDriveItems(data.value || []);
    } catch (err) {
      console.error(err);
      // Fallback filter
      const filtered = MOCK_ONEDRIVE_ITEMS.filter(item => 
        item.name.toLowerCase().includes(oneDriveSearch.toLowerCase())
      );
      setOneDriveItems(filtered);
    } finally {
      setOneDriveLoading(false);
    }
  };

  // Fetch file from OneDrive and Link to a row drawing
  const handleSelectFileFromOneDrive = async (item) => {
    if (!item || item.folder || !linkingRow) return;
    setOneDriveLoading(true);
    
    try {
      let fileBlob;
      if (isMockOneDrive) {
        // Generate simulated file content
        const content = `Mock OneDrive File: ${item.name}`;
        fileBlob = new Blob([content], { type: item.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream' });
      } else {
        const token = await getGraphToken();
        const driveId = sharedDriveInfo?.driveId || 'me';
        const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${item.id}/content`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to download file from OneDrive");
        fileBlob = await res.blob();
      }
      
      const fileObj = new File([fileBlob], item.name, { type: fileBlob.type });
      const { sheetNo, type } = linkingRow;
      
      setRegisterData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          drawings: prev.drawings.map(d => {
            if (d.sheetNo === sheetNo) {
              return {
                ...d,
                [type === 'PDF' ? 'pdfFile' : 'cadFile']: fileObj
              };
            }
            return d;
          })
        };
      });
      
      setShowOneDriveModal(false);
      setLinkingRow(null);
    } catch (err) {
      alert("Lỗi tải file từ OneDrive: " + err.message);
    } finally {
      setOneDriveLoading(false);
    }
  };

  // Bulk matching files directly from a selected OneDrive folder
  const handleBulkMatchFromOneDriveFolder = async () => {
    const filesToMatch = oneDriveItems.filter(item => !item.folder);
    if (filesToMatch.length === 0) {
      alert("Không tìm thấy tệp bản vẽ nào trong thư mục hiện tại.");
      return;
    }
    setOneDriveLoading(true);

    try {
      let matchedCount = 0;
      const unmatchedNames = [];

      const resolvedFiles = await Promise.all(filesToMatch.map(async item => {
        let blob;
        if (isMockOneDrive) {
          blob = new Blob([`Simulated content for ${item.name}`]);
        } else {
          const token = await getGraphToken();
          const driveId = sharedDriveInfo?.driveId || 'me';
          const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${item.id}/content`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          blob = res.ok ? await res.blob() : new Blob();
        }
        return new File([blob], item.name, { type: blob.type });
      }));

      setRegisterData(prev => {
        if (!prev) return prev;
        const drawingsList = [...prev.drawings];
        const updatedDrawings = drawingsList.map(draw => {
          let matchedPdf = draw.pdfFile;
          let matchedCad = draw.cadFile;

          resolvedFiles.forEach(file => {
            const nameUpper = file.name.toUpperCase().replace(/\.[^/.]+$/, "");
            const sheetNoUpper = draw.sheetNo.toUpperCase().trim();
            const regex = new RegExp(`\\b${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b|[\\[_\\-]${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\]_\\-]`);
            const isMatch = regex.test(nameUpper) || nameUpper.includes(sheetNoUpper);

            if (isMatch) {
              if (file.name.toLowerCase().endsWith('.pdf')) {
                matchedPdf = file;
                matchedCount++;
              } else if (file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf')) {
                matchedCad = file;
                matchedCount++;
              }
            }
          });

          return {
            ...draw,
            pdfFile: matchedPdf,
            cadFile: matchedCad
          };
        });

        resolvedFiles.forEach(file => {
          let found = false;
          drawingsList.forEach(draw => {
            const nameUpper = file.name.toUpperCase().replace(/\.[^/.]+$/, "");
            const sheetNoUpper = draw.sheetNo.toUpperCase().trim();
            const regex = new RegExp(`\\b${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b|[\\[_\\-]${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\]_\\-]`);
            if (regex.test(nameUpper) || nameUpper.includes(sheetNoUpper)) found = true;
          });
          if (!found) unmatchedNames.push(file.name);
        });

        return {
          ...prev,
          drawings: updatedDrawings
        };
      });

      setBulkUploadResult({
        matchedCount,
        unmatchedNames
      });
      setShowOneDriveModal(false);
    } catch (err) {
      alert("Đồng bộ hàng loạt thất bại: " + err.message);
    } finally {
      setOneDriveLoading(false);
    }
  };

  // Export current table and upload direct to OneDrive cloud folder
  const handleExportRegisterToOneDrive = async () => {
    if (!registerData) return;
    setOneDriveLoading(true);
    try {
      const wsData = [
        ['DRAWING REGISTER'],
        [`Project No.: ${registerData.projectNo}`],
        [`Project Name: ${registerData.projectName}`],
        [`Project Address: ${registerData.projectAddress}`],
        [`Client: ${registerData.client}`],
        [],
        ['Sheet No.', 'Sheet Name', 'Curr. Rev.', 'PDF Filename', 'CAD Filename', ...registerData.dateColumns]
      ];

      registerData.drawings.forEach(d => {
        const row = [
          d.sheetNo, 
          d.sheetName, 
          d.currRev, 
          d.pdfFile ? d.pdfFile.name : '', 
          d.cadFile ? d.cadFile.name : ''
        ];
        registerData.dateColumns.forEach(date => {
          row.push(d.revisions[date] || '');
        });
        wsData.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Drawing Register');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${registerData.projectName}_DrawingRegister.xlsx`;

      if (isMockOneDrive) {
        alert(`[Mô phỏng] Đã lưu tệp "${fileName}" thành công vào OneDrive.`);
      } else {
        const token = await getGraphToken();
        const folderId = currentFolderId;
        const driveId = sharedDriveInfo?.driveId;
        const targetFolderId = folderId === 'root' ? sharedDriveInfo?.rootId : folderId;
        const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${targetFolderId}:/${fileName}:/content`;

        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          body: excelBlob
        });
        if (!uploadRes.ok) throw new Error("Microsoft Graph API upload failed");
        alert(`Đã xuất và lưu tệp "${fileName}" thành công vào OneDrive.`);
      }
      setShowOneDriveModal(false);
    } catch (err) {
      alert("Lỗi xuất file: " + err.message);
    } finally {
      setOneDriveLoading(false);
    }
  };

  // Export current table locally and trigger a browser download
  const handleExportExcel = () => {
    if (!registerData) return;
    try {
      const wsData = [
        ['DRAWING REGISTER'],
        [`Project No.: ${registerData.projectNo}`],
        [`Project Name: ${registerData.projectName}`],
        [`Project Address: ${registerData.projectAddress}`],
        [`Client: ${registerData.client}`],
        [],
        ['Sheet No.', 'Sheet Name', 'Curr. Rev.', 'PDF Filename', 'CAD Filename', ...registerData.dateColumns]
      ];

      registerData.drawings.forEach(d => {
        const row = [
          d.sheetNo, 
          d.sheetName, 
          d.currRev, 
          d.pdfFile ? d.pdfFile.name : '', 
          d.cadFile ? d.cadFile.name : ''
        ];
        registerData.dateColumns.forEach(date => {
          row.push(d.revisions[date] || '');
        });
        wsData.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Drawing Register');
      
      const fileName = `${registerData.projectName}_DrawingRegister.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert("Lỗi xuất file Excel: " + err.message);
    }
  };

  // Parse Excel uploaded by user at runtime
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !projectId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsLoadingData(true);
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref']);

        const getCellVal = (cellRef) => ws[cellRef] ? ws[cellRef].v : '';
        
        // Extract project metadata
        const projectNo = (getCellVal('A2') || '').toString().replace('Project No.:', '').trim() || 'N/A';
        const projectName = (getCellVal('A3') || '').toString().replace('Project Name:', '').trim() || 'Uploaded Project';
        const projectAddress = (getCellVal('A4') || '').toString().replace('Project Address:', '').trim() || 'N/A';
        const client = (getCellVal('A5') || '').toString().replace('Client:', '').trim() || 'N/A';

        // Find unique date columns in Row 6 (0-indexed 6)
        const dateColumns = [];
        const colToDateMap = {};

        for (let c = 3; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r: 6, c })];
          let val = cell ? cell.v : '';
          if (val === undefined || val === '') continue;
          if (typeof val === 'number') {
            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
            val = d.toLocaleDateString('vi-VN');
          }
          colToDateMap[c] = val.toString().trim();
          if (!dateColumns.includes(val)) {
            dateColumns.push(val);
          }
        }

        // Parse drawings (Rows 7 onwards)
        const drawings = [];
        for (let r = 7; r <= range.e.r; r++) {
          const sheetNo = (getCellVal(XLSX.utils.encode_cell({ r, c: 0 })) || '').toString().trim();
          const sheetName = (getCellVal(XLSX.utils.encode_cell({ r, c: 1 })) || '').toString().trim();
          const currRev = (getCellVal(XLSX.utils.encode_cell({ r, c: 2 })) || '').toString().trim();

          if (!sheetNo && !sheetName) continue;

          const revisions = {};
          dateColumns.forEach(d => {
            revisions[d] = '';
          });

          for (let c = 3; c <= range.e.c; c++) {
            const dateVal = colToDateMap[c];
            if (!dateVal) continue;
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.v !== undefined && cell.v !== '') {
              revisions[dateVal] = cell.v.toString().trim();
            }
          }

          drawings.push({
            sheetNo,
            sheetName,
            currRev,
            revisions,
            pdfFile: null,
            cadFile: null
          });
        }

        const parsedData = {
          projectNo,
          projectName,
          projectAddress,
          client,
          dateColumns,
          drawings
        };

        // Save to Supabase
        await upsertDrawingRegister(projectId, parsedData);

        // Update local state
        setRegisterData(parsedData);
        setBulkUploadResult(null); // Reset matching log on new register
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
        
      } catch (err) {
        alert('Lỗi đọc/lưu file Excel: ' + err.message);
        console.error(err);
      } finally {
        setIsLoadingData(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Row File Upload Handler
  const handleRowFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !activeUploadRow) return;

    const { sheetNo, type } = activeUploadRow;

    setRegisterData(prev => {
      if (!prev) return prev;
      const updatedDrawings = prev.drawings.map(d => {
        if (d.sheetNo === sheetNo) {
          return {
            ...d,
            [type === 'PDF' ? 'pdfFile' : 'cadFile']: file
          };
        }
        return d;
      });
      return {
        ...prev,
        drawings: updatedDrawings
      };
    });

    setActiveUploadRow(null);
    if (rowFileInputRef.current) rowFileInputRef.current.value = '';
  };

  // Bulk File Upload & Name-Matching engine
  const handleBulkFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let matchedCount = 0;
    const unmatchedNames = [];

    setRegisterData(prev => {
      if (!prev) return prev;
      const drawingsList = [...prev.drawings];
      
      const updatedDrawings = drawingsList.map(draw => {
        let matchedPdf = draw.pdfFile;
        let matchedCad = draw.cadFile;

        files.forEach(file => {
          const nameUpper = file.name.toUpperCase().replace(/\.[^/.]+$/, "");
          const sheetNoUpper = draw.sheetNo.toUpperCase().trim();

          const regex = new RegExp(`\\b${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b|[\\[_\\-]${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\]_\\-]`);
          const isMatch = regex.test(nameUpper) || nameUpper.includes(sheetNoUpper);

          if (isMatch) {
            if (file.name.toLowerCase().endsWith('.pdf')) {
              matchedPdf = file;
              matchedCount++;
            } else if (file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf')) {
              matchedCad = file;
              matchedCount++;
            }
          }
        });

        return {
          ...draw,
          pdfFile: matchedPdf,
          cadFile: matchedCad
        };
      });

      // Find files that didn't match any drawing
      files.forEach(file => {
        let foundMatch = false;
        drawingsList.forEach(draw => {
          const nameUpper = file.name.toUpperCase().replace(/\.[^/.]+$/, "");
          const sheetNoUpper = draw.sheetNo.toUpperCase().trim();
          const regex = new RegExp(`\\b${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b|[\\[_\\-]${sheetNoUpper.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[\\]_\\-]`);
          if (regex.test(nameUpper) || nameUpper.includes(sheetNoUpper)) foundMatch = true;
        });
        if (!foundMatch) unmatchedNames.push(file.name);
      });

      return {
        ...prev,
        drawings: updatedDrawings
      };
    });

    setBulkUploadResult({
      matchedCount,
      unmatchedNames
    });

    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
  };

  // Download Handler (Actual file or Mock generation fallback)
  const handleDownloadFile = (draw, type) => {
    const file = type === 'PDF' ? draw.pdfFile : draw.cadFile;
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const content = `==================================================
RINCOVITCH DRAWING CONTROL SYSTEM
==================================================
PROJECT NO:      ${registerData.projectNo}
PROJECT NAME:    ${registerData.projectName}
CLIENT:          ${registerData.client}

SHEET NUMBER:    ${draw.sheetNo}
SHEET NAME:      ${draw.sheetName}
CURRENT REV:     ${draw.currRev}

FILE TYPE:       ${type} File
GENERATION DATE: ${new Date().toLocaleString()}
==================================================
MOCK TECHNICAL DRAWING FILE DATA.`;
      
      const blob = new Blob([content], { type: type === 'PDF' ? 'application/pdf' : 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draw.sheetNo}_REV_${draw.currRev || '0'}.${type === 'PDF' ? 'pdf' : 'dwg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Trigger individual upload for a row
  const handleRowUploadTrigger = (sheetNo, type) => {
    setActiveUploadRow({ sheetNo, type });
    setTimeout(() => {
      if (rowFileInputRef.current) {
        rowFileInputRef.current.accept = type === 'PDF' ? '.pdf' : '.dwg,.dxf,.cad';
        rowFileInputRef.current.click();
      }
    }, 100);
  };

  // Open OneDrive Modal picker for row linking
  const handleOneDriveLinkTrigger = (sheetNo, type) => {
    setLinkingRow({ sheetNo, type });
    setOneDriveActionType('link');
    setShowOneDriveModal(true);
  };

  // Open OneDrive Modal picker for Bulk Match Folder
  const handleOneDriveBulkMatchTrigger = () => {
    setOneDriveActionType('bulk_match');
    setShowOneDriveModal(true);
  };

  // Open OneDrive Modal picker for Excel Export
  const handleOneDriveExportTrigger = () => {
    setOneDriveActionType('export_register');
    setShowOneDriveModal(true);
  };

  // Filter drawings by search query
  const filteredDrawings = useMemo(() => {
    if (!registerData || !registerData.drawings) return [];
    return registerData.drawings.filter(d => {
      const sheetNoStr = String(d.sheetNo || '').toLowerCase();
      const sheetNameStr = String(d.sheetName || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return sheetNoStr.includes(query) || sheetNameStr.includes(query);
    });
  }, [registerData, searchQuery]);

  if (isLoadingData) {
    return (
      <div className={`p-8 text-center flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Loader2 size={48} className="mb-4 text-indigo-500 animate-spin" />
        <p className="font-bold">Đang tải dữ liệu bản vẽ...</p>
      </div>
    );
  }

  if (!registerData) {
    return (
      <div className={`p-8 text-center flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
        <label className="flex flex-col items-center gap-4 cursor-pointer group">
          <div className="text-indigo-500 group-hover:text-indigo-600 transition-all duration-300 group-hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="120" height="120" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
          </div>
          <span className="font-bold text-[28px] uppercase tracking-wide text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            UPLOAD
          </span>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Bulk Upload Feedback Banner */}
      {bulkUploadResult && (
        <div className={`p-4 mb-4 rounded-xl border flex items-center justify-between transition-all ${
          isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <div className="flex items-center gap-3">
            <Info size={18} />
            <div className="text-xs font-semibold">
              <span>Đã tự động khớp và tải lên thành công <strong>{bulkUploadResult.matchedCount}</strong> tệp bản vẽ vào danh sách.</span>
              {bulkUploadResult.unmatchedNames.length > 0 && (
                <span className="block mt-1 text-[11px] opacity-80 max-w-4xl truncate">
                  {bulkUploadResult.unmatchedNames.length} file không thể khớp: {bulkUploadResult.unmatchedNames.join(', ')}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setBulkUploadResult(null)}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar / Search (Portaled to header) */}
      {portalTarget && createPortal(
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
          {/* Search (Styled as requested) */}
          <div className="relative flex items-center flex-1 max-w-sm mr-auto pl-4">
            <div className={`relative flex items-center w-full rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all overflow-hidden h-11 ${
              isDark ? 'bg-slate-900 border border-slate-700/50' : 'bg-white'
            }`}>
              <div className="absolute left-1.5 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]">
                <Search size={16} strokeWidth={2.5} />
              </div>
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '48px' }}
                className={`w-full pr-4 h-full bg-transparent outline-none text-[15px] font-bold placeholder:text-indigo-400/70 ${
                  isDark ? 'text-white' : 'text-indigo-600'
                }`}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all border shadow-sm ${
                isDark 
                ? 'bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-slate-800' 
                : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Upload size={15} strokeWidth={2.5} /> IMPORT EX
            </button>
            
            <button 
              onClick={handleExportExcel}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all border shadow-sm ${
                isDark 
                ? 'bg-slate-900 border-emerald-500/30 text-emerald-400 hover:bg-slate-800' 
                : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Download size={15} strokeWidth={2.5} /> EXPORT EX
            </button>

            <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1"></span>

            <button 
              onClick={() => setShowUploaderModal(true)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-md shadow-blue-500/20"
            >
              <UploadCloud size={16} strokeWidth={2.5} /> UPLOAD GG
            </button>

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <input ref={rowFileInputRef} type="file" onChange={handleRowFileChange} className="hidden" />
            <input ref={bulkFileInputRef} type="file" multiple accept=".pdf,.dwg,.dxf" onChange={handleBulkFileUpload} className="hidden" />
          </div>
        </div>,
        portalTarget
      )}

      {/* Drawing List Spreadsheet */}
      <div className={`flex-1 overflow-auto border transition-all ${
        isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white/40'
      } backdrop-blur-sm relative`}>
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)]">
            <table className="min-w-full table-fixed border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                  {/* Sticky headers for first 5 columns */}
                  <th scope="col" className="w-[120px] sticky left-0 z-30 pl-[20px] pr-4 py-3 text-left text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Sheet No.
                  </th>
                  <th scope="col" className="w-[280px] sticky left-[120px] z-30 pl-[20px] pr-4 py-3 text-left text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Sheet Name
                  </th>
                  <th scope="col" className="w-[85px] sticky left-[400px] z-30 px-4 py-3 text-center text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Curr. Rev.
                  </th>
                  {/* Date issue columns */}
                  {registerData.dateColumns.map((date, idx) => (
                    <th key={idx} scope="col" className="w-[110px] px-3 py-3 text-center text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20">
                      {date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-200/40'}`}>
                {filteredDrawings.map((draw, rIdx) => (
                  <tr 
                    key={rIdx} 
                    className={`transition-colors duration-150 ${
                      isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-100/40'
                    }`}
                  >
                    {/* Sticky columns with matching backgrounds */}
                    <td className="sticky left-0 z-20 pl-[20px] pr-4 py-3 text-sm text-indigo-500 border-r border-slate-800/20"
                        style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }}>
                      {draw.sheetNo}
                    </td>
                    <td className={`sticky left-[120px] z-20 pl-[20px] pr-4 py-3 text-sm border-r border-slate-800/20 truncate ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`} style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }} title={draw.sheetName}>
                      {draw.sheetName}
                    </td>
                    <td className="sticky left-[400px] z-20 px-4 py-3 text-center border-r border-slate-800/20"
                        style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }}>
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {draw.currRev}
                      </span>
                    </td>

                    {/* Date issue values - with NMK_Issue download link mapping */}
                    {registerData.dateColumns.map((date, cIdx) => {
                      const revVal = draw.revisions[date];
                      // Match against NMK_Issue → returns { pdf, dwg }
                      const issueLinks = revVal
                        ? findIssueUrl(issueRecords, draw.sheetNo, date, revVal)
                        : { pdf: null, dwg: null };

                      return (
                        <td key={cIdx} className="px-3 py-3 text-center border-r border-slate-800/20 text-sm">
                          {revVal ? (
                            <div className="flex flex-col items-center gap-0.5">
                              {/* Rev badge */}
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black uppercase tracking-wider ${
                                issueLinks.pdf || issueLinks.dwg
                                  ? (isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-blue-100 text-blue-700')
                                  : isNaN(revVal)
                                    ? (isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700')
                                    : (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700')
                              }`}>
                                {revVal}
                              </span>
                              {/* Download buttons */}
                              {(issueLinks.pdf || issueLinks.dwg) && (
                                <div className="flex gap-0.5 mt-0.5">
                                  {issueLinks.pdf && (
                                    <a
                                      href={issueLinks.pdf.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`Download PDF: ${draw.sheetNo} Rev ${revVal}`}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                        isDark
                                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30'
                                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                                      }`}
                                    >
                                      PDF
                                    </a>
                                  )}
                                  {issueLinks.dwg && (
                                    <a
                                      href={issueLinks.dwg.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`Download DWG: ${draw.sheetNo} Rev ${revVal}`}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                        isDark
                                          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30'
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                      }`}
                                    >
                                      DWG
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className={`p-4 border-t flex items-center justify-between text-xs font-bold ${
        isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          <Info size={14} className="text-indigo-500" />
          <span>Tổng số bản vẽ: {filteredDrawings.length} / {registerData.drawings.length}</span>
        </div>
      </div>

      {/* OneDrive Explorer Modal Dialog */}
      {showOneDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowOneDriveModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className={`relative w-full max-w-4xl h-[620px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <Cloud className="text-indigo-500" size={24} />
                <div>
                  <h3 className="font-black text-base flex items-center gap-2">
                    OneDrive Cloud Explorer
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowOneDriveModal(false)}
                className={`p-1.5 rounded-lg hover:bg-slate-800/20 transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Folder structure and list would go here */}
            </div>
          </div>
        </div>
      )}

      {/* Uploader Modal */}
      {showUploaderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowUploaderModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold flex items-center gap-2">
                <UploadCloud className="text-blue-500" /> Tải lên bản vẽ (Google Drive)
              </h3>
              <button onClick={() => setShowUploaderModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <IssueUploader 
                projectKey={projectCode || registerData?.projectNo || 'UNKNOWN'}
                projectId={projectId}
                registerData={registerData}
                onUploadComplete={(fileData) => {
                  console.log('Uploaded successfully:', fileData);
                  // Refresh issue records to show new download buttons
                  if (projectId) {
                    import('../services/supabaseService').then(({ fetchIssuesByProject }) => {
                      fetchIssuesByProject(projectId).then(setIssueRecords);
                    });
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
