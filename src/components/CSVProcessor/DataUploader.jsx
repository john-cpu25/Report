
import React from 'react';
import * as XLSX from 'xlsx';
import { Upload, RefreshCw, Database } from 'lucide-react';
import { processDate, getEffectiveDuration, formatDuration, formatDate, formatDateTime } from '../../utils/csvHelpers';

const DataUploader = ({ 
  fileName, 
  setFileName, 
  setData, 
  setUserData, 
  setRawTasks, 
  isLoading, 
  fetchSupabaseData, 
  lastFetched,
  fetchError
}) => {

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const rawJson = XLSX.utils.sheet_to_json(ws);
      processRawData(rawJson);
    };
    reader.readAsBinaryString(file);
  };

  const processRawData = (raw) => {
    try {
      const processed = raw.map((row, idx) => {
        try {
          const createdAtStr = row['created_at'] || row['Created At'] || '';
          const dateStartStr = row['date_start'] || row['Date Start'] || '';
          const dateEndStr = row['date_end'] || row['Date End'] || '';
          const dateCompleteStr = row['date_complete'] || row['Date Complete'] || '';
          const dateCheckedStr = row['date_checked'] || row['Date Checked'] || '';
          
          const rawName = row['name'] || row['Name'] || '';
          const createdBy = row['create_by'] || row['Created By'] || '';
          
          const createdAt = processDate(createdAtStr);
          const dateStart = processDate(dateStartStr);
          const dateEnd = processDate(dateEndStr);
          const dateComplete = processDate(dateCompleteStr);
          const dateChecked = processDate(dateCheckedStr);
          const dateStarted = processDate(row['date_started'] || row['Date Started'] || '');
          
          const time1 = getEffectiveDuration(dateStart, dateEnd);
          const time2 = getEffectiveDuration(dateStart, dateComplete);
          const time3 = getEffectiveDuration(dateStart, dateChecked);
          const time4 = getEffectiveDuration(dateStarted, dateChecked);
          const time5 = getEffectiveDuration(createdAt, dateChecked);
          
          const parts = rawName.toString().split(':');
          
          return {
            project: parts[0]?.trim() || '-',
            taskName: parts[1]?.trim() || '-',
            createdBy: createdBy || '-',
            day: formatDate(createdAt || dateStart),
            createdAt,
            dateStart,
            dateEnd,
            dateComplete,
            dateChecked,
            dateStarted,
            time1,
            time2,
            time3,
            time4,
            time5,
            time1Str: formatDuration(time1),
            time2Str: formatDuration(time2),
            time3Str: formatDuration(time3),
            time4Str: formatDuration(time4),
            time5Str: formatDuration(time5),
            dateObj: createdAt || dateStart
          };
        } catch (err) {
          console.error(`Error processing row ${idx}:`, err, row);
          return null;
        }
      }).filter(Boolean);
      setData(processed);
    } catch (err) {
      console.error('Critical error in processRawData:', err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between items-center sys-gap ocd-card">
      <div className="flex flex-wrap items-center sys-gap">
        <label className="relative group cursor-pointer">
          <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
          <div className="flex items-center gap-3 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-[8px] shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Upload size={18} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-widest">Upload Data</span>
          </div>
        </label>

        <button 
          onClick={fetchSupabaseData}
          disabled={isLoading}
          className={`flex items-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[8px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 ${isLoading ? 'animate-pulse' : ''}`}
        >
          {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">
            {isLoading ? 'Fetching...' : 'Sync Supabase'}
          </span>
        </button>

        {fileName && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-[8px] border border-white/10">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[200px]">
              {fileName}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center sys-gap text-[var(--text-muted)]">
        {lastFetched && (
          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
            Last Sync: {lastFetched.toLocaleTimeString()}
          </span>
        )}
        {fetchError && (
          <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-[8px]">
            {fetchError}
          </span>
        )}
      </div>
    </div>
  );
};

export default DataUploader;
