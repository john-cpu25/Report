import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet, Layout } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkflowAnimation from './WorkflowAnimation'
import projectsData from './data/projects.json'
import KamehamehaAnimation from './KamehamehaAnimation'
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

const WeeklyReport = ({ 
  reportData, setReportData, selectedDate, setSelectedDate, weekDates, 
  formData, setFormData, handleAddTask, deleteRow, moveRow, updateStatus,
  updateDayTime, customProjects, addCustomProject, exportExcel,
  isSidebarOpen, setIsSidebarOpen
}) => {
  const [newProjectName, setNewProjectName] = React.useState('')
  const [showAddProject, setShowAddProject] = React.useState(false)
  const [sortConfig, setSortConfig] = React.useState({ key: 'project', direction: 'asc' })
  const [editingCell, setEditingCell] = React.useState(null) // { id, day }

  const allProjects = React.useMemo(() => {
    return [...projectsData, ...customProjects].sort()
  }, [customProjects])

  const filteredReportData = React.useMemo(() => {
    let result = reportData.filter(r => r.team === formData.team)
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] || ''
        let bVal = b[sortConfig.key] || ''
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [reportData, formData.team, sortConfig])

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
    col2: ['PT', 'REO', 'PT&REO'], 
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
      case 'PLANING': return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
      default: return { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' } // WIP
    }
  }

  const handleEtaMode = (mode) => {
    if (mode === '12:30') {
      setFormData({...formData, etaMode: '12:30', eta: '12:30'})
    } else if (mode === '17:30') {
      setFormData({...formData, etaMode: '17:30', eta: '17:30'})
    } else if (mode === 'CUSTOM') {
      setFormData({...formData, etaMode: 'CUSTOM', eta: ''})
    } else if (mode === 'OVERTIME') {
      setFormData({...formData, etaMode: 'OVERTIME', eta: '18:00'})
    }
  }

  return (
    <div className="relative">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <main className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-6 items-start">
        {/* Sidebar Form */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-screen w-[320px] z-50 p-6 overflow-y-auto custom-scrollbar"
            >
              <div className="glass-panel p-6 border-white/10 shadow-2xl bg-slate-900/90 backdrop-blur-2xl h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <h2 className="text-lg font-black text-white tracking-tight uppercase italic">Entry Form</h2>
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
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Show</span>
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
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider leading-none">{t}</span>
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
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider leading-none">{t}</span>
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
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider leading-none">{t}</span>
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
                    {['WIP', 'DONE', 'PENDING', 'TMR', 'PLANING', 'URGENT'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>ETA Time</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { mode: '12:30', label: '12:30 PM' },
                      { mode: '17:30', label: '17:30 PM' },
                      { mode: 'CUSTOM', label: 'CUSTOM' },
                      { mode: 'OVERTIME', label: 'OVERTIME' },
                    ].map(opt => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => handleEtaMode(opt.mode)}
                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          formData.etaMode === opt.mode
                            ? opt.mode === 'OVERTIME' 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-lg shadow-rose-500/10'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
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
            </form>
            </div>
          </motion.aside>
        )}
        </AnimatePresence>

        {/* Main Table */}
        <div className="lg:col-span-12 xl:col-span-9 2xl:col-span-9 space-y-4">
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

          <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5">
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
                    <th className="p-6 cursor-pointer hover:bg-white/[0.05] transition-colors group" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-2">
                        Status
                        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                          {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}
                        </div>
                      </div>
                    </th>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <th key={d} className="p-6 text-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-300 font-black">{d}</span>
                          <span className="text-[9px] font-bold text-slate-500 tracking-tight opacity-50">{weekDates[i]}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence>
                    {filteredReportData.map((row, idx) => (
                      <motion.tr 
                        key={row.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="hover:bg-white/[0.02] transition-all group"
                      >
                        <td className="p-6">
                          <span className="text-indigo-400 font-black tracking-tight group-hover:text-indigo-300 transition-colors uppercase italic">{row.project}</span>
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-bold text-slate-200 tracking-tight leading-relaxed">{row.task}</div>
                        </td>
                        <td className="p-6">
                          <select 
                            className={`text-[10px] font-black py-1.5 px-3 rounded-lg border-none focus:ring-0 cursor-pointer transition-all shadow-lg ${
                              row.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5' :
                              row.status === 'PENDING' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-slate-500/5' :
                              row.status === 'TMR' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-orange-500/5' :
                              row.status === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-rose-500/5' :
                              row.status === 'PLANING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/5' :
                              'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5'
                            }`}
                            value={row.status}
                            onChange={(e) => updateStatus(row.id, e.target.value)}
                          >
                            {['WIP', 'DONE', 'PENDING', 'TMR', 'PLANING', 'URGENT'].map(s => <option key={s} value={s}>{s}</option>)}
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

        {/* Right Sidebar - Statistics */}
        <aside className="lg:col-span-12 xl:col-span-3 2xl:col-span-3 space-y-6">
          <div className="glass-panel p-6 border-white/5 shadow-2xl bg-slate-900/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase italic">Data Intelligence</h2>
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
                        'rgba(251, 191, 36, 0.6)', // PLANING
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
                  <span className="text-3xl font-black text-white italic">{stats.totalTasks}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Projects</p>
                  <p className="text-xl font-black text-indigo-400 italic">{stats.uniqueProjects}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Done</p>
                  <p className="text-xl font-black text-emerald-400 italic">{stats.doneTasks}</p>
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
      </main>

      {/* Bottom Dashboard / Project Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        <div className="glass-panel p-8 border-white/5 shadow-2xl lg:col-span-9 relative overflow-hidden">
          <KamehamehaAnimation />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Workforce Distribution</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Weekly Overview</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(filteredReportData.map(r => r.project))).map((proj, i) => {
              const count = filteredReportData.filter(r => r.project === proj).length
              return (
                <div key={proj} className="px-6 py-4 bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col gap-1 hover:border-indigo-500/30 transition-all group">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{proj}</span>
                  <span className="text-2xl font-black text-white italic group-hover:text-indigo-400 transition-colors">{count} <span className="text-xs text-slate-600 not-italic uppercase tracking-tight">tasks</span></span>
                </div>
              )
            })}
            {filteredReportData.length === 0 && <p className="text-slate-500 text-sm italic py-4">No data available for distribution analysis.</p>}
          </div>
        </div>
      </div>

        <div className="glass-panel p-8 border-white/5 shadow-2xl bg-indigo-500/5 overflow-hidden relative group lg:col-span-3">
          <div className="relative z-10">
            <h3 className="text-lg font-black text-white uppercase italic mb-4">System Update</h3>
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
    </div>
  )
}

export default WeeklyReport
