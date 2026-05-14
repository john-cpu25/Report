import { useState, useMemo, useEffect } from 'react'
import { 
  Table as TableIcon, 
  BarChart3, 
  Users, 
  Database, 
  FileText, 
  Layers, 
  Clock, 
  Activity, 
  ExternalLink,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

// Utilities
import { processDate, formatDuration, formatDateTime } from './utils/csvHelpers'
import { calculateTaskMetrics } from './utils/performanceEngine'
import { processTaskData } from './utils/dataProcessor'

// Sub-components
import DataUploader from './components/CSVProcessor/DataUploader'
import FilterBar from './components/CSVProcessor/FilterBar'
import UnifiedTable from './components/CSVProcessor/UnifiedTable'

import { useApp } from './context/AppContext'
import { fetchTasks, fetchUsers } from './services/supabaseService'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement)

const PALETTE = ['#818cf8', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

const CSVProcessor = () => {
  const { 
    analystTasks, setAnalystTasks,
    setAnalystUserMap,
    setAnalystUserTeamMap,
    lastAnalystFetch, setLastAnalystFetch
  } = useApp();

  const [view, setView] = useState('unified')
  const [showIntelligence, setShowIntelligence] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [analyticsMode, setAnalyticsMode] = useState('project')
  const [analyticsGranularity] = useState('month')
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

  useEffect(() => {
    if (analystTasks.length === 0) {
      fetchSupabaseData(false);
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

      const processedData = processTaskData(tasksData, uMap, uTeamMap);

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
    const tasksSet = new Set();
    const usersSet = new Set();
    const creators = new Set();
    analystTasks.forEach(r => {
      if (r.project && r.project !== '-') projects.add(r.project);
      if (r.taskName && r.taskName !== '-') tasksSet.add(r.taskName);
      if (r.userName && r.userName !== '-') usersSet.add(r.userName);
      if (r.createdBy && r.createdBy !== '-') creators.add(r.createdBy);
    });
    return {
      projects: Array.from(projects).sort(),
      tasks: Array.from(tasksSet).sort(),
      users: Array.from(usersSet).sort(),
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
    
    const sorted = Array.from(mMap.entries())
      .map(([name, v]) => ({ name, ...v, rawTime1: v.t1 }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Calculate 3-period Moving Average
    return sorted.map((s, i, arr) => {
      const window = arr.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((acc, curr) => acc + (curr.t1 / (1000 * 60 * 60)), 0) / window.length;
      return { ...s, movingAvg: avg };
    });
  }, [filteredData, analyticsGranularity]);

  const chartData = useMemo(() => ({
    labels: projectStats.slice(0, 8).map(s => s.name),
    datasets: [{
      data: projectStats.slice(0, 8).map(s => s.totalLogs),
      backgroundColor: PALETTE,
      borderWidth: 0,
      hoverOffset: 15
    }]
  }), [projectStats]);

  const barChartData = useMemo(() => ({
    labels: userStats.slice(0, 10).map(s => s.name),
    datasets: [{
      label: 'Total Logs',
      data: userStats.slice(0, 10).map(s => s.totalLogs),
      backgroundColor: '#818cf8',
      borderRadius: 4
    }]
  }), [userStats]);

  const periodicChartData = useMemo(() => ({
    labels: periodicStats.map(s => s.name),
    datasets: [
      {
        label: 'T1 Duration',
        data: periodicStats.map(s => s.t1 / (1000 * 60 * 60)),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2
      },
      {
        label: 'Moving Avg (3P)',
        data: periodicStats.map(s => s.movingAvg),
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'T2 Completion',
        data: periodicStats.map(s => s.t2 / (1000 * 60 * 60)),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 2
      }
    ]
  }), [periodicStats]);

  const handleChartClick = (event, elements, type) => {
    if (!elements || elements.length === 0) return;
    const index = elements[0].index;
    
    if (type === 'project') {
      const projectName = projectStats[index].name;
      setColumnFilters(prev => ({ ...prev, project: projectName }));
    } else if (type === 'user') {
      const userName = userStats[index].name;
      const filterKey = analyticsMode === 'project' ? 'creator' : 'user';
      setColumnFilters(prev => ({ ...prev, [filterKey]: userName }));
    }
  };

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
          
          {/* Sticky Header Container */}
          <div className="sticky top-[80px] z-20 bg-[var(--bg-main)] -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-2 space-y-[10px]">
            {/* Header Area with Title & View Switcher */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-[10px] bg-[var(--bg-card)] p-[10px] border border-[var(--border)] rounded-[8px] shadow-sm">
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
                <button
                  onClick={() => setShowIntelligence(!showIntelligence)}
                  className={`flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] text-[10px] font-black transition-all duration-300 uppercase tracking-widest ${
                    !showIntelligence ? 'bg-amber-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {showIntelligence ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
                  {showIntelligence ? 'HIDE ANALYTICS' : 'SHOW ANALYTICS'}
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
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

            {/* Unified Intelligence Header (Requested Layout) */}
            <AnimatePresence>
              {showIntelligence && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
                  exit={{ height: 0, opacity: 0, marginTop: -10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-12 gap-[10px] items-stretch pb-2">
                    
                    {/* Section 1: Calculation Logic (Red Box 1) */}
                    <div className="col-span-2 bg-[var(--bg-card)] border border-indigo-500/20 rounded-[8px] p-[10px] flex flex-col gap-[8px] relative overflow-hidden group">
                      <div className="flex items-center gap-[10px] mb-[5px]">
                        <div className="p-1.5 bg-indigo-500/20 rounded-md text-indigo-400">
                          <Database size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">CALCULATION LOGIC</h3>
                          <p className="text-[8px] font-bold text-slate-500 uppercase">09:00 - 18:00 (GMT+7)</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-[6px] flex-1">
                        {[
                          { id: 'T1', label: 'TARGET DURATION', formula: 'date_start → date_end', color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                          { id: 'T2', label: 'ACTUAL COMPLETION', formula: 'date_start → date_complete', color: 'text-sky-500', bg: 'bg-sky-500/5' },
                          { id: 'T3', label: 'FULL CYCLE', formula: 'date_start → date_checked', color: 'text-violet-500', bg: 'bg-violet-500/5' },
                          { id: 'T4', label: 'PURE PROCESSING', formula: 'date_started → date_checked', color: 'text-amber-500', bg: 'bg-amber-500/5' },
                          { id: 'T5', label: 'SYSTEM LEAD TIME', formula: 'created_at → date_checked', color: 'text-rose-500', bg: 'bg-rose-500/5' }
                        ].map(m => (
                          <div key={m.id} className={`p-[8px] rounded-[6px] border border-white/5 ${m.bg} flex flex-col gap-0.5`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black ${m.color}`}>{m.id}</span>
                              <span className="text-[8px] font-black text-[var(--text-contrast)] uppercase tracking-tighter">{m.label}</span>
                            </div>
                            <p className="text-[7px] text-[var(--text-muted)] font-mono opacity-60">{m.formula}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Stat Cards (Red Box 2) */}
                    <div className="col-span-2 flex flex-col gap-[10px]">
                      {(() => {
                        const totalLogs = filteredData.length;
                        const projects = new Set(filteredData.map(r => r.project)).size;
                        const activeUsers = new Set(filteredData.map(r => r.createdBy || r.userName)).size;
                        const totalMinutes = filteredData.reduce((acc, r) => acc + (r.t1 || 0), 0);
                        
                        return [
                          { label: 'TOTAL RECORDS', value: totalLogs, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                          { label: 'UNIQUE PROJECTS', value: projects, icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                          { label: 'ACTIVE PERSONNEL', value: activeUsers, icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                          { label: 'TOTAL TIME (T1)', value: formatDuration(totalMinutes), icon: Clock, color: 'text-rose-400', bg: 'bg-rose-400/10' },
                        ].map((stat, i) => (
                          <div key={i} className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] p-[10px] flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                            <div className="flex justify-between items-start">
                              <div className={`p-1.5 ${stat.bg} ${stat.color} rounded-md`}>
                                <stat.icon size={14} />
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
                                <p className="text-lg font-black text-white leading-none mt-1">{stat.value}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400/60 text-[7px] font-black uppercase mt-1">
                              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                              <span>DATA VERIFIED</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Section 3: Charts (Green Box) */}
                    <div className="col-span-6 bg-[var(--bg-card)] border border-emerald-500/20 rounded-[8px] p-[10px] flex flex-col gap-[10px]">
                       <div className="flex items-center justify-between mb-1">
                         <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">REAL-TIME INTELLIGENCE</h3>
                         <div className="flex gap-2">
                           <button onClick={() => setView('analytics')} className="flex items-center gap-1 text-[8px] font-black text-indigo-400 hover:text-indigo-300">
                             EXPAND ANALYTICS <ExternalLink size={8} />
                           </button>
                         </div>
                       </div>
                       <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="relative h-full min-h-[150px]">
                            <Line 
                              data={periodicChartData} 
                              options={{ 
                                maintainAspectRatio: false, 
                                plugins: { legend: { display: false } }, 
                                scales: { x: { display: false }, y: { display: false } },
                                elements: { point: { radius: 0 } }
                              }} 
                            />
                            <div className="absolute top-0 left-0 text-[8px] font-black text-slate-500 uppercase">Trend (inc. Moving Avg)</div>
                          </div>
                          <div className="relative h-full min-h-[150px]">
                            <Doughnut 
                              data={chartData} 
                              options={{ 
                                maintainAspectRatio: false, 
                                plugins: { legend: { display: false } }, 
                                cutout: '70%',
                                borderWidth: 0,
                                onClick: (e, el) => handleChartClick(e, el, 'project')
                              }} 
                            />
                            <div className="absolute top-0 left-0 text-[8px] font-black text-slate-500 uppercase">Distribution (Click to Filter)</div>
                          </div>
                       </div>
                    </div>

                    {/* Section 4: Actions (Blue Box) */}
                    <div className="col-span-2 bg-[var(--bg-card)] border border-blue-500/20 rounded-[8px] p-[10px] flex flex-col justify-between">
                      <div className="space-y-[10px]">
                        <button 
                          onClick={() => fetchSupabaseData(false)} 
                          disabled={isLoading}
                          className="w-full flex items-center justify-between px-[15px] py-[12px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase tracking-widest rounded-[8px] hover:bg-emerald-500 hover:text-white transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            <span>SYNC LIVE</span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-white" />
                        </button>

                        <button 
                          onClick={() => fetchSupabaseData(true)} 
                          disabled={isLoading}
                          className="w-full flex items-center justify-between px-[15px] py-[12px] bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black text-[10px] uppercase tracking-widest rounded-[8px] hover:bg-blue-500 hover:text-white transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <Database size={14} />
                            <span>FULL SYNC</span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-white" />
                        </button>
                        
                        <DataUploader 
                          onDataLoaded={(d) => setAnalystTasks(d)} 
                          isLoading={isLoading} 
                        />
                      </div>

                      <div className="space-y-[10px] mt-auto border-t border-white/5 pt-[10px]">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-ping' : 'bg-indigo-500'}`} />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">STATUS</span>
                           </div>
                           <span className="text-[9px] font-black text-white uppercase">{isLoading ? 'SYNCING' : 'ONLINE'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">TOTAL TASKS: {analystTasks.length}</p>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">LAST SYNC: {lastAnalystFetch ? lastAnalystFetch.toLocaleTimeString() : 'NEVER'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
          </div>

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
                      {columnOptions.projects.map(p => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
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
                      <div className="flex items-center justify-between mb-[20px]">
                         <h3 className="font-black text-[var(--text-muted)] uppercase text-[10px] tracking-widest">PERFORMANCE TREND (inc. 3-Period Moving Average)</h3>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-indigo-500" /><span className="text-[8px] font-bold text-slate-500 uppercase">Actual</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-500 border-dashed" /><span className="text-[8px] font-bold text-slate-500 uppercase">Moving Avg</span></div>
                         </div>
                      </div>
                      <div className="w-full h-[300px]">
                        <Line data={periodicChartData} options={{ maintainAspectRatio: false }} />
                      </div>
                    </div>
                    
                    <div className="p-[20px] flex flex-col items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] m-[10px]">
                      <h3 className="font-black text-[var(--text-muted)] mb-[20px] uppercase text-[10px] tracking-widest">Project Distribution (Interactive)</h3>
                      <div className="w-full h-[350px]">
                        <Doughnut 
                          data={chartData} 
                          options={{ 
                            maintainAspectRatio: false,
                            onClick: (e, el) => handleChartClick(e, el, 'project')
                          }} 
                        />
                      </div>
                    </div>

                    <div className="p-[20px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] m-[10px]">
                      <h3 className="font-black text-[var(--text-muted)] mb-[20px] uppercase text-[10px] tracking-widest">Workload Analysis (Interactive)</h3>
                      <div className="w-full h-[350px]">
                        <Bar 
                          data={barChartData} 
                          options={{ 
                            maintainAspectRatio: false,
                            onClick: (e, el) => handleChartClick(e, el, 'user')
                          }} 
                        />
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
