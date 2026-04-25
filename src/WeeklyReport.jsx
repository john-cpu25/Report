import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet, Layout } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkflowAnimation from './WorkflowAnimation'
import projectsData from './data/projects.json'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const WeeklyReport = ({ 
  reportData, setReportData, selectedDate, setSelectedDate, weekDates, 
  formData, setFormData, handleAddTask, deleteRow, moveRow, updateStatus,
  customProjects, addCustomProject
}) => {
  const [newProjectName, setNewProjectName] = React.useState('')
  const [showAddProject, setShowAddProject] = React.useState(false)

  const allProjects = React.useMemo(() => {
    return [...projectsData, ...customProjects].sort()
  }, [customProjects])

  const stats = React.useMemo(() => {
    const totalTasks = reportData.length
    const doneTasks = reportData.filter(r => r.status === 'DONE').length
    const uniqueProjects = new Set(reportData.map(r => r.project)).size
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
    
    // Day distribution
    const dayCounts = DAYS_OF_WEEK.reduce((acc, d) => {
      acc[d] = reportData.filter(r => r.days[d]).length
      return acc
    }, {})

    return { totalTasks, doneTasks, uniqueProjects, completionRate, dayCounts }
  }, [reportData])

  const WORKFLOW_ITEMS = [
    { col1: ['REO BTM', 'REO TOP', 'REO SHEAR', 'PT'], col2: ['PT&REO', 'BACKDRAFTING'] }
  ]

  return (
    <div className="space-y-12">
      <main className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-6 items-start">
        {/* Sidebar Form */}
        <aside className="lg:col-span-12 xl:col-span-3 2xl:col-span-2">
          <div className="glass-panel p-6 sticky top-8 border-white/5 shadow-2xl">
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
            
            <form onSubmit={handleAddTask} className="space-y-4">
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
                <label>Floor / Level</label>
                <input 
                  type="number" className="input bg-slate-950/40 border-white/10" placeholder="e.g. 1, 12..."
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-3">
                <label>Standard Workflow</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-2.5">
                    {WORKFLOW_ITEMS[0].col1.map(t => (
                      <label key={t} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
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
                        <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider leading-none">{t}</span>
                      </label>
                    ))}
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-2.5">
                    {WORKFLOW_ITEMS[0].col2.map(t => (
                      <label key={t} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
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
                        <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider leading-none">{t}</span>
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
                  <input 
                    type="time" className="input bg-slate-950/40 border-white/10 font-bold p-2"
                    value={formData.eta}
                    onChange={e => setFormData({...formData, eta: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-4 py-3 text-xs tracking-widest shadow-xl">
                SUBMIT TO LOG
              </button>
            </form>
          </div>
        </aside>

        {/* Main Table */}
        <div className="lg:col-span-12 xl:col-span-6 2xl:col-span-7 space-y-6">
          <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5">
                    <th className="p-6">Project</th>
                    <th className="p-6">Task Details</th>
                    <th className="p-6">Status</th>
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
                    {reportData.map((row, idx) => (
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
                        {DAYS_OF_WEEK.map(d => (
                          <td key={d} className="p-6 text-center">
                            <span className="text-xs font-black text-slate-300 tracking-tight group-hover:text-white transition-colors">{row.days[d] || '—'}</span>
                          </td>
                        ))}
                        <td className="p-6">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => moveRow(idx, -1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowUp size={14} strokeWidth={3} /></button>
                            <button onClick={() => moveRow(idx, 1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><ArrowDown size={14} strokeWidth={3} /></button>
                            <button onClick={() => deleteRow(row.id)} className="p-2 bg-rose-500/5 hover:bg-rose-500/20 rounded-lg text-rose-500/50 hover:text-rose-500 transition-all"><Trash2 size={14} strokeWidth={3} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {reportData.length === 0 && (
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
          <div className="glass-panel p-8 border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Live Stats</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tasks</p>
                <p className="text-4xl font-black text-white italic">{stats.totalTasks}</p>
              </div>
              <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Unique Projects</p>
                <p className="text-4xl font-black text-indigo-400 italic">{stats.uniqueProjects}</p>
              </div>
              <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completion</p>
                  <p className="text-2xl font-black text-emerald-400 italic">{stats.completionRate}%</p>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completionRate}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 border-white/5 shadow-2xl">
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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
        <div className="glass-panel p-8 border-white/5 shadow-2xl md:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Workforce Distribution</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Weekly Overview</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(reportData.map(r => r.project))).map((proj, i) => {
              const count = reportData.filter(r => r.project === proj).length
              return (
                <div key={proj} className="px-6 py-4 bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col gap-1 hover:border-indigo-500/30 transition-all group">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{proj}</span>
                  <span className="text-2xl font-black text-white italic group-hover:text-indigo-400 transition-colors">{count} <span className="text-xs text-slate-600 not-italic uppercase tracking-tight">tasks</span></span>
                </div>
              )
            })}
            {reportData.length === 0 && <p className="text-slate-500 text-sm italic py-4">No data available for distribution analysis.</p>}
          </div>
        </div>

        <div className="glass-panel p-8 border-white/5 shadow-2xl bg-indigo-500/5 overflow-hidden relative group">
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
