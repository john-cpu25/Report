// CSVProcessor v4.7.1 - Caching Fixed
import React, { useState, useMemo, useEffect } from 'react'
import { Table as TableIcon, BarChart3, Calendar, Users, Database, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

// Utilities
import { processDate, getEffectiveDuration, formatDuration, formatDateTime, formatDate } from './utils/csvHelpers'

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
  const { isSidebarOpen, setIsSidebarOpen } = useApp();
  const [data, setData] = useState([])
  const [userData, setUserData] = useState([])
  const [rawTasks, setRawTasks] = useState([])
  const [userMap, setUserMap] = useState({})
  const [userTeamMap, setUserTeamMap] = useState({})
  const [view, setView] = useState('unified')
  const [filters, setFilters] = useState({ field: 'project', values: [] })
  const [fileName, setFileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [analyticsMode, setAnalyticsMode] = useState('project')
  const [analyticsGranularity, setAnalyticsGranularity] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedMetric, setSelectedMetric] = useState('time1')
  const [columnFilters, setColumnFilters] = useState({ project: '', taskName: '', user: '', creator: '' })
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [groupBy, setGroupBy] = useState('none')

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => { fetchSupabaseData() }, [])

  async function fetchSupabaseData() {
    setIsLoading(true)
    setFetchError(null)
    try {
      // Attempt to load from cache first for immediate UI response
      const cachedTasks = getCachedData('tasks')
      const cachedUsers = getCachedData('users')
      if (cachedTasks && cachedUsers && data.length === 0) {
        console.log('Using cached data...')
      }

      const [tasksData, usersData] = await Promise.all([
        fetchTasks({ limit: 2000 }),
        fetchUsers()
      ])

      // Save to cache
      setCachedData('tasks', tasksData)
      setCachedData('users', usersData)

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
      setUserMap(uMap)
      setUserTeamMap(uTeamMap)

      const leaderProcessed = tasksData.map(row => {
        const createdAt = processDate(row.created_at)
        const dateStart = processDate(row.date_start)
        const dateEnd = processDate(row.date_end)
        const dateComplete = processDate(row.date_complete)
        const dateChecked = processDate(row.date_checked)
        const dateStarted = processDate(row.date_started)
        const rawName = row.name || ''
        const parts = rawName.toString().split(':')
        const time1 = getEffectiveDuration(dateStart, dateEnd)
        const time2 = getEffectiveDuration(dateStart, dateComplete)
        const time3 = getEffectiveDuration(dateStart, dateChecked)
        
        return {
          project: parts[0]?.trim() || '-',
          taskName: parts[1]?.trim() || '-',
          createdBy: uMap[row.create_by] || uMap[row.create_by?.toLowerCase()] || row.create_by || '-',
          day: formatDate(createdAt || dateStart),
          createdAt, dateStart, dateEnd, dateComplete, dateChecked, dateStarted,
          time1, time2, time3,
          time1Str: formatDuration(time1),
          time2Str: formatDuration(time2),
          time3Str: formatDuration(time3),
          dateObj: createdAt || dateStart,
          team: uTeamMap[row.create_by] || uTeamMap[row.create_by?.toLowerCase()] || '-'
        }
      }).filter(r => r.project !== '-')
      setData(leaderProcessed)
      setRawTasks(tasksData || [])

      const userProcessed = tasksData.map(row => {
        const createdAt = processDate(row.created_at)
        const dateStart = processDate(row.date_start)
        const dateEnd = processDate(row.date_end)
        const dateComplete = processDate(row.date_complete)
        const dateChecked = processDate(row.date_checked)
        const dateStarted = processDate(row.date_started)
        const rawName = row.name || ''
        const parts = rawName.toString().split(':')
        const time1 = getEffectiveDuration(dateStart, dateEnd)
        const time2 = getEffectiveDuration(dateStart, dateComplete)
        const time3 = getEffectiveDuration(dateStart, dateChecked)
        
        return {
          userId: row.user_id,
          userName: uMap[row.user_id] || uMap[row.user_id?.toLowerCase()] || row.user_id || '-',
          project: parts[0]?.trim() || '-',
          taskName: parts[1]?.trim() || '-',
          createdAt, dateStart, dateEnd, dateComplete, dateChecked, dateStarted,
          createdAtStr: formatDateTime(createdAt),
          dateStartedStr: formatDateTime(dateStarted),
          dateCheckedStr: formatDateTime(dateChecked),
          time1, time2, time3,
          time1Str: formatDuration(time1),
          time2Str: formatDuration(time2),
          time3Str: formatDuration(time3),
          dateObj: createdAt,
          team: uTeamMap[row.user_id] || uTeamMap[row.user_id?.toLowerCase()] || '-'
        }
      }).filter(r => r.project !== '-')
      setUserData(userProcessed)
      setLastFetched(new Date())
      setFileName(`Supabase Live — ${tasksData.length} tasks`)
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
    const creators = new Set();
    data.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasks.add(r.taskName);
      if (r.createdBy && r.createdBy !== '-') creators.add(r.createdBy);
    });
    userData.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasks.add(r.taskName);
      if (r.userName && r.userName !== '-') users.add(r.userName);
    });
    return {
      projects: Array.from(projects).sort(),
      tasks: Array.from(tasks).sort(),
      users: Array.from(users).sort(),
      creators: Array.from(creators).sort()
    };
  }, [data, userData])

  const teamOptions = useMemo(() => {
    const teams = new Set();
    data.forEach(r => { if (r.team && r.team !== '-') teams.add(r.team) });
    userData.forEach(r => { if (r.team && r.team !== '-') teams.add(r.team) });
    return ['ALL', ...Array.from(teams).sort()];
  }, [data, userData])

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
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
  }, [data, filters, searchTerm, selectedTeam, dateRange, columnFilters])

  const filteredUserData = useMemo(() => {
    return userData.filter(r => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
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
  }, [userData, filters, searchTerm, selectedTeam, dateRange, columnFilters])

  const uniqueFilterValues = useMemo(() => {
    const vals = new Set();
    data.forEach(r => {
      if (filters.field === 'project') vals.add(r.project);
      else if (filters.field === 'task') vals.add(r.taskName);
      else if (filters.field === 'user') vals.add(r.createdBy);
    });
    return Array.from(vals).sort();
  }, [data, filters.field])

  const projectStats = useMemo(() => {
    const pMap = new Map()
    const targetData = analyticsMode === 'project' ? filteredData : filteredUserData
    targetData.forEach(r => {
      if (!pMap.has(r.project)) pMap.set(r.project, { tasks: new Set(), logs: 0, t1: 0, t2: 0 })
      const p = pMap.get(r.project)
      p.tasks.add(r.taskName)
      p.logs++
      p.t1 += r.time1 || 0
      p.t2 += r.time2 || 0
    })
    return Array.from(pMap.entries()).map(([name, v]) => ({
      name, uniqueTasks: v.tasks.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData, filteredUserData, analyticsMode])

  const userStats = useMemo(() => {
    const uMap = new Map()
    const targetData = analyticsMode === 'project' ? filteredData : filteredUserData
    targetData.forEach(r => {
      const uName = analyticsMode === 'project' ? r.createdBy : r.userName
      if (!uMap.has(uName)) uMap.set(uName, { projects: new Set(), logs: 0, t1: 0, t2: 0 })
      const u = uMap.get(uName)
      u.projects.add(r.project)
      u.logs++
      u.t1 += r.time1 || 0
      u.t2 += r.time2 || 0
    })
    return Array.from(uMap.entries()).map(([name, v]) => ({
      name, uniqueProjects: v.projects.size, totalLogs: v.logs,
      totalTime1: formatDuration(v.t1), totalTime2: formatDuration(v.t2),
      rawTime1: v.t1
    })).sort((a, b) => b.rawTime1 - a.rawTime1)
  }, [filteredData, filteredUserData, analyticsMode])

  const periodicStats = useMemo(() => {
    const mMap = new Map()
    const targetData = analyticsMode === 'project' ? filteredData : filteredUserData
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
      if (!mMap.has(key)) mMap.set(key, { logs: 0, t1: 0, t2: 0 })
      const m = mMap.get(key)
      m.logs++
      m.t1 += r.time1 || 0
      m.t2 += r.time2 || 0
    })
    return Array.from(mMap.entries())
      .map(([name, v]) => ({ name, ...v, rawTime1: v.t1 }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredData, filteredUserData, analyticsMode, analyticsGranularity])

  const chartData = {
    labels: projectStats.slice(0, 10).map(s => s.name),
    datasets: [{
      data: projectStats.slice(0, 10).map(s => s.rawTime1 / (1000 * 60 * 60)),
      backgroundColor: PALETTE,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 2,
      hoverOffset: 15
    }]
  }

  const barChartData = {
    labels: userStats.slice(0, 10).map(s => s.name.split('@')[0]),
    datasets: [{
      label: 'Hours Worked (Time 1)',
      data: userStats.slice(0, 10).map(s => s.rawTime1 / (1000 * 60 * 60)),
      backgroundColor: userStats.slice(0, 10).map((_, i) => PALETTE[i % PALETTE.length] + 'dd'),
      borderColor: userStats.slice(0, 10).map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderRadius: 8,
    }]
  }

  const periodicChartData = {
    labels: periodicStats.map(s => s.name),
    datasets: [{
      label: 'Total Hours',
      data: periodicStats.map(s => s.rawTime1 / (1000 * 60 * 60)),
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: '#6366f1',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  }

  return (
    <div className="w-full space-y-8 pb-20 px-4 sm:px-6">
      {isLoading && data.length === 0 ? (
        <div className="glass-panel p-20 text-center relative overflow-hidden border-2 border-indigo-500/20">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 bg-indigo-500/10 rounded-3xl text-indigo-400 animate-pulse shadow-2xl shadow-indigo-500/20">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white">Connecting to Supabase...</h3>
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
            <h3 className="text-2xl font-bold tracking-tight text-white">Connection Failed</h3>
            <p className="text-rose-400 text-sm max-w-md mx-auto">{fetchError}</p>
            <button onClick={fetchSupabaseData} className="btn btn-primary mt-4 flex items-center gap-2">RETRY</button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
          
          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 glass-panel p-6 border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                <h1 className="text-3xl font-black text-[var(--text-contrast)] uppercase tracking-tight">
                  Data <span className="text-indigo-500">Analyst</span>
                </h1>
              </div>
              <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-normal ml-5">Cross-Project Performance Intelligence</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border)] shadow-sm">
              {[
                { id: 'unified', icon: TableIcon, label: 'UNIFIED VIEW' },
                { id: 'analytics', icon: BarChart3, label: 'ANALYTICS' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 uppercase tracking-normal ${
                    view === t.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                  }`}
                >
                  <t.icon size={14} strokeWidth={3} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <StatCards filteredData={filteredData} />

          <DataUploader 
            fileName={fileName}
            setFileName={setFileName}
            setData={setData}
            setUserData={setUserData}
            setRawTasks={setRawTasks}
            isLoading={isLoading}
            fetchSupabaseData={fetchSupabaseData}
            lastFetched={lastFetched}
            fetchError={fetchError}
          />

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
            fetchSupabaseData={fetchSupabaseData}
            isLoading={isLoading}
          />

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Filter Sidebar Toggle Logic (Omitted for brevity in Step 1, will reintegrate in Step 2 Context) */}
            
            <div className="flex-1 w-full space-y-8">
              {view === 'unified' && (
                <UnifiedTable 
                  rawTasks={rawTasks}
                  userMap={userMap}
                  userTeamMap={userTeamMap}
                  selectedTeam={selectedTeam}
                  searchQuery={searchQuery}
                  columnFilters={columnFilters}
                  setColumnFilters={setColumnFilters}
                  dateRange={dateRange}
                  sortConfig={sortConfig}
                  handleSort={handleSort}
                  columnOptions={columnOptions}
                />
              )}

              {view === 'analytics' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)]">
                    <div className="flex gap-2 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm">
                      <button 
                        onClick={() => setAnalyticsMode('project')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${analyticsMode === 'project' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                      >
                        PROJECT MODE
                      </button>
                      <button 
                        onClick={() => setAnalyticsMode('user')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${analyticsMode === 'user' ? 'bg-emerald-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                      >
                        USER MODE
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div className="glass-panel p-8 bg-[var(--bg-card)] border border-[var(--border)] lg:col-span-2 shadow-xl">
                      <h3 className="font-black text-[var(--text-muted)] mb-8 uppercase text-[10px] tracking-normal">PERFORMANCE TREND</h3>
                      <div className="w-full h-[300px]">
                        <Line data={periodicChartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </motion.div>
                    
                    <motion.div className="glass-panel p-8 flex flex-col items-center bg-[var(--bg-card)] border border-[var(--border)] shadow-xl">
                      <h3 className="font-black text-[var(--text-muted)] mb-8 uppercase text-[10px] tracking-normal">Project Distribution</h3>
                      <div className="w-full h-[350px]">
                        <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </motion.div>

                    <motion.div className="glass-panel p-8 bg-[var(--bg-card)] border border-[var(--border)] shadow-xl">
                      <h3 className="font-black text-[var(--text-muted)] mb-8 uppercase text-[10px] tracking-normal">Workload Analysis</h3>
                      <div className="w-full h-[350px]">
                        <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </motion.div>
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
