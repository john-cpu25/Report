import React, { useState, useMemo, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileText, BarChart3, Table as TableIcon, Download, Search, RefreshCw, Users, Database, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AtomicAnimation from './AtomicAnimation'
import { supabase } from './supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement)

const DOW_MAP = { 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr' }
const PALETTE = ['#818cf8', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

const CSVProcessor = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const [data, setData] = useState([])
  const [userData, setUserData] = useState([])
  const [userMap, setUserMap] = useState({})
  const [view, setView] = useState('detail')
  const [filters, setFilters] = useState({ field: 'project', values: [] })
  const [fileName, setFileName] = useState('')
  const [pivotMetric, setPivotMetric] = useState('time1')
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [analyticsMode, setAnalyticsMode] = useState('leader') // 'leader' | 'user'
  const [analyticsGranularity, setAnalyticsGranularity] = useState('month') // 'week' | 'month' | 'year'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedMetric, setSelectedMetric] = useState('time1') // 'time1' | 'time2' | 'time3'
  const [columnFilters, setColumnFilters] = useState({ project: '', taskName: '', user: '' })

  // Auto-fetch from Supabase on mount
  useEffect(() => { fetchSupabaseData() }, [])

  // Auto-reset selectedMetric when switching to views that don't support TIME 3
  useEffect(() => {
    const isUserMode = view === 'userTasks' || view === 'userPivot' || (view === 'analytics' && analyticsMode === 'user');
    if (isUserMode && selectedMetric === 'time3') {
      setSelectedMetric('time1');
    }
  }, [view, analyticsMode, selectedMetric])

  async function fetchSupabaseData() {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        supabase.from('NMK_Task').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('NMK_User').select('id, name, email, team, location')
      ])
      if (tasksRes.error) throw tasksRes.error
      if (usersRes.error) throw usersRes.error

      // Build user lookup map (index by both id and email for robustness)
      const uMap = {}
      const uTeamMap = {}
      usersRes.data.forEach(u => {
        const name = u.name || u.email || u.id
        uMap[u.id] = name
        uTeamMap[u.id] = u.team || '-'
        if (u.email) {
          uMap[u.email] = name
          uTeamMap[u.email] = u.team || '-'
        }
      })
      setUserMap(uMap)

      // Process leader data (same as old CSV logic)
      const leaderProcessed = tasksRes.data.map(row => {
        const createdAt = processDate(row.created_at)
        const dateStart = processDate(row.date_start)
        const dateEnd = processDate(row.date_end)
        const dateComplete = processDate(row.date_complete)
        const dateChecked = processDate(row.date_checked)
        const rawName = row.name || ''
        const parts = rawName.toString().split(':')
        const time1 = getEffectiveDuration(dateStart, dateEnd)
        const time2 = getEffectiveDuration(dateStart, dateComplete)
        const time3 = getEffectiveDuration(dateStart, dateChecked)
        
        return {
          project: parts[0]?.trim() || '-',
          taskName: parts[1]?.trim() || '-',
          createdBy: uMap[row.create_by] || row.create_by || '-',
          day: formatDate(createdAt || dateStart),
          createdAt, dateStart, dateEnd, dateComplete, dateChecked,
          time1, time2, time3,
          time1Str: formatDuration(time1),
          time2Str: formatDuration(time2),
          time3Str: formatDuration(time3),
          dateObj: createdAt || dateStart,
          team: uTeamMap[row.create_by] || '-'
        }
      }).filter(r => r.project !== '-')
      setData(leaderProcessed)

      // Process user task data (new perspective)
      const userProcessed = tasksRes.data.map(row => {
        const createdAt = processDate(row.created_at)
        const dateStarted = processDate(row.date_started)
        const dateChecked = processDate(row.date_checked)
        const rawName = row.name || ''
        const parts = rawName.toString().split(':')
        const time1 = getEffectiveDuration(dateStarted, dateChecked)
        const time2 = getEffectiveDuration(createdAt, dateChecked)
        
        return {
          userId: row.user_id,
          userName: uMap[row.user_id] || row.user_id || '-',
          project: parts[0]?.trim() || '-',
          taskName: parts[1]?.trim() || '-',
          createdAt, dateStarted, dateChecked,
          createdAtStr: formatDateTime(createdAt),
          dateStartedStr: formatDateTime(dateStarted),
          dateCheckedStr: formatDateTime(dateChecked),
          time1, time2,
          time1Str: formatDuration(time1),
          time2Str: formatDuration(time2),
          dateObj: createdAt,
          team: uTeamMap[row.user_id] || '-'
        }
      }).filter(r => r.project !== '-')
      setUserData(userProcessed)

      setLastFetched(new Date())
      setFileName(`Supabase Live — ${tasksRes.data.length} tasks`)
    } catch (err) {
      console.error('Supabase fetch error:', err)
      setFetchError(err.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }


  function processDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
    let str = val.toString().trim();
    if (/^\d{5}(\.\d+)?$/.test(str)) {
      const num = parseFloat(str);
      return new Date((num - 25569) * 86400 * 1000);
    }
    if (str.startsWith('0001')) return null;
    try {
      let s = str.replace(' ', 'T');
      if (s.match(/[+-]\d{2}$/)) s += ':00';
      let date = new Date(s);
      if (isNaN(date.getTime())) {
        if (!s.includes('Z') && !s.match(/[+-]\d{2}/)) date = new Date(s + 'Z');
      }
      if (isNaN(date.getTime())) {
        let sNoMs = s.replace(/\.\d+(?=[+-Z]|$)/, '');
        date = new Date(sNoMs);
      }
      if (isNaN(date.getTime())) date = new Date(str);
      if (isNaN(date.getTime())) return null;
      
      // Add 7 hours for UTC+7 (Vietnam Time)
      return new Date(date.getTime() + 7 * 60 * 60 * 1000);
    } catch (e) { return null; }
  }

  function formatTime(date) {
    if (!date) return '-';
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDate(date) {
    if (!date) return '-';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getEffectiveDuration(start, end) {
    if (!start || !end || end <= start) return 0;
    let duration = end.getTime() - start.getTime();
    const lunchStart = new Date(start);
    lunchStart.setUTCHours(12, 30, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setUTCHours(13, 30, 0, 0);
    const overlapStart = Math.max(start.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(end.getTime(), lunchEnd.getTime());
    if (overlapEnd > overlapStart) duration -= (overlapEnd - overlapStart);
    return duration > 0 ? duration : 0;
  }

  function formatDuration(ms) {
    if (!ms || ms <= 0) return '-';
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }

  function formatDateTime(date) {
    if (!date) return '-';
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const mi = String(date.getUTCMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
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
          const dateEndStr = row['date_end'] || row['Date End'] || ''
          const dateCompleteStr = row['date_complete'] || row['Date Complete'] || ''
          const dateCheckedStr = row['date_checked'] || row['Date Checked'] || ''
          
          const rawName = row['name'] || row['Name'] || ''
          const createdBy = row['create_by'] || row['Created By'] || ''
          
          const createdAt = processDate(createdAtStr)
          const dateStart = processDate(dateStartStr)
          const dateEnd = processDate(dateEndStr)
          const dateComplete = processDate(dateCompleteStr)
          const dateChecked = processDate(dateCheckedStr)
          
          // TIME 1 = date_end - date_start
          // TIME 2 = date_complete - date_start
          // TIME 3 = date_checked - date_start
          const time1 = getEffectiveDuration(dateStart, dateEnd)
          const time2 = getEffectiveDuration(dateStart, dateComplete)
          const time3 = getEffectiveDuration(dateStart, dateChecked)
          
          const parts = rawName.toString().split(':')
          
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
            time1,
            time2,
            time3,
            time1Str: formatDuration(time1),
            time2Str: formatDuration(time2),
            time3Str: formatDuration(time3),
            dateObj: createdAt || dateStart
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
    return data.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!r.project.toLowerCase().includes(q) && !r.taskName.toLowerCase().includes(q) && !r.createdBy.toLowerCase().includes(q)) return false
      }
      if (selectedTeam !== 'ALL' && r.team !== selectedTeam) return false
      if (columnFilters.project && !r.project.toLowerCase().includes(columnFilters.project.toLowerCase())) return false
      if (columnFilters.taskName && !r.taskName.toLowerCase().includes(columnFilters.taskName.toLowerCase())) return false
      if (columnFilters.user && !r.createdBy.toLowerCase().includes(columnFilters.user.toLowerCase())) return false

      if (dateRange.start && r.dateObj && r.dateObj < new Date(dateRange.start)) return false
      if (dateRange.end) {
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        if (r.dateObj && r.dateObj > end) return false
      }
      if (filters.values.length > 0) {
        const selectedSet = new Set(filters.values.map(v => v.toLowerCase()))
        let rowVal = filters.field === 'project' ? r.project : filters.field === 'task' ? r.taskName : r.createdBy
        if (!selectedSet.has(rowVal.toLowerCase())) return false
      }
      return true
    })
  }, [data, filters, searchQuery, dateRange, columnFilters])

  const filteredUserData = useMemo(() => {
    return userData.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!r.project.toLowerCase().includes(q) && !r.taskName.toLowerCase().includes(q) && !r.userName.toLowerCase().includes(q)) return false
      }
      if (selectedTeam !== 'ALL' && r.team !== selectedTeam) return false
      if (columnFilters.project && !r.project.toLowerCase().includes(columnFilters.project.toLowerCase())) return false
      if (columnFilters.taskName && !r.taskName.toLowerCase().includes(columnFilters.taskName.toLowerCase())) return false
      if (columnFilters.user && !r.userName.toLowerCase().includes(columnFilters.user.toLowerCase())) return false

      if (dateRange.start && r.dateObj && r.dateObj < new Date(dateRange.start)) return false
      if (dateRange.end) {
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        if (r.dateObj && r.dateObj > end) return false
      }
      if (filters.values.length > 0) {
        const selectedSet = new Set(filters.values.map(v => v.toLowerCase()))
        let rowVal = filters.field === 'project' ? r.project : filters.field === 'task' ? r.taskName : r.userName
        if (!selectedSet.has(rowVal.toLowerCase())) return false
      }
      return true
    })
  }, [userData, filters, searchQuery, dateRange, columnFilters])

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

  const columnOptions = useMemo(() => {
    const projects = new Set();
    const tasks = new Set();
    const users = new Set();
    
    // Collect from Leader data
    data.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasks.add(r.taskName);
      if (r.createdBy && r.createdBy !== '-') users.add(r.createdBy);
    });

    // Collect from User data
    userData.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasks.add(r.taskName);
      if (r.userName && r.userName !== '-') users.add(r.userName);
    });

    return {
      projects: Array.from(projects).sort(),
      tasks: Array.from(tasks).sort(),
      users: Array.from(users).sort()
    };
  }, [data, userData])

  const teamOptions = useMemo(() => {
    const teams = new Set();
    data.forEach(r => { if (r.team && r.team !== '-') teams.add(r.team) });
    userData.forEach(r => { if (r.team && r.team !== '-') teams.add(r.team) });
    return ['ALL', ...Array.from(teams).sort()];
  }, [data, userData])

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
          time3: row.time3,
          time1Str: row.time1Str,
          time2Str: row.time2Str,
          time3Str: row.time3Str
        })
      }
    })
    return Array.from(map.values()).map(r => ({
      ...r,
      createdBy: Array.from(r.users).join(', ')
    }))
  }, [filteredData])

  const projectStats = useMemo(() => {
    const pMap = new Map()
    const targetData = analyticsMode === 'leader' ? filteredData : filteredUserData
    targetData.forEach(r => {
      if (!pMap.has(r.project)) pMap.set(r.project, { tasks: new Set(), logs: 0, t1: 0, t2: 0, t3: 0 })
      const p = pMap.get(r.project)
      p.tasks.add(r.taskName)
      p.logs++
      p.t1 += r.time1 || 0
      p.t2 += r.time2 || 0
      p.t3 += r.time3 || 0
    })
    return Array.from(pMap.entries()).map(([name, v]) => ({
      name, uniqueTasks: v.tasks.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2), totalTime3: formatDuration(v.t3),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData, filteredUserData, analyticsMode])

  const userStats = useMemo(() => {
    const uMap = new Map()
    const targetData = analyticsMode === 'leader' ? filteredData : filteredUserData
    targetData.forEach(r => {
      const uName = analyticsMode === 'leader' ? r.createdBy : r.userName
      if (!uMap.has(uName)) uMap.set(uName, { projects: new Set(), logs: 0, t1: 0, t2: 0, t3: 0 })
      const u = uMap.get(uName)
      u.projects.add(r.project)
      u.logs++
      u.t1 += r.time1 || 0
      u.t2 += r.time2 || 0
      u.t3 += r.time3 || 0
    })
    return Array.from(uMap.entries()).map(([name, v]) => ({
      name, uniqueProjects: v.projects.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2), totalTime3: formatDuration(v.t3),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData, filteredUserData, analyticsMode])

  const periodicStats = useMemo(() => {
    const mMap = new Map()
    const targetData = analyticsMode === 'leader' ? filteredData : filteredUserData
    targetData.forEach(r => {
      if (!r.dateObj) return
      let key = ''
      if (analyticsGranularity === 'week') {
        const d = new Date(r.dateObj)
        d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1)
        key = `Week ${d.getUTCDate()}/${d.getUTCMonth()+1}`
      } else if (analyticsGranularity === 'year') {
        key = `${r.dateObj.getUTCFullYear()}`
      } else {
        key = `${r.dateObj.getUTCFullYear()}-${String(r.dateObj.getUTCMonth() + 1).padStart(2, '0')}`
      }
      
      if (!mMap.has(key)) mMap.set(key, { logs: 0, t1: 0, t2: 0, t3: 0 })
      const m = mMap.get(key)
      m.logs++
      m.t1 += r.time1 || 0
      m.t2 += r.time2 || 0
      m.t3 += r.time3 || 0
    })
    return Array.from(mMap.entries())
      .map(([name, v]) => ({ name, ...v, rawTime1: v.t1 }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredData, filteredUserData, analyticsMode, analyticsGranularity])

  const userPivotData = useMemo(() => {
    const map = new Map()
    filteredUserData.forEach(row => {
      const key = `${row.userName}||${row.project}||${row.taskName}`
      if (!map.has(key)) {
        map.set(key, { userName: row.userName, project: row.project, taskName: row.taskName, days: {} })
      }
      const entry = map.get(key)
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
    return Array.from(map.values())
  }, [filteredUserData])

  const chartData = {
    labels: projectStats.slice(0, 10).map(s => s.name),
    datasets: [{
      data: projectStats.slice(0, 10).map(s => s.rawTime1 / 3600000),
      backgroundColor: PALETTE,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 2,
      hoverOffset: 15
    }]
  }

  const barChartData = {
    labels: userStats.slice(0, 10).map(s => s.name.split('@')[0]),
    datasets: [{
      label: analyticsMode === 'leader' ? 'Hours Worked (Time 1)' : 'Processing Time (Time 1)',
      data: userStats.slice(0, 10).map(s => s.rawTime1 / 3600000),
      backgroundColor: userStats.slice(0, 10).map((_, i) => PALETTE[i % PALETTE.length] + 'dd'),
      borderColor: userStats.slice(0, 10).map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderRadius: 8,
    }]
  }

  const periodicChartData = {
    labels: periodicStats.map(s => s.name),
    datasets: [{
      label: analyticsMode === 'leader' ? 'Total Leader Hours' : 'Total User Hours',
      data: periodicStats.map(s => s.rawTime1 / 3600000),
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: '#6366f1',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  return (
    <div className="space-y-8">
      {isLoading && data.length === 0 ? (
        <div className="glass-panel p-20 text-center relative overflow-hidden border-2 border-indigo-500/20">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-indigo-500/10 rounded-3xl text-indigo-400 animate-pulse shadow-2xl shadow-indigo-500/20">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">Connecting to Supabase...</h3>
              <p className="text-slate-400 text-sm">Fetching tasks and user data in real-time.</p>
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} className="w-1/2 h-full bg-indigo-500 rounded-full" />
            </div>
          </div>
        </div>
      ) : fetchError && data.length === 0 ? (
        <div className="glass-panel p-20 text-center relative overflow-hidden border-2 border-rose-500/20">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-rose-500/10 rounded-3xl text-rose-400 shadow-2xl shadow-rose-500/20">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">Connection Failed</h3>
              <p className="text-rose-400 text-sm max-w-md mx-auto">{fetchError}</p>
            </div>
            <button onClick={fetchSupabaseData} className="btn btn-primary mt-4 flex items-center gap-2">
              <RefreshCw size={16} /> Retry Connection
            </button>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="glass-panel p-20 text-center relative overflow-hidden group border-dashed border-2 border-white/10 hover:border-indigo-500/50 transition-all">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-indigo-500/10 rounded-3xl text-indigo-400 group-hover:scale-110 transition-all duration-500 shadow-2xl shadow-indigo-500/20">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">No Data Available</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">No tasks found in Supabase. Click reload to try again.</p>
            </div>
            <button onClick={fetchSupabaseData} className="btn btn-primary mt-4 flex items-center gap-2">
              <RefreshCw size={16} /> Reload Data
            </button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 p-1.5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 w-fit">
              {[
                { id: 'detail', icon: FileText, label: 'Leader View' },
                { id: 'userTasks', icon: Users, label: 'User Tasks' },
                { id: 'pivot', icon: TableIcon, label: 'Leader Pivot' },
                { id: 'userPivot', icon: Calendar, label: 'User Weekly' },
                { id: 'analytics', icon: BarChart3, label: 'Analytics' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    view === t.id ? (t.id === 'userTasks' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 scale-105' : 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/25 scale-105') : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <t.icon size={18} strokeWidth={2.5} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-grow max-w-2xl group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Data Intelligence..." 
                  className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-4 pl-14 pr-32 text-base font-bold text-white focus:border-indigo-500/50 focus:bg-slate-900/60 transition-all outline-none shadow-2xl placeholder:text-slate-600"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <select 
                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 text-[10px] font-black text-indigo-400 outline-none cursor-pointer hover:bg-indigo-500/20 transition-all uppercase tracking-widest"
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                  >
                    {teamOptions.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ALL TEAMS' : t}</option>)}
                  </select>
                  <div className="px-3 py-1.5 bg-white/5 rounded-xl text-[10px] font-black text-slate-400 border border-white/10 uppercase tracking-widest">Global</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchSupabaseData}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                    isLoading 
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 cursor-wait' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-95'
                  }`}
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Loading...' : 'Reload'}
                </button>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40 px-5 py-3 rounded-2xl border border-white/5 shadow-xl">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span> Live</span>
                  <span className="w-px h-4 bg-white/10"></span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span> {data.length} Records</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-800/80 border border-indigo-500/20 rounded-2xl px-4 py-2 shadow-2xl backdrop-blur-xl group focus-within:border-indigo-500/50 transition-all">
                    <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                      <Calendar size={16} className="text-indigo-400" />
                      <input 
                        type="month" 
                        id="month-picker"
                        className="bg-transparent text-[11px] font-black text-indigo-400 outline-none [color-scheme:dark] cursor-pointer uppercase tracking-wider"
                        onChange={e => {
                          if (!e.target.value) return;
                          const [y, m] = e.target.value.split('-').map(Number);
                          const start = new Date(y, m - 1, 1);
                          const end = new Date(y, m, 0);
                          
                          const formatYMD = (d) => {
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          };
                          
                          setDateRange({ start: formatYMD(start), end: formatYMD(end) });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3 pl-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Start Date</span>
                        <input 
                          type="date" 
                          className="bg-transparent text-[11px] font-black text-white outline-none [color-scheme:dark] cursor-pointer hover:text-indigo-400 transition-colors"
                          value={dateRange.start}
                          onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
                        />
                      </div>
                      <div className="h-6 w-px bg-white/5 mx-1" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">End Date</span>
                        <input 
                          type="date" 
                          className="bg-transparent text-[11px] font-black text-white outline-none [color-scheme:dark] cursor-pointer hover:text-indigo-400 transition-colors"
                          value={dateRange.end}
                          onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-2xl border border-white/5 shadow-xl">
                    {[
                      { label: 'Week', start: () => {
                        const d = new Date();
                        d.setDate(d.getDate() - d.getDay() + 1);
                        return d.toISOString().split('T')[0];
                      }},
                      { label: 'Month', start: () => {
                        const d = new Date();
                        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                      }},
                      { label: 'Year', start: () => {
                        const d = new Date();
                        return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
                      }}
                    ].map(p => {
                      const isActive = false; // Add logic if needed
                      return (
                        <button 
                          key={p.label}
                          onClick={() => {
                            const start = p.start();
                            const end = new Date().toISOString().split('T')[0];
                            setDateRange({ start, end });
                            
                            // Update month picker if it's a month preset
                            if (p.label === 'Month') {
                              const monthInput = document.getElementById('month-picker');
                              if (monthInput) monthInput.value = start.substring(0, 7);
                            }
                          }}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 hover:shadow-lg transition-all active:scale-95"
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/40 px-5 py-2.5 rounded-2xl border border-white/5 shadow-xl">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span> {projectStats.length} Projects</span>
                </div>
              </div>

              {/* Week Selector Section (Visible when month is picked) */}
              {(() => {
                const monthVal = document.getElementById('month-picker')?.value;
                if (!monthVal) return null;
                
                const [y, m] = monthVal.split('-').map(Number);
                const firstDay = new Date(y, m - 1, 1);
                const lastDay = new Date(y, m, 0);
                
                // Simplified week generation without date-fns for now to ensure compatibility
                const weeks = [];
                let current = new Date(firstDay);
                // Move to first Monday
                while(current.getDay() !== 1) current.setDate(current.getDate() - 1);
                
                while(current <= lastDay || (current.getMonth() === m - 1)) {
                  const start = new Date(current);
                  const end = new Date(current);
                  end.setDate(end.getDate() + 6);
                  
                  // Only include weeks that overlap with the selected month
                  if (start <= lastDay && end >= firstDay) {
                    weeks.push({ start, end });
                  }
                  current.setDate(current.getDate() + 7);
                  if (current > lastDay && current.getMonth() !== m - 1) break;
                }

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10"
                  >
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mr-2">Select Week:</span>
                    {weeks.map((w, i) => {
                      const startStr = w.start.toISOString().split('T')[0];
                      const endStr = w.end.toISOString().split('T')[0];
                      const isActive = dateRange.start === startStr && dateRange.end === endStr;
                      
                      // Calculate week of year (simple)
                      const firstJan = new Date(w.start.getFullYear(), 0, 1);
                      const weekNum = Math.ceil((((w.start.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);

                      return (
                        <button
                          key={i}
                          onClick={() => setDateRange({ start: startStr, end: endStr })}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            isActive
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                              : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-indigo-500/30 hover:text-indigo-300'
                          }`}
                        >
                          W{weekNum} <span className="opacity-40 ml-1 font-bold">({w.start.getDate()}/{w.start.getMonth()+1} - {w.end.getDate()}/{w.end.getMonth()+1})</span>
                        </button>
                      );
                    })}
                  </motion.div>
                );
              })()}
            </div>
          </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Sidebar Toggle Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
                  />
                  <motion.aside 
                    initial={{ x: -400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -400, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed left-0 top-0 h-screen w-[320px] z-50 p-6 overflow-y-auto custom-scrollbar"
                  >
                    <div className="glass-panel p-6 border-white/10 shadow-2xl bg-slate-900/90 backdrop-blur-2xl h-full">
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                          <h2 className="text-lg font-black text-white tracking-tight uppercase italic">Filter Engine</h2>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-black text-indigo-400 uppercase tracking-widest">Filter Type</label>
                          <select 
                            className="input bg-slate-950/50 border-white/10 text-sm font-bold h-12"
                            value={filters.field}
                            onChange={e => setFilters({ field: e.target.value, values: [] })}
                          >
                            <option value="project">PROJECT</option>
                            <option value="task">TASK NAME</option>
                            <option value="user">CREATE BY</option>
                          </select>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-black text-emerald-400 uppercase tracking-widest flex justify-between">
                            Select Values
                            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">{filters.values.length}</span>
                          </label>
                          <div className="max-h-[350px] overflow-auto p-2 bg-slate-950/50 border border-white/10 rounded-2xl custom-scrollbar space-y-1">
                            {uniqueFilterValues.map(v => (
                              <label key={v} className={`flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-2.5 rounded-xl transition-all ${filters.values.includes(v) ? 'bg-indigo-500/10' : ''}`}>
                                <input 
                                  type="checkbox" 
                                  checked={filters.values.includes(v)}
                                  onChange={() => toggleFilterValue(v)}
                                  className="w-5 h-5 rounded-lg border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500 transition-all"
                                />
                                <span className={`text-[13px] leading-tight ${filters.values.includes(v) ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>
                                  {v}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-black text-violet-400 uppercase tracking-widest">Quick Presets</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'This Week', start: () => {
                                const d = new Date();
                                d.setDate(d.getDate() - d.getDay() + 1);
                                return d.toISOString().split('T')[0];
                              }},
                              { label: 'This Month', start: () => {
                                const d = new Date();
                                return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                              }},
                              { label: 'Last Month', start: () => {
                                const d = new Date();
                                return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
                              }},
                              { label: 'Last 3 Months', start: () => {
                                const d = new Date();
                                return new Date(d.getFullYear(), d.getMonth() - 3, 1).toISOString().split('T')[0];
                              }}
                            ].map(p => (
                              <button 
                                key={p.label}
                                onClick={() => setDateRange({ start: p.start(), end: new Date().toISOString().split('T')[0] })}
                                className="bg-slate-950/50 border border-white/5 hover:border-violet-500/50 text-[10px] font-black py-2 rounded-lg transition-all"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setFilters({ field: filters.field, values: [] });
                            setSearchQuery('');
                            setDateRange({ start: '', end: '' });
                          }}
                          className="btn btn-secondary w-full py-4 text-xs font-bold uppercase tracking-widest border-white/10"
                        >
                          Reset Filters
                        </button>
                        
                        <div className="pt-4 border-t border-white/5">
                          <AtomicAnimation filters={filters} />
                        </div>
                      </div>
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            <div className="flex-1 w-full space-y-8">
              {view === 'detail' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5">
                        {['time1', 'time2', 'time3'].map(m => (
                          <button 
                            key={m}
                            disabled={m === 'time3' && (view === 'userTasks' || view === 'userPivot')}
                            onClick={() => setSelectedMetric(m)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              selectedMetric === m ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 
                              (m === 'time3' && (view === 'userTasks' || view === 'userPivot')) ? 'opacity-20 cursor-not-allowed text-slate-700' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredData.length} entries</span>
                    </div>
                  </div>
                  <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
                          <tr className="text-slate-400 font-bold uppercase text-[12px] tracking-[0.2em] whitespace-nowrap">
                            <th className="p-5">
                              <div className="flex flex-col gap-2">
                                <span>Project</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                  value={columnFilters.project}
                                  onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                                >
                                  <option value="">All Projects</option>
                                  {columnOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5 min-w-[200px]">
                              <div className="flex flex-col gap-2">
                                <span>Task Name</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none max-w-[250px]"
                                  value={columnFilters.taskName}
                                  onChange={e => setColumnFilters(prev => ({...prev, taskName: e.target.value}))}
                                >
                                  <option value="">All Tasks</option>
                                  {columnOptions.tasks.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5">
                              <div className="flex flex-col gap-2">
                                <span>User</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                  value={columnFilters.user}
                                  onChange={e => setColumnFilters(prev => ({...prev, user: e.target.value}))}
                                >
                                  <option value="">All Users</option>
                                  {columnOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5">Start</th>
                            <th className="p-5">End</th>
                            <th className="p-5">Done</th>
                            <th className="p-5 text-center bg-emerald-500/5">T1</th>
                            <th className="p-5 text-center bg-indigo-500/5">T2</th>
                            <th className="p-5 text-center bg-violet-500/5">T3</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {filteredData.map((r, i) => (
                            <tr key={i} className="hover:bg-white/[0.04] transition-all group border-l-2 border-transparent hover:border-indigo-500">
                              <td className="p-5">
                                <span className="text-indigo-400 font-bold text-sm tracking-tight">{r.project}</span>
                              </td>
                              <td className="p-5">
                                <div className="font-medium text-slate-200 line-clamp-2" title={r.taskName}>{r.taskName}</div>
                              </td>
                              <td className="p-5 text-slate-500 text-xs font-mono">{r.createdBy?.split('@')[0]}</td>
                              <td className="p-5 text-slate-400 text-xs">{formatTime(r.dateStart)}</td>
                              <td className="p-5 text-slate-400 text-xs">{formatTime(r.dateEnd)}</td>
                              <td className="p-5 text-slate-400 text-xs">{formatTime(r.dateComplete)}</td>
                              <td className={`p-5 text-center font-bold text-emerald-400 ${selectedMetric === 'time1' ? 'bg-emerald-500/10 scale-110 shadow-lg z-10 relative rounded-lg' : 'opacity-40'}`}>{r.time1Str}</td>
                              <td className={`p-5 text-center font-bold text-indigo-400 ${selectedMetric === 'time2' ? 'bg-indigo-500/10 scale-110 shadow-lg z-10 relative rounded-lg' : 'opacity-40'}`}>{r.time2Str}</td>
                              <td className={`p-5 text-center font-bold text-violet-400 ${selectedMetric === 'time3' ? 'bg-violet-500/10 scale-110 shadow-lg z-10 relative rounded-lg' : 'opacity-40'}`}>{r.time3Str}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {view === 'userTasks' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5">
                        {['time1', 'time2'].map(m => (
                          <button 
                            key={m}
                            onClick={() => setSelectedMetric(m)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedMetric === m ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredUserData.length} entries</span>
                    </div>
                  </div>
                  <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
                          <tr className="text-slate-400 font-bold uppercase text-[12px] tracking-[0.2em] whitespace-nowrap">
                            <th className="p-5">
                              <div className="flex flex-col gap-2">
                                <span>User</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                  value={columnFilters.user}
                                  onChange={e => setColumnFilters(prev => ({...prev, user: e.target.value}))}
                                >
                                  <option value="">All Users</option>
                                  {columnOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5">
                              <div className="flex flex-col gap-2">
                                <span>Project</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                  value={columnFilters.project}
                                  onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                                >
                                  <option value="">All Projects</option>
                                  {columnOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5 min-w-[200px]">
                              <div className="flex flex-col gap-2">
                                <span>Task Name</span>
                                <select 
                                  className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none max-w-[250px]"
                                  value={columnFilters.taskName}
                                  onChange={e => setColumnFilters(prev => ({...prev, taskName: e.target.value}))}
                                >
                                  <option value="">All Tasks</option>
                                  {columnOptions.tasks.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            </th>
                            <th className="p-5">Created At</th>
                            <th className="p-5">Started</th>
                            <th className="p-5">Checked</th>
                            <th className="p-5 text-center bg-emerald-500/5">T1</th>
                            <th className="p-5 text-center bg-indigo-500/5">T2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {filteredUserData.map((r, i) => (
                            <tr key={i} className="hover:bg-white/[0.04] transition-all group border-l-2 border-transparent hover:border-emerald-500">
                              <td className="p-5 font-bold text-emerald-400 truncate max-w-[120px]">{r.userName}</td>
                              <td className="p-5 font-bold text-indigo-400 truncate max-w-[120px]">{r.project}</td>
                              <td className="p-5">
                                <div className="font-medium text-slate-200 line-clamp-2" title={r.taskName}>{r.taskName}</div>
                              </td>
                              <td className="p-5 text-slate-500 text-[11px] font-mono whitespace-nowrap">{r.createdAtStr}</td>
                              <td className="p-5 text-slate-400 text-[11px] font-mono whitespace-nowrap">{r.dateStartedStr}</td>
                              <td className="p-5 text-white font-bold text-[11px] font-mono whitespace-nowrap">{r.dateCheckedStr}</td>
                              <td className={`p-5 text-center font-bold text-emerald-400 ${selectedMetric === 'time1' ? 'bg-emerald-500/10 scale-110 shadow-lg z-10 relative rounded-lg' : 'opacity-40'}`}>{r.time1Str}</td>
                              <td className={`p-5 text-center font-bold text-indigo-400 ${selectedMetric === 'time2' ? 'bg-indigo-500/10 scale-110 shadow-lg z-10 relative rounded-lg' : 'opacity-40'}`}>{r.time2Str}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {view === 'pivot' && (
                <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-slate-900/50 backdrop-blur-xl rounded-xl border border-white/5 w-fit">
                    {['time1', 'time2', 'time3'].map(m => (
                      <button 
                        key={m}
                        onClick={() => setSelectedMetric(m)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedMetric === m ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="glass-panel overflow-auto max-h-[700px] border-white/5 shadow-2xl custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-2xl z-10 shadow-lg">
                        <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] border-b border-white/10">
                          <th className="p-6 min-w-[150px]">
                            <div className="flex flex-col gap-2">
                              <span>Project</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                value={columnFilters.project}
                                onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                              >
                                <option value="">All Projects</option>
                                {columnOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </th>
                          <th className="p-6 min-w-[200px]">
                            <div className="flex flex-col gap-2">
                              <span>Task</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none max-w-[250px]"
                                value={columnFilters.taskName}
                                onChange={e => setColumnFilters(prev => ({...prev, taskName: e.target.value}))}
                              >
                                <option value="">All Tasks</option>
                                {columnOptions.tasks.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </th>
                          <th className="p-6">
                            <div className="flex flex-col gap-2">
                              <span>Create By</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                value={columnFilters.user}
                                onChange={e => setColumnFilters(prev => ({...prev, user: e.target.value}))}
                              >
                                <option value="">All Users</option>
                                {columnOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </th>
                          {['Mo','Tu','We','Th','Fr'].map(d => <th key={d} className="p-6 text-center">{d}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {pivotData.map((r, i) => (
                          <tr key={i} className="hover:bg-white/[0.04] transition-all group">
                            <td className="p-6 font-bold text-indigo-400">{r.project}</td>
                            <td className="p-6 font-medium text-slate-200">{r.taskName}</td>
                            <td className="p-6 text-[11px] text-slate-500 font-mono group-hover:text-slate-400">{r.createdBy}</td>
                            {['Mo','Tu','We','Th','Fr'].map(d => (
                              <td key={d} className="p-6 text-center">
                                <div className="flex flex-col gap-1.5 items-center">
                                  {(r.days[d] || []).map((t, idx) => (
                                    <span key={idx} className={`${
                                      selectedMetric === 'time1' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                      selectedMetric === 'time2' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                      'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                    } px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-lg`}>
                                      {selectedMetric === 'time1' ? t.time1Str : selectedMetric === 'time2' ? t.time2Str : t.time3Str}
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

              {view === 'userPivot' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5">
                      {['time1', 'time2'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setSelectedMetric(m)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedMetric === m ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                      <div className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-900/30 opacity-20 cursor-not-allowed select-none">
                        TIME3 N/A
                      </div>
                    </div>
                  </div>
                  <div className="glass-panel overflow-auto max-h-[700px] border-white/5 shadow-2xl custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-2xl z-10 shadow-lg">
                        <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] border-b border-white/10">
                          <th className="p-6 min-w-[150px]">
                            <div className="flex flex-col gap-2">
                              <span>User</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                value={columnFilters.user}
                                onChange={e => setColumnFilters(prev => ({...prev, user: e.target.value}))}
                              >
                                <option value="">All Users</option>
                                {columnOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </th>
                          <th className="p-6 min-w-[150px]">
                            <div className="flex flex-col gap-2">
                              <span>Project</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                                value={columnFilters.project}
                                onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                              >
                                <option value="">All Projects</option>
                                {columnOptions.projects.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </th>
                          <th className="p-6 min-w-[200px]">
                            <div className="flex flex-col gap-2">
                              <span>Task</span>
                              <select 
                                className="bg-slate-950/80 border border-white/5 rounded-md px-2 py-1 text-[10px] font-normal lowercase outline-none focus:border-indigo-500 cursor-pointer appearance-none max-w-[250px]"
                                value={columnFilters.taskName}
                                onChange={e => setColumnFilters(prev => ({...prev, taskName: e.target.value}))}
                              >
                                <option value="">All Tasks</option>
                                {columnOptions.tasks.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </th>
                          {['Mo','Tu','We','Th','Fr'].map(d => (
                            <th key={d} className="p-6 text-center">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {userPivotData.map((r, i) => (
                          <tr key={i} className="hover:bg-white/[0.04] transition-all group">
                            <td className="p-6 font-bold text-emerald-400">{r.userName}</td>
                            <td className="p-6 font-medium text-indigo-400">{r.project}</td>
                            <td className="p-6 text-slate-200">{r.taskName}</td>
                            {['Mo','Tu','We','Th','Fr'].map(d => (
                              <td key={d} className="p-6 text-center">
                                <div className="flex flex-col gap-1.5 items-center">
                                  {(r.days[d] || []).map((t, idx) => (
                                    <span key={idx} className={`${
                                      selectedMetric === 'time1' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                      selectedMetric === 'time2' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                      'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                    } px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-lg`}>
                                      {selectedMetric === 'time1' ? t.time1Str : selectedMetric === 'time2' ? t.time2Str : t.time3Str}
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
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-1 p-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl">
                      <button 
                        onClick={() => setAnalyticsMode('leader')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${analyticsMode === 'leader' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <FileText size={14} /> Leader Mode
                      </button>
                      <button 
                        onClick={() => setAnalyticsMode('user')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${analyticsMode === 'user' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <Users size={14} /> User Mode
                      </button>
                    </div>

                    <div className="flex gap-1 p-1 bg-slate-900/30 rounded-xl border border-white/5">
                      {['week', 'month', 'year'].map(g => (
                        <button 
                          key={g}
                          onClick={() => setAnalyticsGranularity(g)}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${analyticsGranularity === g ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          By {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5 lg:col-span-2">
                      <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <span className="w-4 h-4 bg-violet-500 rounded flex items-center justify-center text-[10px] text-white">3</span>
                        {analyticsGranularity.toUpperCase()}LY PERFORMANCE TREND
                      </h3>
                      <div className="w-full h-[300px]">
                        <Line 
                          data={periodicChartData}
                          options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                              x: { grid: { display: false } }
                            }
                          }}
                        />
                      </div>
                    </motion.div>
                  </div>

                  <div className="glass-panel p-6 border-white/5 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{analyticsGranularity.toUpperCase()}LY AGGREGATE TABLE</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 font-bold border-b border-white/5">
                            <th className="py-3 px-4">Period</th>
                            <th className="py-3 px-4">Total Logs</th>
                            <th className="py-3 px-4">Total Time 1</th>
                            <th className="py-3 px-4">Total Time 2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {periodicStats.map(s => (
                            <tr key={s.name} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-bold text-indigo-400">{s.name}</td>
                              <td className="py-3 px-4 text-slate-300">{s.logs}</td>
                              <td className="py-3 px-4 text-emerald-400">{formatDuration(s.t1)}</td>
                              <td className="py-3 px-4 text-indigo-400">{formatDuration(s.t2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel p-8 flex flex-col items-center bg-slate-900/60 border-white/5">
                      <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <span className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center text-[10px] text-white">1</span>
                        Project Time Distribution (Time 1)
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
                          <span className="text-3xl font-black text-white">{projectStats.length}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Projects</span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5">
                      <h3 className="font-bold text-slate-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <span className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center text-[10px] text-white">2</span>
                        User Workload (Time 1)
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

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Project Summary */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5 overflow-hidden">
                      <h3 className="font-bold text-indigo-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <TableIcon size={14} />
                        Summary by Project
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500 font-bold uppercase tracking-widest border-b border-white/5">
                              <th className="pb-4">Project</th>
                              <th className="pb-4 text-center">Tasks</th>
                              <th className="pb-4 text-center text-emerald-400">Time 1</th>
                              <th className="pb-4 text-center text-indigo-400">Time 2</th>
                              {analyticsMode === 'leader' && <th className="pb-4 text-center text-violet-400">Time 3</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {projectStats.map((s, i) => (
                              <tr key={s.name} className="group hover:bg-white/[0.02]">
                                <td className="py-4 font-bold text-slate-200">{s.name}</td>
                                <td className="py-4 text-center text-indigo-400 font-black">{s.uniqueTasks}</td>
                                <td className="py-4 text-center text-emerald-400 font-bold">{s.totalTime1}</td>
                                <td className="py-4 text-center text-indigo-400 font-bold">{s.totalTime2}</td>
                                {analyticsMode === 'leader' && <td className="py-4 text-center text-violet-400 font-bold">{s.totalTime3}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>

                    {/* User Summary */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-8 bg-slate-900/60 border-white/5 overflow-hidden">
                      <h3 className="font-bold text-emerald-400 mb-8 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <Search size={14} />
                        Summary by Created By
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500 font-bold uppercase tracking-widest border-b border-white/5">
                              <th className="pb-4">User</th>
                              <th className="pb-4 text-center">Projects</th>
                              <th className="pb-4 text-center text-emerald-400">Time 1</th>
                              <th className="pb-4 text-center text-indigo-400">Time 2</th>
                              {analyticsMode === 'leader' && <th className="pb-4 text-center text-violet-400">Time 3</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {userStats.map((s, i) => (
                              <tr key={s.name} className="group hover:bg-white/[0.02]">
                                <td className="py-4 font-bold text-slate-200 text-[10px] font-mono">{s.name}</td>
                                <td className="py-4 text-center text-emerald-400 font-black">{s.uniqueProjects}</td>
                                <td className="py-4 text-center text-emerald-400 font-bold">{s.totalTime1}</td>
                                <td className="py-4 text-center text-indigo-400 font-bold">{s.totalTime2}</td>
                                {analyticsMode === 'leader' && <td className="py-4 text-center text-violet-400 font-bold">{s.totalTime3}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Time Calculation Reference */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 glass-panel p-8 bg-slate-900/40 border-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Time Calculation Methodology</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={14} /> Leader View Formulas
                </h4>
                <div className="space-y-4">
                  {[
                    { label: 'TIME 1', formula: 'Date End - Date Start', desc: 'Baseline vs Planned Timeline' },
                    { label: 'TIME 2', formula: 'Date Complete - Date Start', desc: 'Actual Execution vs Planned Start' },
                    { label: 'TIME 3', formula: 'Date Checked - Date Start', desc: 'Final Approval vs Planned Start' }
                  ].map(f => (
                    <div key={f.label} className="bg-slate-950/30 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-white">{f.label}</span>
                        <code className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono">{f.formula}</code>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={14} /> User View Formulas
                </h4>
                <div className="space-y-4">
                  {[
                    { label: 'TIME 1', formula: 'Date Checked - Date Started', desc: 'Actual Working Duration' },
                    { label: 'TIME 2', formula: 'Date Checked - Created At', desc: 'Total Task Lifecycle (Creation to Approval)' }
                  ].map(f => (
                    <div key={f.label} className="bg-slate-950/30 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-white">{f.label}</span>
                        <code className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">{f.formula}</code>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <Database size={14} />
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                All calculations automatically deduct <span className="text-rose-400">1 hour lunch break</span> (12:30 - 13:30) if applicable.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default CSVProcessor
