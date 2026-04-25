import React, { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileText, BarChart3, Table as TableIcon, Download, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const DOW_MAP = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6' }
const PALETTE = ['#818cf8', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

const CSVProcessor = () => {
  const [data, setData] = useState([])
  const [view, setView] = useState('detail')
  const [filters, setFilters] = useState({ field: 'project', values: [] })
  const [fileName, setFileName] = useState('')
  const [pivotMetric, setPivotMetric] = useState('time1') // 'time1' or 'time2'

  const processDate = (val) => {
    if (!val) return null;
    
    // If it's already a Date object (from XLSX)
    if (val instanceof Date) {
      return new Date(val.getTime() + 7 * 3600000);
    }

    let str = val.toString().trim();
    if (str.startsWith('0001')) return null;

    try {
      // Standardize to ISO-like format
      let s = str.replace(' ', 'T');
      
      // Fix timezone suffix if it's like +00 or +07 (missing :00)
      // JS Date often requires +HH:mm format
      if (s.match(/[+-]\d{2}$/)) {
        s += ':00';
      }
      
      // Try parsing directly first
      let date = new Date(s);
      
      // If direct parsing fails, try adding 'Z' (only if no timezone info exists)
      if (isNaN(date.getTime())) {
        if (!s.includes('Z') && !s.match(/[+-]\d{2}/)) {
          date = new Date(s + 'Z');
        }
      }

      // Fallback: try removing fractional seconds if still invalid
      if (isNaN(date.getTime())) {
        let sNoMs = s.replace(/\.\d+(?=[+-Z]|$)/, '');
        date = new Date(sNoMs);
      }
      
      if (isNaN(date.getTime())) return null;
      
      // Adjust to GMT+7 (assuming input is UTC/GMT+0)
      return new Date(date.getTime() + 7 * 3600000);
    } catch (e) { 
      return null; 
    }
  }

  const formatTime = (date) => {
    if (!date) return '-';
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  }

  const formatDate = (date) => {
    if (!date) return '-';
    return date.toISOString().split('T')[0];
  }

  const getDurationMs = (start, end) => {
    if (!start || !end) return 0;
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? diff : 0;
  }

  const formatDuration = (ms) => {
    if (!ms) return '-';
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target.result
      const workbook = XLSX.read(bstr, { type: 'binary' })
      const wsname = workbook.SheetNames[0]
      const ws = workbook.Sheets[wsname]
      const rawJson = XLSX.utils.sheet_to_json(ws)
      processRawData(rawJson)
    }
    reader.readAsBinaryString(file)
  }

  const processRawData = (raw) => {
    try {
      const processed = raw.map((row, idx) => {
        try {
          const createdAtStr = row['created_at'] || row['Created At'] || ''
          const dateStartStr = row['date_start'] || row['Date Start'] || ''
          const dateCheckedStr = row['date_checked'] || row['Date Checked'] || ''
          const rawName = row['name'] || row['Name'] || ''
          const createdBy = row['create_by'] || row['Created By'] || ''
          
          const createdAt = processDate(createdAtStr)
          const dateStart = processDate(dateStartStr)
          const dateChecked = processDate(dateCheckedStr)
          
          const time1 = getDurationMs(createdAt, dateChecked)
          const time2 = getDurationMs(dateStart, dateChecked)
          
          const parts = rawName.toString().split(':')
          
          return {
            project: parts[0]?.trim() || '-',
            taskName: parts[1]?.trim() || '-',
            createdBy: createdBy || '-',
            day: formatDate(createdAt),
            createdAt,
            dateStart,
            dateChecked,
            time1,
            time2,
            time1Str: formatDuration(time1),
            time2Str: formatDuration(time2),
            dateObj: createdAt
          }
        } catch (err) {
          console.error(`Error processing row ${idx}:`, err, row)
          return null
        }
      }).filter(Boolean)
      setData(processed)
    } catch (err) {
      console.error('Critical error in processRawData:', err)
    }
  }


  const filteredData = useMemo(() => {
    if (filters.values.length === 0) return data;
    const selectedSet = new Set(filters.values.map(v => v.toLowerCase()));
    return data.filter(r => {
      let rowVal = '';
      if (filters.field === 'project') rowVal = r.project;
      else if (filters.field === 'task') rowVal = r.taskName;
      else if (filters.field === 'user') rowVal = r.createdBy;
      return selectedSet.has(rowVal.toLowerCase());
    })
  }, [data, filters])

  const uniqueFilterValues = useMemo(() => {
    const vals = new Set();
    data.forEach(r => {
      if (filters.field === 'project') vals.add(r.project);
      else if (filters.field === 'task') vals.add(r.taskName);
      else if (filters.field === 'user') vals.add(r.createdBy);
    });
    return Array.from(vals).sort();
  }, [data, filters.field])

  const toggleFilterValue = (val) => {
    setFilters(prev => {
      const nextValues = prev.values.includes(val)
        ? prev.values.filter(v => v !== val)
        : [...prev.values, val];
      return { ...prev, values: nextValues };
    });
  }

  const pivotData = useMemo(() => {
    const map = new Map()
    filteredData.forEach(row => {
      const key = `${row.project}||${row.taskName}`
      if (!map.has(key)) {
        map.set(key, { project: row.project, taskName: row.taskName, users: new Set(), days: {} })
      }
      const entry = map.get(key)
      if (row.createdBy !== '-') entry.users.add(row.createdBy)
      const dow = DOW_MAP[row.dateObj?.getUTCDay()]
      if (dow) {
        if (!entry.days[dow]) entry.days[dow] = []
        entry.days[dow].push({
          time1: row.time1,
          time2: row.time2,
          time1Str: row.time1Str,
          time2Str: row.time2Str
        })
      }
    })
    return Array.from(map.values()).map(r => ({
      ...r,
      createdBy: Array.from(r.users).join(', ')
    }))
  }, [filteredData])

  const stats = useMemo(() => {
    const pMap = new Map()
    data.forEach(r => {
      if (!pMap.has(r.project)) pMap.set(r.project, { tasks: new Set(), logs: 0, totalTime1: 0, totalTime2: 0 })
      const p = pMap.get(r.project)
      p.tasks.add(r.taskName)
      p.logs++
      p.totalTime1 += r.time1
      p.totalTime2 += r.time2
    })
    return Array.from(pMap.entries())
      .map(([name, v]) => ({ 
        name, 
        uniqueTasks: v.tasks.size, 
        totalLogs: v.logs,
        totalTime1: formatDuration(v.totalTime1),
        totalTime2: formatDuration(v.totalTime2)
      }))
      .sort((a, b) => b.uniqueTasks - a.uniqueTasks)
  }, [data])

  const chartData = {
    labels: stats.slice(0, 10).map(s => s.name),
    datasets: [{
      data: stats.slice(0, 10).map(s => s.uniqueTasks),
      backgroundColor: PALETTE,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 2,
      hoverOffset: 15
    }]
  }

  const barChartData = {
    labels: stats.slice(0, 15).map(s => s.name),
    datasets: [{
      label: 'Unique Tasks',
      data: stats.slice(0, 15).map(s => s.uniqueTasks),
      backgroundColor: stats.slice(0, 15).map((_, i) => PALETTE[i % PALETTE.length] + 'dd'),
      borderColor: stats.slice(0, 15).map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderRadius: 8,
    }]
  }

  return (
    <div className="space-y-8">
      {data.length === 0 ? (
        <div className="glass-panel p-20 text-center relative overflow-hidden group border-dashed border-2 border-white/10 hover:border-indigo-500/50 transition-all">
          <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
          <label htmlFor="csv-upload" className="cursor-pointer block">
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-indigo-500/10 rounded-3xl text-indigo-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-indigo-500/20">
                <Upload size={48} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight text-white">Import CSV Workflow</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">Drop your CSV files here to analyze project timelines and statistics.</p>
              </div>
              <div className="btn btn-primary mt-4">
                Choose File
              </div>
            </div>
          </label>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 p-1.5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 w-fit">
              {[
                { id: 'detail', icon: FileText, label: 'Detail View' },
                { id: 'pivot', icon: TableIcon, label: 'Weekly Pivot' },
                { id: 'analytics', icon: BarChart3, label: 'Analytics' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    view === t.id ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/25 scale-105' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <t.icon size={18} strokeWidth={2.5} />
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40 px-4 py-2 rounded-full border border-white/5">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {data.length} Records</span>
              <span className="w-px h-3 bg-white/10"></span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {stats.length} Projects</span>
            </div>
          </div>

          {view === 'detail' && (
            <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex flex-col md:flex-row gap-6 items-start">
                <div className="space-y-2 w-full md:w-[250px]">
                  <label className="text-[10px] text-indigo-400">Filter Type</label>
                  <select 
                    className="input bg-slate-950/50 border-white/10"
                    value={filters.field}
                    onChange={e => setFilters({ field: e.target.value, values: [] })}
                  >
                    <option value="project">PROJECT</option>
                    <option value="task">TASK NAME</option>
                    <option value="user">CREATE BY</option>
                  </select>
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <label className="text-[10px] text-emerald-400">Select Values ({filters.values.length} selected)</label>
                  <div className="max-h-[120px] overflow-auto p-3 bg-slate-950/50 border border-white/10 rounded-xl custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {uniqueFilterValues.map(v => (
                      <label key={v} className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filters.values.includes(v)}
                          onChange={() => toggleFilterValue(v)}
                          className="w-4 h-4 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 transition-all"
                        />
                        <span className={`text-xs truncate ${filters.values.includes(v) ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                          {v}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-6">
                  <button 
                    onClick={() => setFilters({ field: filters.field, values: [] })}
                    className="btn btn-secondary h-[42px] px-6 whitespace-nowrap"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-xl z-10">
                    <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] border-b border-white/5 whitespace-nowrap">
                      <th className="p-4">Project</th>
                      <th className="p-4">Task Name</th>
                      <th className="p-4">Create By</th>
                      <th className="p-4">DAY</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4">Date Start</th>
                      <th className="p-4">Date Checked</th>
                      <th className="p-4 text-emerald-400">Total Time 1</th>
                      <th className="p-4 text-indigo-400">Total Time 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredData.slice(0, 300).map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="p-4">
                          <span className="text-indigo-400 font-bold tracking-tight group-hover:text-indigo-300 transition-colors">{r.project}</span>
                        </td>
                        <td className="p-4 font-medium text-slate-200">{r.taskName}</td>
                        <td className="p-4 text-slate-400 text-[11px] font-mono">{r.createdBy}</td>
                        <td className="p-4 text-slate-400 font-bold">{r.day}</td>
                        <td className="p-4 text-slate-500 text-[11px]">{formatTime(r.createdAt)}</td>
                        <td className="p-4 text-slate-500 text-[11px]">{formatTime(r.dateStart)}</td>
                        <td className="p-4 text-slate-500 text-[11px] font-bold">{formatTime(r.dateChecked)}</td>
                        <td className="p-4 text-emerald-400 font-black text-xs">{r.time1Str}</td>
                        <td className="p-4 text-indigo-400 font-black text-xs">{r.time2Str}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'pivot' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-900/50 backdrop-blur-xl rounded-xl border border-white/5 w-fit">
                <button 
                  onClick={() => setPivotMetric('time1')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pivotMetric === 'time1' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  TOTAL TIME 1
                </button>
                <button 
                  onClick={() => setPivotMetric('time2')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${pivotMetric === 'time2' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  TOTAL TIME 2
                </button>
              </div>
              <div className="glass-panel overflow-auto max-h-[700px] border-white/5 shadow-2xl custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-2xl z-10 shadow-lg">
                    <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] border-b border-white/10">
                      <th className="p-6 min-w-[150px]">Project</th>
                      <th className="p-6 min-w-[200px]">Task</th>
                      <th className="p-6">Create By</th>
                      {['T2','T3','T4','T5','T6'].map(d => <th key={d} className="p-6 text-center">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {pivotData.map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.04] transition-all group">
                        <td className="p-6 font-bold text-indigo-400">{r.project}</td>
                        <td className="p-6 font-medium text-slate-200">{r.taskName}</td>
                        <td className="p-6 text-[11px] text-slate-500 font-mono group-hover:text-slate-400">{r.createdBy}</td>
                        {['T2','T3','T4','T5','T6'].map(d => (
                          <td key={d} className="p-6 text-center">
                            <div className="flex flex-col gap-1.5 items-center">
                              {(r.days[d] || []).map((t, idx) => (
                                <span key={idx} className={`${pivotMetric === 'time1' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'} px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-lg`}>
                                  {pivotMetric === 'time1' ? t.time1Str : t.time2Str}
                                </span>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'analytics' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel p-8 flex flex-col items-center bg-slate-900/60 border-white/5">
                  <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                    <span className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[10px] text-white">1</span>
                    Tasks per Project (Pie)
                  </h3>
                  <div className="w-full h-[350px] relative">
                    <Doughnut 
                      data={chartData} 
                      options={{ 
                        maintainAspectRatio: false, 
                        cutout: '75%', 
                        plugins: { 
                          legend: { display: false } 
                        } 
                      }} 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-white">{stats.length}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Projects</span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5">
                  <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                    <span className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center text-[10px] text-white">2</span>
                    Tasks per Project (Bar)
                  </h3>
                  <div className="w-full h-[350px]">
                    <Bar 
                      data={barChartData} 
                      options={{ 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { weight: 'bold' } } },
                          x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: 'bold', size: 10 } } }
                        }
                      }} 
                    />
                  </div>
                </motion.div>
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5 overflow-hidden">
                <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                  <span className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[10px] text-white">3</span>
                  Project Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                        <th className="pb-4 pr-4">#</th>
                        <th className="pb-4 pr-4">Project</th>
                        <th className="pb-4 pr-4 text-center">Tasks</th>
                        <th className="pb-4 pr-4 text-center text-emerald-400">Total Time 1</th>
                        <th className="pb-4 pr-4 text-center text-indigo-400">Total Time 2</th>
                        <th className="pb-4 text-right">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {stats.map((s, i) => {
                        const totalUnique = stats.reduce((acc, curr) => acc + curr.uniqueTasks, 0)
                        const pct = ((s.uniqueTasks / totalUnique) * 100).toFixed(1)
                        return (
                          <tr key={s.name} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 text-slate-500 font-mono text-xs">{i + 1}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full shadow-lg" style={{ background: PALETTE[i % PALETTE.length], boxShadow: `0 0 10px ${PALETTE[i % PALETTE.length]}44` }} />
                                <span className="font-bold text-slate-200">{s.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-center">
                              <span className="text-indigo-400 font-black text-lg">{s.uniqueTasks}</span>
                            </td>
                            <td className="py-4 text-center text-emerald-400 font-bold">{s.totalTime1}</td>
                            <td className="py-4 text-center text-indigo-400 font-bold">{s.totalTime2}</td>
                            <td className="py-4 text-right">
                              <span className="text-slate-500 text-xs font-bold">{pct}%</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default CSVProcessor
