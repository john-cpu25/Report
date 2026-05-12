import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet, Layout, X, Filter, Activity, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkflowAnimation from './WorkflowAnimation'

import KamehamehaAnimation from './KamehamehaAnimation'
import { generateTasks, validateTaskInput } from './utils/taskEngine'
import MarkupCell from './components/MarkupCell'
import MarkupDateInput from './components/MarkupDateInput'
import MarkupTimeInput from './components/MarkupTimeInput'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const ALL_STATUSES = ['WIP', 'DONE', 'PENDING', 'TMR', 'PLANNING', 'URGENT', 'HIGH PRIORITY', 'ISSUE']

import { useApp } from './context/AppContext'

const WeeklyReport = ({ exportExcel }) => {
  const {
    reportData, setReportData,
    selectedDate, setSelectedDate,
    weekDates,
    formData, setFormData,
    handleAddTask, deleteRow, moveRow, updateStatus,
    updateDayTime, updateMarkup, bulkUpdateMarkup,
    allProjects,
    isSidebarOpen, setIsSidebarOpen,
    sidebarCollapsed,
    showProjectGroups
  } = useApp();
  const [newProjectName, setNewProjectName] = React.useState('')
  const [showAddProject, setShowAddProject] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState({ key: 'project', direction: 'asc' })
  const [editingCell, setEditingCell] = React.useState(null) // { id, day }
  const [editingMarkup, setEditingMarkup] = React.useState(null) // { id }
  const [selectedRows, setSelectedRows] = React.useState(new Set())
  const [bulkMarkup, setBulkMarkup] = React.useState({ date: null, time: null })
  const [showBatchModal, setShowBatchModal] = React.useState(false)
  const [batchTasksText, setBatchTasksText] = React.useState('')
  const [batchProjects, setBatchProjects] = React.useState([])
  const [batchLevelsText, setBatchLevelsText] = React.useState('')
  const [batchLevelEnabled, setBatchLevelEnabled] = React.useState(false)
  const [batchWorkflows, setBatchWorkflows] = React.useState([])
  const [collapsedProjects, setCollapsedProjects] = React.useState({}) // { [projectName]: boolean }
  const [focusedProject, setFocusedProject] = React.useState(null)
  const [visibleStatuses, setVisibleStatuses] = React.useState(ALL_STATUSES)
  const [showStatusFilter, setShowStatusFilter] = React.useState(false)

  // Derived state for Batch Engine (Transformation Layer)
  const batchValidation = React.useMemo(() => {
    return validateTaskInput({
      projectIds: batchProjects,
      levels: batchLevelsText.split(',').map(l => l.trim()).filter(l => l !== ""),
      levelEnabled: batchLevelEnabled,
      workflows: batchWorkflows,
      rawLines: batchTasksText
    });
  }, [batchProjects, batchLevelsText, batchLevelEnabled, batchWorkflows, batchTasksText]);



  const filteredReportData = React.useMemo(() => {
    let result = reportData.filter(r => r.team === formData.team && visibleStatuses.includes(r.status))
    
    // Apply focused project filter if active
    if (focusedProject) {
      result = result.filter(r => r.project === focusedProject)
    }
    if (sortConfig.key || showProjectGroups) {
      result.sort((a, b) => {
        // If grouping is enabled, project is always the primary sort
        if (showProjectGroups && a.project !== b.project) {
          return a.project < b.project ? -1 : 1
        }
        
        let aVal = a[sortConfig.key] || ''
        let bVal = b[sortConfig.key] || ''

        // Special handling for markupTime sorting
        if (sortConfig.key === 'markupTime') {
          const getTimestamp = (r) => {
            if (!r.markupDate && !r.markupTime) return 0;
            const date = r.markupDate || '1970-01-01';
            const time = r.markupTime || '00:00';
            return new Date(`${date}T${time}`).getTime();
          };
          aVal = getTimestamp(a);
          bVal = getTimestamp(b);
        } else {
          if (typeof aVal === 'string') aVal = aVal.toLowerCase()
          if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [reportData, formData.team, sortConfig, showProjectGroups, focusedProject, visibleStatuses])

  const groupedData = React.useMemo(() => {
    return filteredReportData.reduce((acc, task) => {
      if (!acc[task.project]) acc[task.project] = []
      acc[task.project].push(task)
      return acc
    }, {})
  }, [filteredReportData])

  const toggleCollapse = (projectName) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }))
  }

  const expandAll = () => setCollapsedProjects({})
  const collapseAll = () => {
    const all = Object.keys(groupedData).reduce((acc, p) => {
      acc[p] = true
      return acc
    }, {})
    setCollapsedProjects(all)
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const stats = React.useMemo(() => {
    const totalTasks = filteredReportData.length
    const doneTasks = filteredReportData.filter(r => r.status === 'DONE').length
    const uniqueProjects = new Set(filteredReportData.map(r => r.project)).size
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
    
    // Day distribution
    const dayCounts = DAYS_OF_WEEK.reduce((acc, d) => {
      acc[d] = filteredReportData.filter(r => r.days[d]).length
      return acc
    }, {})

    const statusCounts = filteredReportData.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})

    const projectCounts = filteredReportData.reduce((acc, r) => {
      acc[r.project] = (acc[r.project] || 0) + 1
      return acc
    }, {})

    return { totalTasks, doneTasks, uniqueProjects, completionRate, dayCounts, statusCounts, projectCounts }
  }, [filteredReportData])

  const STR_WORKFLOW = { 
    col1: ['BACK DRAF', 'GA PLAN', 'LP PLAN', 'SITE RETENTION'], 
    col2: ['ELE WALL', 'MARKUP', 'SECTION'], 
    col3: ['ISSUE', 'FOUNDATION', 'FULL SET'] 
  }
  const PT_WORKFLOW = { 
    col1: ['REO BTM', 'REO TOP', 'REO SHEAR'], 
    col2: ['PT', 'REO', 'PT&REO', 'TYPICAL'], 
    col3: ['BACK DRAF', 'SECTION', 'ISSUE'] 
  }
  const MTO_WORKFLOW = { 
    col1: ['NEW', 'BACK'], 
    col2: [], 
    col3: [] 
  }
  
  const currentWorkflow = 
    formData.team === 'STR MODELING TEAM' ? STR_WORKFLOW : 
    formData.team === 'PT & REO TEAM' ? PT_WORKFLOW : 
    MTO_WORKFLOW;

  const getStatusColor = (status) => {
    switch(status) {
      case 'DONE': return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
      case 'PENDING': return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
      case 'TMR': return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
      case 'URGENT': return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
      case 'PLANNING': return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
      case 'HIGH PRIORITY': return { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' }
      case 'ISSUE': return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
      default: return { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' } // WIP
    }
  }

  const handleEtaMode = (mode) => {
    if (mode === 'MO') {
      setFormData({...formData, etaMode: 'MO', eta: '12:30'})
    } else if (mode === 'AF') {
      setFormData({...formData, etaMode: 'AF', eta: '17:30'})
    } else if (mode === 'CUSTOM') {
      setFormData({...formData, etaMode: 'CUSTOM', eta: ''})
    }
  }

  return (
    <div className="relative min-h-screen p-[10px]">
      <div className="w-full mx-auto pb-[10px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] items-start">


        {/* Sidebar Form (Integrated in Grid on Desktop, Slider on Tablet/Mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[55] lg:hidden"
            />
          )}
            <motion.aside 
              key="entry-form-aside"
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-[80px] bottom-0 w-[320px] lg:w-[360px] z-[51] p-[10px] overflow-y-auto custom-scrollbar bg-slate-950/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl"
              style={{ 
                left: typeof window !== 'undefined' && window.innerWidth >= 1024 
                  ? (sidebarCollapsed ? 100 : 260) 
                  : 0 
              }}
            >
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center justify-between p-[10px] bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)] m-[10px]">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                    <h2 className="text-[24px] font-black text-[var(--text-main)] tracking-tight uppercase">Entry Form</h2>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowAddProject(!showAddProject)}
                    className="p-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 rounded-[8px] text-indigo-400 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                {showAddProject && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-[10px] bg-indigo-500/5 rounded-[8px] border border-indigo-500/10 flex flex-col gap-[10px] m-[10px]"
                  >
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">New Project Protocol</p>
                    <div className="flex gap-[10px]">
                      <input 
                        type="text" 
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none" 
                        placeholder="PROJECT KEY..."
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value.toUpperCase())}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newProjectName) {
                            addCustomProject(newProjectName)
                            setFormData({...formData, project: newProjectName})
                            setNewProjectName('')
                            setShowAddProject(false)
                          }
                        }}
                        className="px-[15px] bg-indigo-500 rounded-[8px] text-white font-black text-[12px] uppercase"
                      >
                        ADD
                      </button>
                    </div>
                  </motion.div>
                )}
            
                <form onSubmit={(e) => { handleAddTask(e); setIsSidebarOpen(false); }} className="flex flex-col gap-[10px] p-[10px]">
                  <div className="flex flex-col gap-[5px]">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Portfolio</label>
                    <select 
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none"
                      value={formData.project}
                      onChange={e => setFormData({...formData, project: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select Project...</option>
                      {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-[5px]">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Level / Zone</label>
                      <label className="flex items-center gap-[10px] cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-[4px] border border-[var(--border)] bg-[var(--bg-surface)] text-indigo-500"
                          checked={formData.showLevel}
                          onChange={e => setFormData({...formData, showLevel: e.target.checked, level: e.target.checked ? formData.level : ''})}
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Visible</span>
                      </label>
                    </div>
                    {formData.showLevel && (
                      <input 
                        type="text" 
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none" 
                        placeholder="e.g. L12, P1..."
                        value={formData.level}
                        onChange={e => setFormData({...formData, level: e.target.value})}
                        required={formData.showLevel}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-[10px] p-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)]">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workflow Engine</label>
                    <div className="flex items-center justify-center gap-[15px] py-[5px]">
                      {[
                        { id: 'STR MODELING TEAM', img: '/Report/assets/logos/str.png', color: 'indigo' },
                        { id: 'PT & REO TEAM', img: '/Report/assets/logos/pt.png', color: 'orange' },
                        { id: 'MTO TEAM', img: '/Report/assets/logos/mto.png', color: 'violet' }
                      ].map(team => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => setFormData({...formData, team: team.id, tasks: []})}
                          className={`p-[5px] rounded-[8px] transition-all relative ${
                            formData.team === team.id 
                              ? `ring-2 ring-indigo-500 bg-indigo-500/10 scale-110` 
                              : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                          }`}
                        >
                          <img src={team.img} alt={team.id} className="w-8 h-8 rounded-[4px] object-contain" />
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-[5px]">
                      {Object.values(currentWorkflow).flat().map(t => (
                        <label key={t} className="flex items-center gap-[5px] cursor-pointer p-[5px] hover:bg-white/5 rounded-[4px] transition-all">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-[4px] border border-[var(--border)] bg-[var(--bg-dark)] text-indigo-500"
                            checked={formData.tasks.includes(t)}
                            onChange={e => {
                              const newTasks = e.target.checked 
                                ? [...formData.tasks, t]
                                : formData.tasks.filter(x => x !== t)
                              setFormData({...formData, tasks: newTasks})
                            }}
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-[5px]">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Note</label>
                    <input 
                      type="text" 
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none" 
                      placeholder="CUSTOM COMMENTS..."
                      value={formData.note}
                      onChange={e => setFormData({...formData, note: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-[10px]">
                    <div className="flex flex-col gap-[5px]">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Report Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[12px] font-bold text-white outline-none"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-[5px]">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[12px] font-bold text-white outline-none"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[5px]">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ETA Protocol</label>
                    <div className="grid grid-cols-3 gap-[5px]">
                      {['MO', 'AF', 'CUSTOM'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleEtaMode(opt)}
                          className={`py-[10px] rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all border ${
                            formData.etaMode === opt
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                              : 'bg-[var(--bg-surface)] text-slate-500 border-[var(--border)] hover:border-white/20'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {(formData.etaMode === 'CUSTOM') && (
                      <input 
                        type="time" 
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none mt-[5px]"
                        value={formData.eta}
                        onChange={e => setFormData({...formData, eta: e.target.value})}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-[10px] pt-[10px]">
                    <button type="submit" className="w-full py-[15px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-[8px] text-[14px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all">
                      SUBMIT TO LOG
                    </button>
                    <div className="grid grid-cols-2 gap-[10px]">
                      <button type="button" onClick={exportExcel} className="flex items-center justify-center gap-[10px] py-[10px] bg-white/5 hover:bg-white/10 text-slate-300 rounded-[8px] text-[10px] font-black uppercase border border-white/10 transition-all">
                        <FileSpreadsheet size={14} /> EXPORT
                      </button>
                      <button type="button" onClick={() => setShowBatchModal(true)} className="flex items-center justify-center gap-[10px] py-[10px] bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-[8px] text-[10px] font-black uppercase border border-orange-500/20 transition-all">
                        <Layout size={14} /> BATCH ADD
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.aside>




        </AnimatePresence>

        {/* Main Table */}
        <div className="lg:col-span-9 flex flex-col gap-[10px]">
          <div className="flex items-center justify-between gap-[10px] p-[10px]">
            <div className="flex items-center gap-[10px] bg-slate-900/50 p-[10px] rounded-[8px] border border-white/5 w-fit shadow-inner">
              {[
                { id: 'STR MODELING TEAM', img: '/Report/assets/logos/str.png', color: 'indigo' },
                { id: 'PT & REO TEAM', img: '/Report/assets/logos/pt.png', color: 'orange' },
                { id: 'MTO TEAM', img: '/Report/assets/logos/mto.png', color: 'violet' }
              ].map(team => (
                <button 
                  key={`filter-${team.id}`}
                  onClick={() => setFormData({...formData, team: team.id})}
                  className={`p-[5px] rounded-[8px] transition-all duration-500 relative group/btn ${
                    formData.team === team.id 
                      ? `ring-2 ring-indigo-500 bg-indigo-500/10 scale-110 shadow-lg shadow-indigo-500/20` 
                      : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:scale-105'
                  }`}
                  title={team.id}
                >
                  <img src={team.img} alt={team.id} className="w-8 h-8 rounded-[4px] object-contain" />
                </button>
              ))}
            </div>

            {showProjectGroups && (
              <div className="flex items-center gap-[10px] p-[10px]">
                <button 
                  onClick={expandAll}
                  className="px-[15px] py-[10px] bg-white/5 hover:bg-white/10 rounded-[8px] text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 transition-all"
                >
                  Expand All
                </button>
                <button 
                  onClick={collapseAll}
                  className="px-[15px] py-[10px] bg-white/5 hover:bg-white/10 rounded-[8px] text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 transition-all"
                >
                  Collapse All
                </button>
                {focusedProject && (
                  <button 
                    onClick={() => setFocusedProject(null)}
                    className="px-[15px] py-[10px] bg-rose-500/10 hover:bg-rose-500/20 rounded-[8px] text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/20 transition-all flex items-center gap-[10px]"
                  >
                    <X size={14} />
                    Reset Focus
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)] shadow-2xl overflow-hidden m-[10px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-header)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-[10px] w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-[4px] border border-[var(--border)] bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                        checked={selectedRows.size === filteredReportData.length && filteredReportData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(filteredReportData.map(r => r.id)))
                          } else {
                            setSelectedRows(new Set())
                          }
                        }}
                      />
                    </th>
                    <th className="p-[10px] cursor-pointer hover:bg-white/[0.05] transition-all group" onClick={() => handleSort('project')}>
                      <div className="flex items-center gap-[10px]">
                        Project
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'project' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-[10px] cursor-pointer hover:bg-white/[0.05] transition-all group" onClick={() => handleSort('task')}>
                      <div className="flex items-center gap-[10px]">
                        Task Analysis
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'task' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-[10px] cursor-pointer hover:bg-white/[0.05] transition-all group" onClick={() => handleSort('markupTime')}>
                      <div className="flex items-center gap-[10px]">
                        Timestamp
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'markupTime' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-[10px] relative">
                      <div className="flex items-center justify-between gap-[10px]">
                        <div 
                          className="flex items-center gap-[10px] cursor-pointer hover:text-slate-300 transition-colors group/header"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <div className="text-slate-600 group-hover/header:text-slate-400 transition-colors">
                            {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover/header:opacity-50"/>}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowStatusFilter(!showStatusFilter); }}
                          className={`p-[5px] rounded-[4px] transition-all ${visibleStatuses.length < ALL_STATUSES.length ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          <Filter size={12} />
                        </button>
                      </div>
                    </th>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <th key={d} className="p-[10px] text-center border-l border-[var(--border)]">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-wider">{d.substring(0, 2)}</span>
                          <span className="text-[9px] font-bold text-slate-500 opacity-50">{weekDates[i]}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-[10px] text-center">CMD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <AnimatePresence>
                    {showProjectGroups ? (
                      Object.entries(groupedData).map(([projectName, tasks]) => {
                        const isCollapsed = collapsedProjects[projectName]
                        return (
                          <React.Fragment key={projectName}>
                            {/* Project Header Row */}
                            <tr 
                                className={`sticky top-0 z-20 bg-[var(--table-sticky)] backdrop-blur-md border-y-2 border-indigo-500/20 cursor-pointer group/header hover:bg-indigo-500/5 transition-all ${focusedProject === projectName ? 'ring-1 ring-indigo-500 ring-inset' : ''}`}
                                onClick={() => toggleCollapse(projectName)}
                              >
                                <td colSpan={9} className="p-0">
                                  <div className="flex items-center justify-between p-[10px]">
                                    <div className="flex items-center gap-[10px]">
                                      <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} className="text-indigo-500">
                                        <ArrowDown size={14} />
                                      </motion.div>
                                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-lg"></div>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-[10px]">
                                          <span className="text-[14px] font-black text-white uppercase tracking-[0.2em] leading-none">{projectName}</span>
                                          <span className="px-[10px] py-[2px] bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-[4px] uppercase border border-indigo-500/30">
                                            {tasks.length} UNIT{tasks.length > 1 ? 'S' : ''}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-[10px]">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setFocusedProject(focusedProject === projectName ? null : projectName); }}
                                        className={`px-[15px] py-[10px] rounded-[8px] text-[10px] font-black uppercase tracking-widest border transition-all ${focusedProject === projectName ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-slate-500 border-white/5 hover:border-indigo-500/30 hover:text-indigo-400'}`}
                                      >
                                        {focusedProject === projectName ? 'EXIT FOCUS' : 'FOCUS'}
                                      </button>
                                      <Filter size={14} className={`transition-colors ${isCollapsed ? 'text-slate-600' : 'text-indigo-400'}`} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            
                            {/* Task Rows */}
                            {!isCollapsed && tasks.map((row, index) => (
                              <motion.tr 
                                key={row.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="hover:bg-[var(--bg-header)] transition-all group border-b border-[var(--border)]"
                                style={{ backgroundColor: index % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                              >
                                <td className="p-[10px] text-center">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded-[4px] border border-[var(--border)] bg-[var(--bg-surface)] text-indigo-500 focus:ring-0 cursor-pointer"
                                    checked={selectedRows.has(row.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedRows)
                                      if (e.target.checked) next.add(row.id)
                                      else next.delete(row.id)
                                      setSelectedRows(next)
                                    }}
                                  />
                                </td>
                                <td className="p-[10px]">
                                  <span className="text-indigo-400 text-[10px] font-black uppercase tracking-tighter">{row.project}</span>
                                </td>
                                <td className="p-[10px]">
                                  <div className="text-[10px] font-bold text-white tracking-tight uppercase leading-relaxed">{row.task}</div>
                                </td>
                                <td className="p-[10px]">
                                  <MarkupCell 
                                    id={row.id}
                                    markupDate={row.markupDate}
                                    markupTime={row.markupTime}
                                    isEditing={editingMarkup === row.id}
                                    onStartEdit={() => setEditingMarkup(row.id)}
                                    onCancelEdit={() => setEditingMarkup(null)}
                                    onSave={(id, data) => {
                                      updateMarkup(id, data);
                                      setEditingMarkup(null);
                                    }}
                                  />
                                </td>
                                <td className="p-[10px]">
                                  <select 
                                    className={`text-[10px] font-black py-[5px] px-[10px] rounded-[8px] border-none focus:ring-0 cursor-pointer transition-all shadow-lg ${getStatusColor(row.status).bg} ${getStatusColor(row.status).text}`}
                                    value={row.status}
                                    onChange={(e) => updateStatus(row.id, e.target.value)}
                                  >
                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                {DAYS_OF_WEEK.map(d => {
                                  const isEditing = editingCell && editingCell.id === row.id && editingCell.day === d
                                  return (
                                    <td key={d} className="p-[5px] text-center">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          className="bg-[var(--bg-surface)] border border-[var(--border)] text-white text-[10px] font-bold p-[5px] w-20 mx-auto text-center rounded-[8px] outline-none"
                                          defaultValue={row.days[d] || ''}
                                          autoFocus
                                          onBlur={(e) => { updateDayTime(row.id, d, e.target.value); setEditingCell(null); }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') { updateDayTime(row.id, d, e.target.value); setEditingCell(null); }
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                        />
                                      ) : (
                                        <span 
                                          className={`text-[10px] font-black tracking-tighter cursor-pointer px-[10px] py-[5px] rounded-[8px] transition-all hover:bg-white/10 ${row.days[d] ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20' : 'text-slate-600'}`}
                                          onClick={() => setEditingCell({ id: row.id, day: d })}
                                        >
                                          {row.days[d] || '—'}
                                        </span>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="p-[10px]">
                                  <div className="flex items-center justify-center gap-[5px] opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => moveRow(row.id, -1)} className="p-[10px] bg-white/5 hover:bg-indigo-500/20 rounded-[8px] text-slate-500 hover:text-indigo-400 transition-all"><ArrowUp size={12} /></button>
                                    <button onClick={() => moveRow(row.id, 1)} className="p-[10px] bg-white/5 hover:bg-indigo-500/20 rounded-[8px] text-slate-500 hover:text-indigo-400 transition-all"><ArrowDown size={12} /></button>
                                    <button onClick={() => deleteRow(row.id)} className="p-[10px] bg-rose-500/5 hover:bg-rose-500/20 rounded-[8px] text-rose-500/50 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      filteredReportData.map((row, i) => (
                        <motion.tr 
                          key={row.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="hover:bg-[var(--bg-header)] transition-all group border-b border-[var(--border)]"
                          style={{ backgroundColor: i % 2 === 0 ? 'var(--row-odd)' : 'var(--row-even)' }}
                        >
                          <td className="px-3 py-3">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-surface)] text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                              checked={selectedRows.has(row.id)}
                              onChange={(e) => {
                                const next = new Set(selectedRows)
                                if (e.target.checked) next.add(row.id)
                                else next.delete(row.id)
                                setSelectedRows(next)
                              }}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-indigo-400 text-[10px] font-black tracking-tight group-hover:text-indigo-300 transition-colors uppercase">{row.project}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[10px] font-bold text-[var(--text-main)] tracking-tight leading-relaxed">{row.task}</div>
                          </td>
                          <td className="px-3 py-3">
                            <MarkupCell 
                              id={row.id}
                              markupDate={row.markupDate}
                              markupTime={row.markupTime}
                              isEditing={editingMarkup === row.id}
                              onStartEdit={() => setEditingMarkup(row.id)}
                              onCancelEdit={() => setEditingMarkup(null)}
                              onSave={(id, data) => {
                                updateMarkup(id, data);
                                setEditingMarkup(null);
                              }}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select 
                              className={`text-[10px] font-black py-1.5 px-3 rounded-lg border-none focus:ring-0 cursor-pointer transition-all shadow-lg ${
                                row.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5' :
                                row.status === 'PENDING' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-slate-500/5' :
                                row.status === 'TMR' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-orange-500/5' :
                                row.status === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-rose-500/5' :
                                row.status === 'PLANNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/5' :
                                row.status === 'HIGH PRIORITY' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-violet-500/5' :
                                row.status === 'ISSUE' ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5' :
                                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5'
                              }`}
                              value={row.status}
                              onChange={(e) => updateStatus(row.id, e.target.value)}
                            >
                               {['WIP', 'DONE', 'PENDING', 'TMR', 'PLANNING', 'URGENT', 'HIGH PRIORITY', 'ISSUE'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          {DAYS_OF_WEEK.map(d => {
                            const isEditing = editingCell && editingCell.id === row.id && editingCell.day === d
                            return (
                              <td key={d} className="px-2 py-2 text-center">
                                {isEditing ? (
                                  <input
                                    type="time"
                                    className="bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-main)] text-[10px] font-bold p-1 w-20 mx-auto text-center rounded-lg"
                                    defaultValue={row.days[d] || ''}
                                    autoFocus
                                    onBlur={(e) => {
                                      updateDayTime(row.id, d, e.target.value)
                                      setEditingCell(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateDayTime(row.id, d, e.target.value)
                                        setEditingCell(null)
                                      }
                                      if (e.key === 'Escape') setEditingCell(null)
                                    }}
                                  />
                                ) : (
                                  <span 
                                    className={`text-[10px] font-black tracking-tight cursor-pointer px-2 py-0.5 rounded-md transition-all hover:bg-indigo-500/5 ${
                                      row.days[d] 
                                        ? 'text-indigo-500 bg-indigo-500/10 border border-indigo-500/20' 
                                        : 'text-[var(--text-muted)]'
                                    }`}
                                    onClick={() => setEditingCell({ id: row.id, day: d })}
                                    title="Click to edit"
                                  >
                                    {row.days[d] || '—'}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                              <button onClick={() => moveRow(row.id, -1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowUp size={14} strokeWidth={3} /></button>
                              <button onClick={() => moveRow(row.id, 1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowDown size={14} strokeWidth={3} /></button>
                              <button onClick={() => deleteRow(row.id)} className="p-2 bg-rose-500/5 hover:bg-rose-500/20 rounded-lg text-rose-500/50 hover:text-rose-500 transition-all"><Trash2 size={14} strokeWidth={3} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                  {filteredReportData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
                          <div className="p-8 bg-slate-800 rounded-full shadow-inner">
                            <FileSpreadsheet size={64} strokeWidth={1} />
                          </div>
                          <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">System Ready // No Logs Detected</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Statistics (Sticky on the right) */}
        <aside className="lg:col-span-3 space-y-4 sticky top-24">
          <div className="glass-panel p-4 border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Layout size={100} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight uppercase">Data Intelligence</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time Analytics</p>
                </div>
              </div>
            
            <div className="space-y-8">
              {/* Status Doughnut */}
              <div className="h-[220px] relative flex items-center justify-center">
                <Doughnut 
                  data={{
                    labels: Object.keys(stats.statusCounts),
                    datasets: [{
                      data: Object.values(stats.statusCounts),
                      backgroundColor: [
                        'rgba(16, 185, 129, 0.6)', // DONE
                        'rgba(100, 116, 139, 0.6)', // PENDING
                        'rgba(249, 115, 22, 0.6)', // TMR
                        'rgba(244, 63, 94, 0.6)',  // URGENT
                        'rgba(251, 191, 36, 0.6)', // PLANNING
                        'rgba(139, 92, 246, 0.6)', // HIGH PRIORITY
                        'rgba(239, 68, 68, 0.6)',  // ISSUE
                        'rgba(99, 102, 241, 0.6)',  // WIP
                      ],
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 2,
                      hoverOffset: 10
                    }]
                  }}
                  options={{
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { size: 10, weight: 'bold' },
                        bodyFont: { size: 10 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                      }
                    },
                    maintainAspectRatio: false,
                    cutout: '75%'
                  }}
                />
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tasks</span>
                  <span className="text-3xl font-black text-white">{stats.totalTasks}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Projects</p>
                  <p className="text-xl font-black text-indigo-400">{stats.uniqueProjects}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Done</p>
                  <p className="text-xl font-black text-emerald-400">{stats.doneTasks}</p>
                </div>
              </div>

              {/* Project Bar Chart */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Load</p>
                <div className="h-[150px]">
                  <Bar 
                    data={{
                      labels: Object.keys(stats.projectCounts).map(k => k.length > 8 ? k.substring(0, 8) + '...' : k),
                      datasets: [{
                        label: 'Tasks',
                        data: Object.values(stats.projectCounts),
                        backgroundColor: 'rgba(99, 102, 241, 0.4)',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      maintainAspectRatio: false,
                      scales: {
                        x: { display: false, grid: { display: false } },
                        y: { 
                          grid: { display: false },
                          ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } }
                        }
                      }
                    }}
                  />
              </div>
            </div>
          </div>
            </div>
          </div>

          <div className="glass-panel p-4 border-white/5 shadow-2xl">
              {/* Daily Activity Stats */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-indigo-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Intensity</h3>
                </div>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="group flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                        <span className={stats.dayCounts[day] > 0 ? 'text-indigo-300' : 'text-slate-600'}>{day}</span>
                        <span className={stats.dayCounts[day] > 0 ? 'text-white' : 'text-slate-700'}>{stats.dayCounts[day]}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(stats.dayCounts[day] / (stats.totalTasks || 1)) * 100}%` }}
                          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Automation Visual */}
              <div className="pt-[10px] border-t border-white/5 m-[10px]">
                <div className="flex items-center gap-[10px] mb-[10px]">
                  <Zap size={14} className="text-yellow-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Workflow</h3>
                </div>
                <div className="bg-slate-950/40 rounded-[8px] p-[10px] border border-white/5">
                  <WorkflowAnimation />
                </div>
              </div>
          </div>
        </aside>
      </div>

      {/* Bottom Dashboard / Project Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] pb-[10px]">
        <div className="bg-[var(--bg-card)] p-[10px] border border-[var(--border)] rounded-[8px] shadow-2xl lg:col-span-9 relative overflow-hidden m-[10px]">
          <KamehamehaAnimation />
          <div className="relative z-10 p-[10px]">
            <div className="flex items-center justify-between mb-[10px]">
              <div className="flex items-center gap-[10px]">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                <h2 className="text-[24px] font-black text-white tracking-tight uppercase italic">Workforce Distribution</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weekly Analysis</span>
            </div>
            
            <div className="flex flex-wrap gap-[10px]">
              {Array.from(new Set(filteredReportData.map(r => r.project))).map((proj, i) => {
                const count = filteredReportData.filter(r => r.project === proj).length
                return (
                  <div key={proj} className="px-[15px] py-[10px] bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border)] flex flex-col gap-[5px] hover:border-indigo-500/30 transition-all group">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{proj}</span>
                    <span className="text-[24px] font-black text-white group-hover:text-indigo-400 transition-colors leading-none">{count} <span className="text-[10px] text-slate-600 not-italic uppercase">tasks</span></span>
                  </div>
                )
              })}
              {filteredReportData.length === 0 && <p className="text-slate-500 text-[14px] font-bold p-[10px]">Waiting for operational data...</p>}
            </div>
          </div>
        </div>

        <div className="bg-indigo-500/5 p-[10px] border border-indigo-500/20 rounded-[8px] shadow-2xl overflow-hidden relative group lg:col-span-3 m-[10px]">
          <div className="relative z-10 p-[10px]">
            <h3 className="text-[14px] font-black text-white uppercase mb-[10px] italic">System Update</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-[15px] font-bold uppercase">
              The reporting system is now synced with the local database. Your progress is automatically saved to local storage.
            </p><div className="flex items-center gap-3 pt-4 border-t border-white/5"><div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400"><FileSpreadsheet size={16} /></div>
              </div>
              <div>
                <p className="text-[12px] font-black text-white">v2.1 Stable</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Ready for export</p>
              </div>
            </div>
          </div>
        </section>

      {/* Batch Add Modal */}
      <AnimatePresence>
        {showBatchModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-[10px]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBatchModal(false)} className="absolute inset-0 bg-[#0B0F1A]/90 backdrop-blur-xl" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-3xl bg-[var(--bg-card)] p-[20px] rounded-[8px] border border-[var(--border)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-[20px] relative z-10 p-[10px]">
                  <div className="flex items-center gap-[15px]">
                    <div className="p-[10px] bg-orange-500/10 rounded-[8px] text-orange-400 border border-orange-500/20">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h2 className="text-[30px] font-black text-white tracking-tight uppercase italic leading-none">Batch Engine</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Mass Operational Deployment</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBatchModal(false)} className="p-[10px] text-slate-500 hover:text-white transition-all text-[24px]">✕</button>
                </div>

                <div className="space-y-[15px] relative z-10 p-[10px]">
                  {/* Row 1: Projects */}
                  <div className="space-y-[10px] p-[10px] bg-white/[0.03] rounded-[8px] border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Portfolio</p>
                      <div className="flex items-center gap-[10px]">
                        <button type="button" onClick={() => setBatchProjects([...allProjects])} className="px-[10px] py-[5px] bg-indigo-500 text-white text-[10px] font-black uppercase rounded-[4px]">ALL</button>
                        <button type="button" onClick={() => setBatchProjects([])} className="px-[10px] py-[5px] bg-white/5 text-slate-500 text-[10px] font-black uppercase rounded-[4px]">CLEAR</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-[5px] max-h-32 overflow-y-auto custom-scrollbar">
                      {allProjects.map(p => {
                        const isSelected = batchProjects.includes(p)
                        return (
                          <button key={p} type="button" onClick={() => setBatchProjects(prev => isSelected ? prev.filter(x => x !== p) : [...prev, p])} className={`px-[10px] py-[5px] rounded-[4px] text-[10px] font-black uppercase border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-500 border-white/5'}`}>{p}</button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Row 2: Levels */}
                  <div className="space-y-[10px] p-[10px] bg-white/[0.03] rounded-[8px] border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Level Mapping</p>
                      <label className="flex items-center gap-[10px] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded-[4px] bg-slate-900 border-white/10" checked={batchLevelEnabled} onChange={e => { setBatchLevelEnabled(e.target.checked); if (!e.target.checked) setBatchLevelsText('') }} />
                        <span className="text-[10px] font-black text-slate-500 uppercase">Multi-Level Mode</span>
                      </label>
                    </div>
                    {batchLevelEnabled && (
                      <input type="text" className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[10px] text-[14px] font-bold text-white outline-none" placeholder="1, 2, 3, Roof..." value={batchLevelsText} onChange={e => setBatchLevelsText(e.target.value)} />
                    )}
                  </div>

                  {/* Workflow Selection */}
                  <div className="space-y-[10px] p-[10px] bg-white/[0.03] rounded-[8px] border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Process Matrix</p>
                      <div className="flex items-center gap-[10px]">
                        <button type="button" onClick={() => setBatchWorkflows([...currentWorkflow.col1, ...currentWorkflow.col2, ...currentWorkflow.col3])} className="px-[10px] py-[5px] bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-[4px]">ALL</button>
                        <button type="button" onClick={() => setBatchWorkflows([])} className="px-[10px] py-[5px] bg-white/5 text-slate-500 text-[10px] font-black uppercase rounded-[4px]">CLEAR</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-[5px]">
                      {[...currentWorkflow.col1, ...currentWorkflow.col2, ...currentWorkflow.col3].map(wf => {
                        const isSelected = batchWorkflows.includes(wf)
                        return (
                          <button key={wf} type="button" onClick={() => setBatchWorkflows(prev => isSelected ? prev.filter(x => x !== wf) : [...prev, wf])} className={`px-[10px] py-[5px] rounded-[4px] text-[10px] font-black uppercase border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-500 border-white/5'}`}>{wf}</button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Task Input */}
                  <div className="space-y-[10px]">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deployment Matrix (One per line)</label>
                      <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 px-[10px] py-[2px] rounded-[4px] border border-orange-500/20">{batchValidation.totalTasks} UNITS</span>
                    </div>
                    <textarea 
                      className="w-full h-40 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[15px] text-[14px] font-bold text-white outline-none focus:ring-2 focus:ring-orange-500/20 custom-scrollbar"
                      placeholder="REO BTM ALL&#10;REO TOP ALL"
                      value={batchTasksText}
                      onChange={(e) => setBatchTasksText(e.target.value)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-[10px] pt-[10px]">
                    <button onClick={() => setShowBatchModal(false)} className="flex-1 py-[15px] bg-white/5 hover:bg-white/10 text-slate-500 font-black text-[12px] uppercase rounded-[8px] border border-white/10 transition-all">CANCEL</button>
                    <button 
                      disabled={!batchValidation.isValid}
                      onClick={() => {
                        const tasks = generateTasks({
                          projectIds: batchProjects, levelEnabled: batchLevelEnabled, levels: batchLevelsText.split(',').map(l => l.trim()).filter(l => l !== ""),
                          workflows: batchWorkflows, rawLines: batchTasksText, team: formData.team, day: formData.day, eta: formData.eta, status: "PLANNING"
                        });
                        if (tasks.length > 0) { handleAddTask(null, tasks, { isDirectBatch: true }); setBatchTasksText(''); setBatchWorkflows([]); setShowBatchModal(false); }
                      }}
                      className={`flex-[2] py-[15px] font-black text-[12px] uppercase rounded-[8px] transition-all shadow-xl ${!batchValidation.isValid ? 'bg-slate-800 text-slate-600' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20'}`}
                    >
                      DEPLOY {batchValidation.totalTasks} TASKS
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence>

      {/* Bulk Edit Bar */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-[20px] left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-2xl m-[10px]">
            <div className="bg-indigo-600/90 backdrop-blur-xl p-[10px] border border-indigo-400/30 rounded-[8px] shadow-2xl flex items-center justify-between gap-[15px]">
              <div className="flex items-center gap-[10px] p-[10px]">
                <div className="bg-white text-indigo-600 p-[10px] rounded-[8px] shadow-lg"><Layout size={20} /></div>
                <div>
                  <p className="text-[14px] font-black text-white uppercase tracking-tight leading-none">{selectedRows.size} ROWS SELECTED</p>
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Bulk Command Active</p>
                </div>
              </div>
              <div className="flex items-center gap-[10px] flex-grow max-w-sm">
                <div className="w-1/2"><MarkupDateInput value={bulkMarkup.date} onChange={(val) => setBulkMarkup(prev => ({ ...prev, date: val }))} /></div>
                <div className="w-1/2"><MarkupTimeInput value={bulkMarkup.time} onChange={(val) => setBulkMarkup(prev => ({ ...prev, time: val }))} /></div>
              </div>
              <div className="flex items-center gap-[10px]">
                <button onClick={() => { bulkUpdateMarkup(Array.from(selectedRows), bulkMarkup); setSelectedRows(new Set()); setBulkMarkup({ date: null, time: null }); }} className="px-[20px] py-[10px] bg-white text-indigo-600 font-black text-[12px] uppercase rounded-[8px] transition-all shadow-lg shadow-white/10">APPLY</button>
                <button onClick={() => setSelectedRows(new Set())} className="p-[10px] text-white/50 hover:text-white transition-all">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

export default WeeklyReport
