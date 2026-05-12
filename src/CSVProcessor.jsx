// CSVProcessor v4.7.1 - Caching Fixed
import React, { useState, useMemo, useEffect } from 'react'
import { Table as TableIcon, BarChart3, Calendar, Users, Database, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

// Utilities
import { processDate, getEffectiveDuration, formatDuration, formatDateTime, formatDate } from './utils/csvHelpers'
import { calculateTaskMetrics } from './utils/performanceEngine'

// Sub-components
import DataUploader from './components/CSVProcessor/DataUploader'
import StatCards from './components/CSVProcessor/StatCards'
import FilterBar from './components/CSVProcessor/FilterBar'
import UnifiedTable from './components/CSVProcessor/UnifiedTable'
import AtomicAnimation from './AtomicAnimation'

import { useApp } from './context/AppContext'
import { fetchTasks, fetchUsers, getCachedData, setCachedData } from './services/supabaseService'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement)

const DOW_MAP = { 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr' }
const PALETTE = ['#818cf8', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

const CSVProcessor = () => {
  const { 
    isSidebarOpen, setIsSidebarOpen,
    analystTasks, setAnalystTasks,
    analystUserMap, setAnalystUserMap,
    analystUserTeamMap, setAnalystUserTeamMap,
    lastAnalystFetch, setLastAnalystFetch
  } = useApp();

  const [view, setView] = useState('unified')
  const [filters, setFilters] = useState({ field: 'project', values: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [analyticsMode, setAnalyticsMode] = useState('project')
  const [analyticsGranularity, setAnalyticsGranularity] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [columnFilters, setColumnFilters] = useState({ project: '', taskName: '', user: '', creator: '' })
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [groupBy, setGroupBy] = useState('none')

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Initial fetch only if no data exists
  useEffect(() => {
    if (analystTasks.length === 0) {
      fetchSupabaseData(false); // Default to 300 records to prevent lag
    }
  }, []);

  async function fetchSupabaseData(isFullFetch = false) {
    setIsLoading(true)
    setFetchError(null)
    try {
      const limit = isFullFetch ? 10000 : 300;
      
      const [tasksData, usersData] = await Promise.all([
        fetchTasks({ limit }),
        fetchUsers()
      ])

      const uMap = {}
      const uTeamMap = {}
      usersData.forEach(u => {
        const name = u.name || u.email || u.id
        uMap[u.id] = name
        uMap[u.id.toLowerCase()] = name
        uTeamMap[u.id] = u.team || '-'
        uTeamMap[u.id.toLowerCase()] = u.team || '-'
        if (u.email) {
          uMap[u.email] = name
          uMap[u.email.toLowerCase()] = name
          uTeamMap[u.email] = u.team || '-'
          uTeamMap[u.email.toLowerCase()] = u.team || '-'
        }
      })
      
      setAnalystUserMap(uMap)
      setAnalystUserTeamMap(uTeamMap)

      const processedData = tasksData.map(row => {
        const metrics = calculateTaskMetrics(row)
        const createdAt = processDate(row.created_at)
        const dateStart = processDate(row.date_start)
        const dateStarted = processDate(row.date_started)
        const dateChecked = processDate(row.date_checked)
        const rawName = row.name || ''
        const parts = rawName.toString().split(':')
        
        return {
          id: row.id,
          project: parts[0]?.trim() || '-',
          taskName: parts[1]?.trim() || '-',
          createdBy: uMap[row.create_by] || uMap[row.create_by?.toLowerCase()] || row.create_by || '-',
          userName: uMap[row.user_id] || uMap[row.user_id?.toLowerCase()] || row.user_id || '-',
          ...metrics,
          time1Str: formatDuration(metrics.t1),
          time2Str: formatDuration(metrics.t2),
          time3Str: formatDuration(metrics.t3),
          time4Str: formatDuration(metrics.t4),
          time5Str: formatDuration(metrics.t5),
          dateObj: createdAt || dateStart,
          createdAtStr: formatDateTime(createdAt),
          dateStartedStr: formatDateTime(dateStarted),
          dateCheckedStr: formatDateTime(dateChecked),
          team: uTeamMap[row.user_id] || uTeamMap[row.user_id?.toLowerCase()] || '-'
        }
      }).filter(r => r.project !== '-')

      setAnalystTasks(processedData)
      setLastAnalystFetch(new Date())
    } catch (err) {
      console.error('Supabase fetch error:', err)
      setFetchError(err.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const columnOptions = useMemo(() => {
    const projects = new Set();
    const tasks = new Set();
    const users = new Set();
    const creators = new Set();
    analystTasks.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasks.add(r.taskName);
      if (r.userName && r.userName !== '-') users.add(r.userName);
      if (r.createdBy && r.createdBy !== '-') creators.add(r.createdBy);
    });
    return {
      projects: Array.from(projects).sort(),
      tasks: Array.from(tasks).sort(),
      users: Array.from(users).sort(),
      creators: Array.from(creators).sort()
    };
  }, [analystTasks])

  const teamOptions = useMemo(() => {
    const teams = new Set();
    analystTasks.forEach(r => { if (r.team && r.team !== '-') teams.add(r.team) });
    return ['ALL', ...Array.from(teams).sort()];
  }, [analystTasks])

  const filteredData = useMemo(() => {
    return analystTasks.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        if (!r.project.toLowerCase().includes(q) && !r.taskName.toLowerCase().includes(q) && !r.userName.toLowerCase().includes(q) && !r.createdBy.toLowerCase().includes(q)) return false
      }
      if (selectedTeam !== 'ALL' && r.team !== selectedTeam) return false
      if (columnFilters.project && !r.project.toLowerCase().includes(columnFilters.project.toLowerCase())) return false
      if (columnFilters.taskName && !r.taskName.toLowerCase().includes(columnFilters.taskName.toLowerCase())) return false
      if (columnFilters.user && !r.userName.toLowerCase().includes(columnFilters.user.toLowerCase())) return false
      if (columnFilters.creator && !r.createdBy.toLowerCase().includes(columnFilters.creator.toLowerCase())) return false

      if (dateRange.start && r.dateObj && r.dateObj < new Date(dateRange.start)) return false
      if (dateRange.end) {
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        if (r.dateObj && r.dateObj > end) return false
      }
      return true
    })
  }, [analystTasks, searchTerm, selectedTeam, dateRange, columnFilters])

  const projectStats = useMemo(() => {
    const pMap = new Map()
    filteredData.forEach(r => {
      if (!pMap.has(r.project)) pMap.set(r.project, { tasks: new Set(), logs: 0, t1: 0, t2: 0 })
      const p = pMap.get(r.project)
      p.tasks.add(r.taskName)
      p.logs++
      p.t1 += r.t1 || 0
      p.t2 += r.t2 || 0
    })
    return Array.from(pMap.entries()).map(([name, v]) => ({
      name, uniqueTasks: v.tasks.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData])

  const userStats = useMemo(() => {
    const uMap = new Map()
    filteredData.forEach(r => {
      const uName = analyticsMode === 'project' ? r.createdBy : r.userName
      if (!uMap.has(uName)) uMap.set(uName, { projects: new Set(), logs: 0, t1: 0, t2: 0 })
      const u = uMap.get(uName)
      u.projects.add(r.project)
      u.logs++
      u.t1 += r.t1 || 0
      u.t2 += r.t2 || 0
    })
    return Array.from(uMap.entries()).map(([name, v]) => ({
      name, uniqueProjects: v.projects.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData, analyticsMode])

  const periodicStats = useMemo(() => {
    const mMap = new Map()
    filteredData.forEach(r => {
      if (!r.dateObj) return
      let key = ''
      if (analyticsGranularity === 'week') {
        const d = new Date(r.dateObj)
        d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
        key = `Week ${d.getDate()}/${d.getMonth()+1}`
      } else if (analyticsGranularity === 'year') {
        key = `${r.dateObj.getFullYear()}`
      } else {
        key = `${r.dateObj.getFullYear()}-${String(r.dateObj.getMonth() + 1).padStart(2, '0')}`
      }
      if (!mMap.has(key)) mMap.set(key, { logs: 0, t1: 0, t2: 0 })
      const m = mMap.get(key)
      m.logs++
      m.t1 += r.t1 || 0
      m.t2 += r.t2 || 0
    })
    return Array.from(mMap.entries())
      .map(([name, v]) => ({ name, ...v, rawTime1: v.t1 }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredData, analyticsGranularity])

  return (
    <div className="w-full space-y-6 pb-20 px-4 sm:px-6">
      {isLoading && analystTasks.length === 0 ? (
        <div className="bg-[var(--bg-card)] p-[20px] text-center relative overflow-hidden border border-indigo-500/20 rounded-[8px] m-[10px]">
          <div className="flex flex-col items-center gap-[15px]">
            <div className="p-[15px] bg-indigo-500/10 rounded-[8px] text-indigo-400 animate-pulse">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-[24px] font-black tracking-tight text-white uppercase italic">Intelligence System Syncing...</h3>
            <div className="w-48 h-1 bg-slate-800 rounded-[8px] overflow-hidden">
              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} className="w-1/2 h-full bg-indigo-500" />
            </div>
          </div>
        </div>
      ) : fetchError && analystTasks.length === 0 ? (
        <div className="bg-[var(--bg-card)] p-[20px] text-center relative overflow-hidden border border-rose-500/20 rounded-[8px] m-[10px]">
          <div className="flex flex-col items-center gap-[15px]">
            <div className="p-[15px] bg-rose-500/10 rounded-[8px] text-rose-400 shadow-2xl shadow-rose-500/20">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-[24px] font-black tracking-tight text-white uppercase italic">Connection Failed</h3>
            <p className="text-rose-400 text-[10px] font-bold uppercase max-w-md mx-auto">{fetchError}</p>
            <button onClick={() => fetchSupabaseData(false)} className="px-[20px] py-[10px] bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-[8px] hover:bg-rose-600 transition-all">RETRY SYNC</button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-[10px]">
          
          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-[10px] bg-[var(--bg-card)] p-[10px] border border-[var(--border)] rounded-[8px] shadow-sm m-[10px]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-[10px]">
                <div className="w-2 h-8 bg-indigo-500 rounded-[8px] shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                <h1 className="text-[30px] font-black text-[var(--text-contrast)] uppercase tracking-tight italic">
                  Data <span className="text-indigo-500">Analyst</span>
                </h1>
              </div>
              <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest ml-5">Cross-Project Performance Intelligence</p>
            </div>

            <div className="flex flex-wrap items-center gap-[10px] bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)]">
              {[
                { id: 'unified', icon: TableIcon, label: 'UNIFIED VIEW' },
                { id: 'analytics', icon: BarChart3, label: 'ANALYTICS' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] text-[10px] font-black transition-all duration-300 uppercase tracking-widest ${
                    view === t.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                  }`}
                >
                  <t.icon size={14} strokeWidth={3} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Metrics Legend */}
          <div className="bg-[var(--bg-card)] p-[10px] bg-indigo-500/5 border border-indigo-500/20 shadow-lg relative overflow-hidden group rounded-[8px] m-[10px]">
            <div className="flex items-center gap-[10px] mb-[10px] p-[10px]">
              <div className="p-[10px] bg-indigo-500/20 rounded-[8px] text-indigo-400">
                <Database size={16} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Calculation Logic</h3>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Working Hours: 09:00 - 18:00 (GMT+7)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
              {[
                { id: 'T1', label: 'Target Duration', formula: 'date_start → date_end', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { id: 'T2', label: 'Actual Completion', formula: 'date_start → date_complete', color: 'text-sky-500', bg: 'bg-sky-500/10' },
                { id: 'T3', label: 'Full Cycle', formula: 'date_start → date_checked', color: 'text-violet-500', bg: 'bg-violet-500/10' },
                { id: 'T4', label: 'Pure Processing', formula: 'date_started → date_checked', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { id: 'T5', label: 'System Lead Time', formula: 'created_at → date_checked', color: 'text-rose-500', bg: 'bg-rose-500/10' }
              ].map(m => (
                <div key={m.id} className="relative p-[10px] rounded-[8px] border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-300 group/item">
                  <div className="flex items-center gap-[10px] mb-[10px]">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-[8px] ${m.bg} ${m.color} text-[10px] font-black`}>{m.id}</span>
                    <span className="text-[10px] font-black text-[var(--text-contrast)] uppercase tracking-widest">{m.label}</span>
                  </div>
                  <div className="space-y-[5px]">
                    <p className="text-[9px] text-[var(--text-muted)] font-mono bg-black/20 p-[10px] rounded-[8px] border border-white/5 inline-block group-hover/item:border-indigo-500/20 transition-colors">
                      {m.formula}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StatCards filteredData={filteredData} />

          {/* Action Buttons & Sync Info */}
          <div className="flex flex-wrap items-center justify-between gap-[10px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] m-[10px]">
            <div className="flex items-center gap-[10px]">
              <DataUploader 
                onDataLoaded={(d) => setAnalystTasks(d)} 
                isLoading={isLoading} 
              />
              <button 
                onClick={() => fetchSupabaseData(true)} 
                disabled={isLoading}
                className={`flex items-center gap-[10px] px-[20px] py-[10px] bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-[8px] hover:bg-emerald-600 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Database size={14} />
                {isLoading ? 'SYNCING...' : 'SYNC SUPABASE (FULL)'}
              </button>
              <div className="flex items-center gap-[10px] px-[15px] py-[10px] bg-white/5 border border-white/10 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest rounded-[8px]">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-ping' : 'bg-indigo-500'}`} />
                SUPABASE LIVE — {analystTasks.length} TASKS
              </div>
            </div>
            
            <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              LAST SYNC: {lastAnalystFetch ? lastAnalystFetch.toLocaleTimeString() : 'NEVER'}
            </div>
          </div>

          <FilterBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            teamOptions={teamOptions}
            filteredDataCount={filteredData.length}
            fetchSupabaseData={() => fetchSupabaseData(false)}
            isLoading={isLoading}
          />

          <div className="flex flex-col lg:flex-row gap-[10px] items-start">
            <div className="flex-1 w-full space-y-[10px]">
              {view === 'unified' && (
                <UnifiedTable 
                  data={filteredData}
                  columnFilters={columnFilters}
                  setColumnFilters={setColumnFilters}
                  sortConfig={sortConfig}
                  handleSort={handleSort}
                  columnOptions={columnOptions}
                />
              )}

              {view === 'analytics' && (
                <div className="space-y-[10px]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[10px] bg-[var(--bg-surface)] p-[10px] rounded-[8px] border border-[var(--border)]">
                    <select 
                      className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-[10px] py-[5px] text-[10px] font-bold outline-none focus:border-indigo-500 cursor-pointer appearance-none w-full text-[var(--text-main)]"
                      value={columnFilters.project}
                      onChange={e => setColumnFilters(prev => ({...prev, project: e.target.value}))}
                    >
                      <option value="">ALL PROJECTS</option>
                    </select>
                    <div className="flex gap-[10px] p-[10px] bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)] shadow-sm">
                      <button 
                        onClick={() => setAnalyticsMode('project')}
                        className={`flex items-center gap-[10px] px-6 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${analyticsMode === 'project' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                      >
                        PROJECT MODE
                      </button>
                      <button 
                        onClick={() => setAnalyticsMode('user')}
                        className={`flex items-center gap-[10px] px-6 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all ${analyticsMode === 'user' ? 'bg-emerald-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                      >
                        USER MODE
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px]">
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] lg:col-span-2 rounded-[8px] p-[20px] m-[10px]">
                      <h3 className="font-black text-[var(--text-muted)] mb-[20px] uppercase text-[10px] tracking-widest">PERFORMANCE TREND</h3>
                      <div className="w-full h-[300px]">
                        <Line data={periodicChartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </div>
                    
                    <div className="p-[20px] flex flex-col items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] m-[10px]">
                      <h3 className="font-black text-[var(--text-muted)] mb-[20px] uppercase text-[10px] tracking-widest">Project Distribution</h3>
                      <div className="w-full h-[350px]">
                        <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </div>

                    <div className="p-[20px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] m-[10px]">
                      <h3 className="font-black text-[var(--text-muted)] mb-[20px] uppercase text-[10px] tracking-widest">Workload Analysis</h3>
                      <div className="w-full h-[350px]">
                        <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default CSVProcessor
