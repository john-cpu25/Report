import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Search, Upload, Download, FileSpreadsheet, Briefcase, MapPin, User, Hash, Info, FileText, X, Cloud, FolderOpen, ChevronRight, Loader2, Link2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export default function DrawingRegisterView({ initialData, isDark }) {
  const { getGraphToken } = useAuth();
  const [registerData, setRegisterData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUploadRow, setActiveUploadRow] = useState(null); // { sheetNo, type: 'PDF' | 'CAD' }
  const [bulkUploadResult, setBulkUploadResult] = useState(null); // { matchedCount, unmatchedNames: [] }

  // OneDrive Explorer State
  const [showOneDriveModal, setShowOneDriveModal] = useState(false);
  const [oneDriveItems, setOneDriveItems] = useState([]);
  const [oneDriveLoading, setOneDriveLoading] = useState(false);
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

  // Sync state if initialData prop changes (e.g., user selects a different project in sidebar)
  useEffect(() => {
    setRegisterData(initialData);
    setBulkUploadResult(null);
  }, [initialData]);

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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
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

        setRegisterData({
          projectNo,
          projectName,
          projectAddress,
          client,
          dateColumns,
          drawings
        });
        setBulkUploadResult(null); // Reset matching log on new register
      } catch (err) {
        alert('Lỗi đọc file Excel. Vui lòng kiểm tra lại cấu trúc file Drawing Register.');
        console.error(err);
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

  if (!registerData) {
    return (
      <div className={`p-8 text-center flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <FileSpreadsheet size={48} className="mb-4 text-indigo-500 animate-pulse" />
        <p className="font-bold">Chưa có dữ liệu bản vẽ cho dự án này.</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-600 transition-colors"
        >
          <Upload size={16} /> Tải lên Drawing Register (.xlsx)
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Metadata Panel (Top) */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 p-5 mb-5 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      } backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
            <Hash size={18} />
          </div>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Project No.</div>
            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{registerData.projectNo}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Briefcase size={18} />
          </div>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Project Name</div>
            <div className={`text-sm font-bold truncate max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'}`} title={registerData.projectName}>
              {registerData.projectName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Address</div>
            <div className={`text-sm font-bold truncate max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'}`} title={registerData.projectAddress}>
              {registerData.projectAddress}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <User size={18} />
          </div>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Client</div>
            <div className={`text-sm font-bold truncate max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'}`} title={registerData.client}>
              {registerData.client}
            </div>
          </div>
        </div>
      </div>

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

      {/* Toolbar / Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative flex items-center flex-1 max-w-md">
          <div className={`relative flex items-center w-full rounded-xl border-2 transition-all ${
            isDark ? 'bg-slate-900 border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-500'
          }`}>
            <Search size={16} className="absolute left-3.5 text-slate-500" />
            <input 
              type="text"
              placeholder="Tìm theo số hiệu hoặc tên bản vẽ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 bg-transparent outline-none text-sm font-semibold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* OneDrive Sync Group */}
          <div className="flex items-center rounded-xl p-0.5 border border-indigo-500/20 bg-indigo-500/5">
            <button 
              onClick={handleOneDriveBulkMatchTrigger}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-indigo-400 hover:bg-indigo-500/10`}
            >
              <Cloud size={14} /> Sync OneDrive Folder
            </button>
            <span className="w-px h-4 bg-indigo-500/20"></span>
            <button 
              onClick={handleOneDriveExportTrigger}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-emerald-400 hover:bg-indigo-500/10`}
              title="Xuất trực tiếp lên thư mục OneDrive"
            >
              <Cloud size={14} /> Export to OneDrive
            </button>
          </div>

          <button 
            onClick={() => bulkFileInputRef.current?.click()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${
              isDark 
              ? 'bg-slate-900 border-slate-800 text-blue-400 hover:border-slate-700 hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-blue-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Upload size={14} /> Bulk Load Local
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${
              isDark 
              ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:border-slate-700 hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-indigo-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Upload size={14} /> Import Register
          </button>
          
          <button 
            onClick={handleExportExcel}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${
              isDark 
              ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:border-slate-700 hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-emerald-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Download size={14} /> Export Register
          </button>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <input ref={rowFileInputRef} type="file" onChange={handleRowFileChange} className="hidden" />
          <input ref={bulkFileInputRef} type="file" multiple accept=".pdf,.dwg,.dxf" onChange={handleBulkFileUpload} className="hidden" />
        </div>
      </div>

      {/* Drawing List Spreadsheet */}
      <div className={`flex-1 overflow-auto rounded-2xl border transition-all ${
        isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white/40'
      } backdrop-blur-sm relative`}>
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)]">
            <table className="min-w-full table-fixed border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                  {/* Sticky headers for first 5 columns */}
                  <th scope="col" className="w-[120px] sticky left-0 z-30 px-4 py-3 text-left text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Sheet No.
                  </th>
                  <th scope="col" className="w-[280px] sticky left-[120px] z-30 px-4 py-3 text-left text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Sheet Name
                  </th>
                  <th scope="col" className="w-[85px] sticky left-[400px] z-30 px-4 py-3 text-center text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    Curr. Rev.
                  </th>
                  <th scope="col" className="w-[100px] sticky left-[485px] z-30 px-2 py-3 text-center text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    PDF File
                  </th>
                  <th scope="col" className="w-[100px] sticky left-[585px] z-30 px-2 py-3 text-center text-xs font-black uppercase tracking-wider border-b border-r border-slate-800/20"
                      style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}>
                    CAD File
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
                    <td className="sticky left-0 z-20 px-4 py-3 text-xs font-mono font-bold text-indigo-500 border-r border-slate-800/20"
                        style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }}>
                      {draw.sheetNo}
                    </td>
                    <td className={`sticky left-[120px] z-20 px-4 py-3 text-xs font-bold border-r border-slate-800/20 truncate ${
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
                    
                    {/* PDF File Sticky Cell */}
                    <td className="sticky left-[485px] z-20 px-2 py-3 text-center border-r border-slate-800/20"
                        style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }}>
                      {draw.pdfFile ? (
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleDownloadFile(draw, 'PDF')}
                            className="p-1 text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-all flex items-center justify-center"
                            title={`Tải xuống: ${draw.pdfFile.name}`}
                          >
                            <FileText size={16} />
                            <span className="text-[9px] font-black ml-0.5">PDF</span>
                          </button>
                          
                          <button 
                            onClick={() => handleOneDriveLinkTrigger(draw.sheetNo, 'PDF')}
                            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-all"
                            title="Thay đổi từ OneDrive"
                          >
                            <Cloud size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleRowUploadTrigger(draw.sheetNo, 'PDF')}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border border-dashed border-slate-800/60 hover:border-blue-500/50 hover:bg-blue-500/10 ${
                              isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}
                            title="Tải lên từ Máy tính"
                          >
                            <Upload size={14} />
                          </button>
                          <button 
                            onClick={() => handleOneDriveLinkTrigger(draw.sheetNo, 'PDF')}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-indigo-400`}
                            title="Chọn file từ OneDrive"
                          >
                            <Cloud size={14} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* CAD File Sticky Cell */}
                    <td className="sticky left-[585px] z-20 px-2 py-3 text-center border-r border-slate-800/20"
                        style={{ backgroundColor: isDark ? '#0b0f19' : '#ffffff' }}>
                      {draw.cadFile ? (
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleDownloadFile(draw, 'CAD')}
                            className="p-1 text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-all flex items-center justify-center"
                            title={`Tải xuống: ${draw.cadFile.name}`}
                          >
                            <FileSpreadsheet size={16} />
                            <span className="text-[9px] font-black ml-0.5">CAD</span>
                          </button>
                          
                          <button 
                            onClick={() => handleOneDriveLinkTrigger(draw.sheetNo, 'CAD')}
                            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-all"
                            title="Thay đổi từ OneDrive"
                          >
                            <Cloud size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleRowUploadTrigger(draw.sheetNo, 'CAD')}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border border-dashed border-slate-800/60 hover:border-amber-500/50 hover:bg-amber-500/10 ${
                              isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}
                            title="Tải lên từ Máy tính"
                          >
                            <Upload size={14} />
                          </button>
                          <button 
                            onClick={() => handleOneDriveLinkTrigger(draw.sheetNo, 'CAD')}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-indigo-400`}
                            title="Chọn file từ OneDrive"
                          >
                            <Cloud size={14} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Date issue values */}
                    {registerData.dateColumns.map((date, cIdx) => {
                      const revVal = draw.revisions[date];
                      return (
                        <td key={cIdx} className="px-3 py-3 text-center border-r border-slate-800/20 text-xs font-bold">
                          {revVal ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black uppercase tracking-wider ${
                              isNaN(revVal) 
                              ? (isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700')
                              : (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700')
                            }`}>
                              {revVal}
                            </span>
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
        <span>Drawing Register Sheet View</span>
      </div>

      {/* OneDrive Explorer Modal Dialog */}
      {showOneDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            onClick={() => setShowOneDriveModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Dialog Panel */}
          <div className={`relative w-full max-w-4xl h-[620px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <Cloud className="text-indigo-500" size={24} />
                <div>
                  <h3 className="font-black text-base flex items-center gap-2">
                    OneDrive Cloud Explorer
                    {isMockOneDrive && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">
                        Demo Mode (Simulated)
                      </span>
                    )}
                  </h3>
                  {/* Folder Breadcrumbs */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mt-0.5">
                    {folderPathHistory.map((folder, idx) => (
                      <React.Fragment key={folder.id}>
                        {idx > 0 && <ChevronRight size={10} />}
                        <span 
                          onClick={() => handleBreadcrumbClick(folder, idx)}
                          className="hover:text-indigo-500 cursor-pointer"
                        >
                          {folder.name}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowOneDriveModal(false)}
                className={`p-1.5 rounded-lg hover:bg-slate-800/20 transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Header: Search & Sync */}
            <div className={`p-3 border-b flex items-center justify-between gap-3 ${
              isDark ? 'border-slate-800/40 bg-slate-900/40' : 'border-slate-200/40 bg-slate-50/50'
            }`}>
              <div className="relative flex items-center flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Tìm tệp tin trong OneDrive..."
                  value={oneDriveSearch}
                  onChange={(e) => setOneDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOneDriveSearch()}
                  className={`w-full pl-9 pr-4 py-1.5 rounded-lg border-2 text-xs font-semibold outline-none transition-all ${
                    isDark ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {isMockOneDrive && (
                  <button 
                    onClick={() => { setIsMockOneDrive(false); loadOneDriveItems('root'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all border border-indigo-500/30"
                  >
                    <RefreshCw size={12} className="animate-spin" /> Thử kết nối Online
                  </button>
                )}
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Chế độ: {oneDriveActionType === 'link' ? 'Liên kết file bản vẽ' : oneDriveActionType === 'bulk_match' ? 'Khớp thư mục' : 'Xuất Register'}
                </span>
              </div>
            </div>

            {/* Folder / File List Container */}
            <div className="flex-1 overflow-auto p-4">
              {oneDriveLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-indigo-500">
                  <Loader2 size={36} className="animate-spin mb-2" />
                  <p className="text-xs font-bold tracking-wider uppercase">Đang đồng bộ OneDrive...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {/* Parent Folder navigation row */}
                  {folderPathHistory.length > 1 && (
                    <div 
                      onClick={() => handleBreadcrumbClick(folderPathHistory[folderPathHistory.length - 2], folderPathHistory.length - 2)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FolderOpen size={18} className="text-amber-500" />
                      <span className="text-xs font-bold">.. (Quay lại)</span>
                    </div>
                  )}

                  {/* List Items */}
                  {oneDriveItems.map(item => {
                    const isFolder = !!item.folder;
                    const isSelected = selectedOneDriveItem?.id === item.id;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedOneDriveItem(item)}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border-2 ${
                          isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10' 
                          : 'border-transparent ' + (isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100')
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isFolder ? (
                            <FolderOpen size={20} className="text-amber-500 shrink-0" />
                          ) : (
                            <FileText size={20} className="text-blue-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="text-xs font-bold truncate max-w-lg">{item.name}</p>
                            {!isFolder && item.size && (
                              <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {(item.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          {isFolder ? (
                            <span className="text-[10px] font-black uppercase text-amber-500 px-2 py-0.5 rounded bg-amber-500/10">Folder</span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-blue-500 px-2 py-0.5 rounded bg-blue-500/10">File</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {oneDriveItems.length === 0 && (
                    <div className="p-12 text-center text-xs font-bold text-slate-500">
                      Thư mục này trống.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className={`p-4 border-t flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="text-[11px] font-bold text-slate-400">
                {selectedOneDriveItem ? `Đang chọn: ${selectedOneDriveItem.name}` : 'Chưa chọn file/thư mục nào'}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowOneDriveModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    isDark ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hủy
                </button>

                {/* Conditional primary buttons depending on sync type */}
                {oneDriveActionType === 'link' && (
                  <button 
                    disabled={!selectedOneDriveItem || selectedOneDriveItem.folder}
                    onClick={() => handleSelectFileFromOneDrive(selectedOneDriveItem)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Link2 size={12} /> Liên kết Bản vẽ
                  </button>
                )}

                {oneDriveActionType === 'bulk_match' && (
                  <button 
                    onClick={handleBulkMatchFromOneDriveFolder}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors"
                  >
                    <RefreshCw size={12} /> Khớp Toàn Bộ Thư Mục Này
                  </button>
                )}

                {oneDriveActionType === 'export_register' && (
                  <button 
                    onClick={handleExportRegisterToOneDrive}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-colors"
                  >
                    <Download size={12} /> Lưu Register Tại Thư Mục Này
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
