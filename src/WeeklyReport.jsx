import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet, Layout, X, Filter } from 'lucide-react'
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

const WeeklyReport = ({ 
  reportData, setReportData, selectedDate, setSelectedDate, weekDates, 
  formData, setFormData, handleAddTask, deleteRow, moveRow, updateStatus,
  updateDayTime, updateMarkup, bulkUpdateMarkup, customProjects, addCustomProject, 
  allProjects, exportExcel, isSidebarOpen, setIsSidebarOpen, sidebarCollapsed
}) => {
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

    if (sortConfig.key || formData.showProjectGroups) {
      result.sort((a, b) => {
        // If grouping is enabled, project is always the primary sort
        if (formData.showProjectGroups && a.project !== b.project) {
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
  }, [reportData, formData.team, sortConfig, formData.showProjectGroups, focusedProject, visibleStatuses])

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
    <div className="relative min-h-screen">
      {/* Sidebar Overlay */}
      <AnimatePresence>
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">


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
          {isSidebarOpen && (
            <motion.aside 
              key="entry-form-aside"
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-20 bottom-0 w-[320px] lg:w-[360px] z-[51] p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-slate-950/80 backdrop-blur-2xl border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
              style={{ 
                left: typeof window !== 'undefined' && window.innerWidth >= 1024 
                  ? (sidebarCollapsed ? 72 : 260) 
                  : 0 
              }}
            >
              <div className="p-1 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <h2 className="text-lg font-black text-white tracking-tight uppercase">Entry Form</h2>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddProject(!showAddProject)}
                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-all"
                title="Add New Project"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {showAddProject && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mb-6 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-3"
              >
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Add New Project</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input bg-slate-950/60 text-[11px] h-9" 
                    placeholder="Project Name..."
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
                    className="px-3 bg-indigo-500 rounded-lg text-white font-bold text-xs"
                  >
                    ADD
                  </button>
                </div>
              </motion.div>
            )}
            
            <form onSubmit={(e) => { handleAddTask(e); setIsSidebarOpen(false); }} className="space-y-4">
              <div className="space-y-2">
                <label>Project Name</label>
                <select 
                  className="input bg-slate-950/40 border-white/10 text-xs font-bold"
                  value={formData.project}
                  onChange={e => setFormData({...formData, project: e.target.value})}
                  required
                >
                  <option value="" disabled>Select Project...</option>
                  {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label>Floor / Level</label>
                  <label className="flex items-center gap-2 cursor-pointer !mb-0">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                      checked={formData.showLevel}
                      onChange={e => setFormData({...formData, showLevel: e.target.checked, level: e.target.checked ? formData.level : ''})}
                    />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show</span>
                  </label>
                </div>
                {formData.showLevel && (
                  <input 
                    type="text" className="input bg-slate-950/40 border-white/10" placeholder="e.g. 1, 12, P1..."
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                    required={formData.showLevel}
                  />
                )}
              </div>
              <div className="space-y-3">
                <label>Standard Workflow</label>
                <div className="flex items-center justify-center gap-6 mb-4">
                  {[
                    { id: 'STR MODELING TEAM', img: '/Report/assets/logos/str.png', color: 'indigo' },
                    { id: 'PT & REO TEAM', img: '/Report/assets/logos/pt.png', color: 'orange' },
                    { id: 'MTO TEAM', img: '/Report/assets/logos/mto.png', color: 'violet' }
                  ].map(team => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setFormData({...formData, team: team.id, tasks: []})}
                      className={`p-1 rounded-xl transition-all duration-500 relative group/team ${
                        formData.team === team.id 
                          ? `ring-2 ring-${team.color}-500 bg-${team.color}-500/10 shadow-lg shadow-${team.color}-500/20 scale-110 z-10` 
                          : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white/5'
                      }`}
                      title={team.id}
                    >
                      <img src={team.img} alt={team.id} className="w-8 h-8 rounded-lg object-contain shadow-xl" />
                      {formData.team === team.id && (
                        <motion.div 
                          layoutId="team-indicator-sidebar"
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-${team.color}-500 shadow-[0_0_8px_#6366f1]`}
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Column 1 */}
                  <div className="space-y-2">
                    {currentWorkflow.col1.map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer group py-0.5">
                        <input 
                          type="checkbox" className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer shrink-0"
                          checked={formData.tasks.includes(t)}
                          onChange={e => {
                            const newTasks = e.target.checked 
                              ? [...formData.tasks, t]
                              : formData.tasks.filter(x => x !== t)
                            setFormData({...formData, tasks: newTasks})
                          }}
                        />
                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-wider leading-none">{t}</span>
                      </label>
                    ))}
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-2">
                    {currentWorkflow.col2.map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer group py-0.5">
                        <input 
                          type="checkbox" className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer shrink-0"
                          checked={formData.tasks.includes(t)}
                          onChange={e => {
                            const newTasks = e.target.checked 
                              ? [...formData.tasks, t]
                              : formData.tasks.filter(x => x !== t)
                            setFormData({...formData, tasks: newTasks})
                          }}
                        />
                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-wider leading-none">{t}</span>
                      </label>
                    ))}
                  </div>
                  {/* Column 3 */}
                  <div className="space-y-2">
                    {currentWorkflow.col3.map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer group py-0.5">
                        <input 
                          type="checkbox" className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer shrink-0"
                          checked={formData.tasks.includes(t)}
                          onChange={e => {
                            const newTasks = e.target.checked 
                              ? [...formData.tasks, t]
                              : formData.tasks.filter(x => x !== t)
                            setFormData({...formData, tasks: newTasks})
                          }}
                        />
                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300 transition-colors uppercase tracking-wider leading-none">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label>Additional Note</label>
                <input 
                  type="text" className="input bg-slate-950/40 border-white/10" placeholder="Custom comments..."
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Report Date</label>
                  <input 
                    type="date" className="input bg-slate-950/40 border-white/10 text-xs p-2.5 min-h-[42px] appearance-none"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label>Day</label>
                  <input 
                    type="text" className="input bg-slate-950/40 border-white/10 text-xs font-black p-2.5 min-h-[42px] opacity-60 cursor-not-allowed uppercase tracking-wider"
                    value={formData.day}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Status</label>
                  <select 
                    className="input bg-slate-950/40 border-white/10 text-[10px] font-bold p-2"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    {['WIP', 'DONE', 'PENDING', 'TMR', 'PLANNING', 'URGENT', 'HIGH PRIORITY', 'ISSUE'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>ETA Time</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { mode: 'MO', label: 'MO' },
                      { mode: 'AF', label: 'AF' },
                      { mode: 'CUSTOM', label: 'CUSTOM' },
                    ].map(opt => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => handleEtaMode(opt.mode)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${
                          formData.etaMode === opt.mode
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-white/15 hover:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(formData.etaMode === 'CUSTOM' || formData.etaMode === 'OVERTIME') && (
                    <input 
                      type="time" 
                      className={`input bg-slate-950/40 border-white/10 font-bold p-2 mt-1.5 text-xs ${
                        formData.etaMode === 'OVERTIME' ? 'border-rose-500/20 text-rose-300' : ''
                      }`}
                      value={formData.eta}
                      min={formData.etaMode === 'OVERTIME' ? '18:00' : undefined}
                      onChange={e => setFormData({...formData, eta: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-4 py-3 text-xs tracking-widest shadow-xl">
                SUBMIT TO LOG
              </button>
              <button type="button" onClick={exportExcel} className="btn w-full mt-2 py-3 text-xs tracking-widest shadow-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white flex justify-center items-center gap-2 border border-indigo-500/20 transition-all">
                <FileSpreadsheet size={16} />
                EXPORT FINAL XLSX
              </button>
              <button 
                type="button" 
                onClick={() => setShowBatchModal(true)} 
                className="btn w-full mt-2 py-3 text-xs tracking-widest shadow-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-white flex justify-center items-center gap-2 border border-orange-500/20 transition-all"
              >
                <Layout size={16} />
                BATCH ADD TASKS
              </button>
            </form>
            </div>
          </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Table */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 w-fit">
              {[
                { id: 'STR MODELING TEAM', img: '/Report/assets/logos/str.png', color: 'indigo' },
                { id: 'PT & REO TEAM', img: '/Report/assets/logos/pt.png', color: 'orange' },
                { id: 'MTO TEAM', img: '/Report/assets/logos/mto.png', color: 'violet' }
              ].map(team => (
                <button 
                  key={`filter-${team.id}`}
                  onClick={() => setFormData({...formData, team: team.id})}
                  className={`p-1 rounded-xl transition-all duration-500 relative group/btn ${
                    formData.team === team.id 
                      ? `ring-2 ring-${team.color}-500 bg-${team.color}-500/10 shadow-lg shadow-${team.color}-500/20 scale-110 z-10` 
                      : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white/5 hover:scale-105'
                  }`}
                  title={team.id}
                >
                  <img src={team.img} alt={team.id} className="w-8 h-8 rounded-lg object-contain shadow-xl" />
                  {formData.team === team.id && (
                    <motion.div 
                      layoutId="team-indicator-main"
                      className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-${team.color}-500 shadow-[0_0_12px_#6366f1]`}
                    />
                  )}
                </button>
              ))}
            </div>

            {formData.showProjectGroups && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={expandAll}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 transition-all"
                >
                  Expand All
                </button>
                <button 
                  onClick={collapseAll}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 transition-all"
                >
                  Collapse All
                </button>
                {focusedProject && (
                  <button 
                    onClick={() => setFocusedProject(null)}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/20 transition-all flex items-center gap-2"
                  >
                    <X size={14} />
                    Reset Focus
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-sm font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                    <th className="p-6 w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
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
                    <th className="p-6 cursor-pointer hover:bg-white/[0.05] transition-colors group" onClick={() => handleSort('project')}>
                      <div className="flex items-center gap-2">
                        Project
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'project' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-6 cursor-pointer hover:bg-white/[0.05] transition-colors group" onClick={() => handleSort('task')}>
                      <div className="flex items-center gap-2">
                        Task Details
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'task' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-6 cursor-pointer hover:bg-white/[0.05] transition-colors group" onClick={() => handleSort('markupTime')}>
                      <div className="flex items-center gap-2">
                        Markup Time
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'markupTime' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    <th className="p-6 relative">
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:text-slate-300 transition-colors group/header"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <div className="text-slate-600 group-hover/header:text-slate-400 transition-colors">
                            {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover/header:opacity-50"/>}
                          </div>
                        </div>
                        
                        {/* Status Filter Trigger */}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowStatusFilter(!showStatusFilter);
                            }}
                            className={`p-1.5 rounded-md transition-all ${
                              visibleStatuses.length < ALL_STATUSES.length 
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                                : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                            }`}
                            title="Filter Statuses"
                          >
                            <Filter size={14} fill={visibleStatuses.length < ALL_STATUSES.length ? "currentColor" : "none"} />
                          </button>

                          <AnimatePresence>
                            {showStatusFilter && (
                              <>
                                {/* Click-away overlay */}
                                <div 
                                  className="fixed inset-0 z-[60]" 
                                  onClick={() => setShowStatusFilter(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute right-0 top-full mt-2 w-56 z-[70] glass-panel bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-2xl p-2"
                                >
                                  <div className="p-2 border-b border-white/5 mb-2 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Filter Status</span>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setVisibleStatuses(ALL_STATUSES)}
                                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                                      >
                                        All
                                      </button>
                                      <button 
                                        onClick={() => setVisibleStatuses([])}
                                        className="text-xs font-black text-slate-500 hover:text-slate-400 uppercase tracking-widest"
                                      >
                                        None
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                    {ALL_STATUSES.map(s => {
                                      const isSelected = visibleStatuses.includes(s);
                                      const colors = getStatusColor(s);
                                      return (
                                        <label 
                                          key={s} 
                                          className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                            isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-transparent border border-transparent hover:bg-white/5'
                                          }`}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (isSelected) {
                                              setVisibleStatuses(visibleStatuses.filter(x => x !== s));
                                            } else {
                                              setVisibleStatuses([...visibleStatuses, s]);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.bg.replace('/10', '')} shadow-[0_0_8px_currentColor]`} />
                                            <span className={`text-[11px] font-bold uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                              {s}
                                            </span>
                                          </div>
                                          
                                          <div className={`w-8 h-4 rounded-full relative transition-all duration-300 flex-shrink-0 ${
                                            isSelected ? 'bg-indigo-500' : 'bg-slate-800'
                                          }`}>
                                            <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${
                                              isSelected ? 'left-[18px]' : 'left-0.5'
                                            }`} />
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="mt-2 p-2 border-t border-white/5 flex justify-end">
                                    <button 
                                      onClick={() => setShowStatusFilter(false)}
                                      className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-md hover:bg-indigo-600 transition-all"
                                    >
                                      Apply Filter
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </th>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <th key={d} className="p-6 text-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-300 font-black text-xs uppercase tracking-wider">{d === 'Wednesday' ? 'We' : d.substring(0, 2)}</span>
                          <span className="text-xs font-bold text-slate-500 tracking-tight opacity-50">{weekDates[i]}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence>
                    {formData.showProjectGroups ? (
                      Object.entries(groupedData).map(([projectName, tasks]) => {
                        const isCollapsed = collapsedProjects[projectName]
                        return (
                          <React.Fragment key={projectName}>
                            {/* Project Header Row */}
                            <tr 
                              className={`sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-y-2 border-indigo-500/20 cursor-pointer group/header hover:bg-indigo-500/5 transition-all ${focusedProject === projectName ? 'ring-1 ring-indigo-500 ring-inset' : ''}`}
                              onClick={() => toggleCollapse(projectName)}
                            >
                              <td colSpan={9} className="p-0">
                                <div className="flex items-center justify-between px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <motion.div 
                                      animate={{ rotate: isCollapsed ? 0 : 90 }}
                                      className="text-indigo-400"
                                    >
                                      <ArrowDown size={14} strokeWidth={3} />
                                    </motion.div>
                                    <div className="w-2 h-6 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366f1]"></div>
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-black text-white uppercase tracking-[0.3em] leading-none">{projectName}</span>
                                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs font-black rounded-md uppercase tracking-widest border border-indigo-500/30">
                                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                        </span>
                                      </div>
                                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1 opacity-60">Project Milestone Group</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFocusedProject(focusedProject === projectName ? null : projectName)
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
                                        focusedProject === projectName 
                                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                                          : 'bg-white/5 text-slate-400 border-white/5 hover:border-indigo-500/30 hover:text-indigo-400'
                                      }`}
                                    >
                                      {focusedProject === projectName ? 'Exit Focus' : 'Focus Project'}
                                    </button>
                                    <div className="h-[1px] w-16 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
                                    <Filter size={14} className={`transition-colors ${isCollapsed ? 'text-slate-600' : 'text-indigo-400'}`} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Task Rows */}
                            {!isCollapsed && tasks.map((row) => (
                              <motion.tr 
                                key={row.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="hover:bg-white/[0.02] transition-all group border-b border-white/[0.04]"
                              >
                                <td className="p-6">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                                    checked={selectedRows.has(row.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedRows)
                                      if (e.target.checked) next.add(row.id)
                                      else next.delete(row.id)
                                      setSelectedRows(next)
                                    }}
                                  />
                                </td>
                                <td className="p-6">
                                  <span className="text-indigo-400 font-black tracking-tight group-hover:text-indigo-300 transition-colors uppercase">{row.project}</span>
                                </td>
                                <td className="p-6">
                                  <div className="text-sm font-bold text-slate-200 tracking-tight leading-relaxed">{row.task}</div>
                                </td>
                                <td className="p-4">
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
                                <td className="p-6">
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
                                  const colors = getStatusColor(row.status)
                                  const isEditing = editingCell && editingCell.id === row.id && editingCell.day === d
                                  return (
                                    <td key={d} className="p-4 text-center">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          className="input bg-slate-950/80 border-indigo-500/30 text-xs font-bold p-1.5 w-24 mx-auto text-center"
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
                                          className={`text-xs font-black tracking-tight cursor-pointer px-2.5 py-1 rounded-md transition-all hover:ring-1 hover:ring-white/20 ${
                                            row.days[d] 
                                              ? `${colors.text} ${colors.bg} ${colors.border} border` 
                                              : 'text-slate-600 hover:text-slate-400'
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
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => moveRow(row.id, -1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowUp size={14} strokeWidth={3} /></button>
                                    <button onClick={() => moveRow(row.id, 1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowDown size={14} strokeWidth={3} /></button>
                                    <button onClick={() => deleteRow(row.id)} className="p-2 bg-rose-500/5 hover:bg-rose-500/20 rounded-lg text-rose-500/50 hover:text-rose-500 transition-all"><Trash2 size={14} strokeWidth={3} /></button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      filteredReportData.map((row) => (
                        <motion.tr 
                          key={row.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="hover:bg-white/[0.02] transition-all group"
                        >
                          <td className="p-6">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                              checked={selectedRows.has(row.id)}
                              onChange={(e) => {
                                const next = new Set(selectedRows)
                                if (e.target.checked) next.add(row.id)
                                else next.delete(row.id)
                                setSelectedRows(next)
                              }}
                            />
                          </td>
                          <td className="p-6">
                            <span className="text-indigo-400 font-black tracking-tight group-hover:text-indigo-300 transition-colors uppercase">{row.project}</span>
                          </td>
                          <td className="p-6">
                            <div className="text-sm font-bold text-slate-200 tracking-tight leading-relaxed">{row.task}</div>
                          </td>
                          <td className="p-4">
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
                          <td className="p-6">
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
                            const colors = getStatusColor(row.status)
                            const isEditing = editingCell && editingCell.id === row.id && editingCell.day === d
                            return (
                              <td key={d} className="p-4 text-center">
                                {isEditing ? (
                                  <input
                                    type="time"
                                    className="input bg-slate-950/80 border-indigo-500/30 text-xs font-bold p-1.5 w-24 mx-auto text-center"
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
                                    className={`text-xs font-black tracking-tight cursor-pointer px-2.5 py-1 rounded-md transition-all hover:ring-1 hover:ring-white/20 ${
                                      row.days[d] 
                                        ? `${colors.text} ${colors.bg} ${colors.border} border` 
                                        : 'text-slate-600 hover:text-slate-400'
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
                          <td className="p-4">
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

        {/* Right Sidebar - Statistics (Always on the right) */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 border-white/5 shadow-2xl bg-slate-900/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Data Intelligence</h2>
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

          <div className="glass-panel p-6 border-white/5 shadow-2xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Daily Activity</h3>
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 w-6">{d}</span>
                  <div className="flex-grow h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.dayCounts[d] / (stats.totalTasks || 1)) * 100}%` }}
                      className="h-full bg-indigo-500/40"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">{stats.dayCounts[d]}</span>
                </div>
              ))}
            </div>
            <WorkflowAnimation />
          </div>
        </aside>
      </div>

      {/* Bottom Dashboard / Project Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        <div className="glass-panel p-8 border-white/5 shadow-2xl lg:col-span-9 relative overflow-hidden">
          <KamehamehaAnimation />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Workforce Distribution</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weekly Overview</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(filteredReportData.map(r => r.project))).map((proj, i) => {
              const count = filteredReportData.filter(r => r.project === proj).length
              return (
                <div key={proj} className="px-6 py-4 bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col gap-1 hover:border-indigo-500/30 transition-all group">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{proj}</span>
                  <span className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{count} <span className="text-xs text-slate-600 not-italic uppercase tracking-tight">tasks</span></span>
                </div>
              )
            })}
            {filteredReportData.length === 0 && <p className="text-slate-500 text-sm py-4">No data available for distribution analysis.</p>}
          </div>
        </div>
      </div>

        <div className="glass-panel p-8 border-white/5 shadow-2xl bg-indigo-500/5 overflow-hidden relative group lg:col-span-3">
          <div className="relative z-10">
            <h3 className="text-lg font-black text-white uppercase mb-4">System Update</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              The reporting system is now synced with the local database. Your progress is automatically saved to local storage.
            </p>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white">v2.1 Stable</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase">Ready for export</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layout size={160} />
          </div>
        </div>
      </section>

      {/* Batch Add Modal */}
      <AnimatePresence>
        {showBatchModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBatchModal(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-3xl glass-panel p-8 border-white/10 shadow-2xl bg-slate-900 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="absolute -right-12 -top-12 p-24 opacity-[0.03] pointer-events-none">
                  <Layout size={240} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400 border border-orange-500/20">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight uppercase">Batch Add Tasks</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Power Tool — Create multiple rows instantly</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowBatchModal(false)}
                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-5 relative z-10">
                  {/* Row 1: Projects (Multi-select) */}
                  <div className="space-y-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Projects</p>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setBatchProjects([...allProjects])}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest rounded-lg border border-indigo-500/20 transition-all"
                        >
                          All
                        </button>
                        <button 
                          type="button"
                          onClick={() => setBatchProjects([])}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                      {allProjects.map(p => {
                        const isSelected = batchProjects.includes(p)
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setBatchProjects(prev => 
                                isSelected ? prev.filter(x => x !== p) : [...prev, p]
                              )
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${
                              isSelected
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : 'bg-slate-950/40 text-slate-600 border-white/5 hover:text-slate-400'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Row 2: Levels */}
                  <div className="space-y-2 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level / Floor (Multi-input)</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                          checked={batchLevelEnabled}
                          onChange={e => { setBatchLevelEnabled(e.target.checked); if (!e.target.checked) setBatchLevelsText('') }}
                        />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enable Multi-Level</span>
                      </label>
                    </div>
                    {batchLevelEnabled ? (
                      <div className="space-y-2">
                        <input 
                          type="text" className="input bg-slate-950/60 border-white/10 w-full text-xs" 
                          placeholder="Separate levels by comma: 1, 2, 3, Roof, B1..."
                          value={batchLevelsText}
                          onChange={e => setBatchLevelsText(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">Example: 1, 2, 5, 10, Roof</p>
                      </div>
                    ) : (
                      <div className="input bg-slate-950/30 border-white/5 text-slate-600 cursor-not-allowed flex items-center text-xs">Level Disabled (Tasks will be created with no level)</div>
                    )}
                  </div>

                  {/* Workflow Selection */}
                  <div className="space-y-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Workflow</p>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setBatchWorkflows([...currentWorkflow.col1, ...currentWorkflow.col2, ...currentWorkflow.col3])}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest rounded-lg border border-indigo-500/20 transition-all"
                        >
                          Select All
                        </button>
                        <button 
                          type="button"
                          onClick={() => setBatchWorkflows([])}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...currentWorkflow.col1, ...currentWorkflow.col2, ...currentWorkflow.col3].map(wf => {
                        const isSelected = batchWorkflows.includes(wf)
                        return (
                          <button
                            key={wf}
                            type="button"
                            onClick={() => {
                              setBatchWorkflows(prev => 
                                isSelected ? prev.filter(x => x !== wf) : [...prev, wf]
                              )
                            }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                              isSelected
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                                : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-white/15 hover:text-slate-300'
                            }`}
                          >
                            {wf}
                          </button>
                        )
                      })}
                    </div>
                    {batchWorkflows.length > 0 && (
                      <p className="text-xs text-indigo-400/60 font-bold">
                        Each task line × {batchWorkflows.length} workflow{batchWorkflows.length > 1 ? 's' : ''} = cross-product generation
                      </p>
                    )}
                  </div>

                  {/* Task Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Task Details (One per line)</label>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border ${
                        batchValidation.totalTasks > 0 
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                          : 'text-slate-600 bg-white/5 border-white/5'
                      }`}>
                        {batchValidation.totalTasks} task{batchValidation.totalTasks !== 1 ? 's' : ''} will be created
                      </span>
                    </div>
                    <textarea 
                      className="w-full h-40 bg-slate-950/60 border border-white/10 rounded-2xl p-6 text-sm font-medium text-slate-200 placeholder:text-slate-700 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all custom-scrollbar outline-none"
                      placeholder={'E.g.\nREO BTM ALL\nREO TOP ALL\nSHEAR REO\nCORE WALL REO'}
                      value={batchTasksText}
                      onChange={(e) => setBatchTasksText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && batchValidation.isValid) {
                          e.preventDefault()
                          const tasks = generateTasks({
                            projectIds: batchProjects,
                            levelEnabled: batchLevelEnabled,
                            levels: batchLevelsText.split(',').map(l => l.trim()).filter(l => l !== ""),
                            workflows: batchWorkflows,
                            rawLines: batchTasksText,
                            team: formData.team,
                            day: formData.day,
                            eta: formData.eta,
                            status: "PLANNING"
                          });
                          if (tasks.length > 0) {
                            handleAddTask(null, tasks, { isDirectBatch: true });
                            setBatchTasksText('')
                            setBatchWorkflows([])
                            setShowBatchModal(false)
                          }
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-500 px-2 flex justify-between">
                      <span>Note: Each line × selected workflows = individual task entries.</span>
                      <span className="text-indigo-400/50">Ctrl + Enter to deploy</span>
                    </p>
                  </div>

                  {/* Preview */}
                  {batchValidation.isValid && (
                    <div className="space-y-2 p-4 bg-white/[0.02] rounded-2xl border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Preview (first 10 generated tasks)</p>
                      {(() => {
                        const lines = batchTasksText.split('\n').filter(t => t.trim())
                        const effectiveLines = lines.length > 0 ? lines.slice(0, 3) : [""]
                        const levels = batchLevelsText.split(',').map(l => l.trim()).filter(l => l !== "").slice(0, 1)
                        const effectiveLevels = batchLevelEnabled ? (levels.length > 0 ? levels : []) : [null]

                        return batchProjects.slice(0, 1).flatMap(proj => 
                          effectiveLevels.flatMap(level =>
                            effectiveLines.flatMap(line => 
                              batchWorkflows.map(wf => ({ proj, level, task: `${line.trim()} ${wf}`.trim() }))
                            )
                          )
                        ).slice(0, 10).map((item, i) => (
                          <div key={i} className="text-[11px] text-slate-400 font-mono py-0.5 flex items-center gap-2">
                            <span className="text-indigo-500/40 text-xs">{String(i+1).padStart(2, '0')}</span>
                            <span className="text-indigo-300/80">{item.proj}</span>
                            <span className="text-slate-600">›</span>
                            {batchLevelEnabled && item.level && <><span className="text-violet-400">L{item.level}</span><span className="text-slate-600">›</span></>}
                            <span className="text-slate-200">{item.task || '(no detail)'}</span>
                          </div>
                        ))
                      })()}
                      {batchValidation.totalTasks > 10 && <p className="text-xs text-slate-600">...and {batchValidation.totalTasks - 10} more</p>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setShowBatchModal(false)}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs tracking-[0.2em] rounded-2xl transition-all border border-white/5"
                    >
                      CANCEL
                    </button>
                    <button 
                      disabled={!batchValidation.isValid}
                      onClick={() => {
                        const tasks = generateTasks({
                          projectIds: batchProjects,
                          levelEnabled: batchLevelEnabled,
                          levels: batchLevelsText.split(',').map(l => l.trim()).filter(l => l !== ""),
                          workflows: batchWorkflows,
                          rawLines: batchTasksText,
                          team: formData.team,
                          day: formData.day,
                          eta: formData.eta,
                          status: "Planning"
                        });
                        if (tasks.length > 0) {
                          handleAddTask(null, tasks, { isDirectBatch: true });
                          setBatchTasksText('')
                          setBatchWorkflows([])
                          setShowBatchModal(false)
                        }
                      }}
                      className={`flex-[2] px-12 py-4 font-black text-xs tracking-[0.2em] rounded-2xl transition-all shadow-xl ${
                        !batchValidation.isValid
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20'
                      }`}
                    >
                      DEPLOY {batchValidation.totalTasks} TASK{batchValidation.totalTasks !== 1 ? 'S' : ''}
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
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-2xl"
          >
            <div className="glass-panel p-4 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.2)] flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Layout size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest leading-none">{selectedRows.size} Rows Selected</p>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter mt-1">Bulk Action Mode</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-grow max-w-sm">
                <div className="w-1/2">
                  <MarkupDateInput 
                    value={bulkMarkup.date} 
                    onChange={(val) => setBulkMarkup(prev => ({ ...prev, date: val }))}
                  />
                </div>
                <div className="w-1/2">
                  <MarkupTimeInput 
                    value={bulkMarkup.time} 
                    onChange={(val) => setBulkMarkup(prev => ({ ...prev, time: val }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    bulkUpdateMarkup(Array.from(selectedRows), bulkMarkup);
                    setSelectedRows(new Set());
                    setBulkMarkup({ date: null, time: null });
                  }}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  APPLY
                </button>
                <button 
                  onClick={() => setSelectedRows(new Set())}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
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
