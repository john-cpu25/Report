import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6']

const WeeklyReport = ({ 
  reportData, setReportData, selectedDate, setSelectedDate, weekDates, 
  formData, setFormData, handleAddTask, deleteRow, moveRow, updateStatus 
}) => {
  return (
    <main className="grid grid-cols-1 lg:grid-cols-4 gap-12">
      {/* Sidebar Form */}
      <aside className="lg:col-span-1">
        <div className="glass-panel p-8 sticky top-8 border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Entry Form</h2>
          </div>
          
          <form onSubmit={handleAddTask} className="space-y-6">
            <div className="space-y-2">
              <label>Project Name</label>
              <input 
                type="text" className="input bg-slate-950/40 border-white/10" placeholder="e.g. MORAY, LEEDS..."
                value={formData.project}
                onChange={e => setFormData({...formData, project: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label>Floor / Level</label>
              <input 
                type="text" className="input bg-slate-950/40 border-white/10" placeholder="e.g. L1, L12-24..."
                value={formData.level}
                onChange={e => setFormData({...formData, level: e.target.value})}
                required
              />
            </div>
            <div className="space-y-3">
              <label>Standard Workflow</label>
              <div className="grid grid-cols-2 gap-3">
                {['REO BTM', 'REO TOP', 'REO SHEAR', 'PT', 'BACK'].map(t => (
                  <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
                    <input 
                      type="checkbox" className="w-5 h-5 rounded-lg border-white/10 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer"
                      checked={formData.tasks.includes(t)}
                      onChange={e => {
                        const newTasks = e.target.checked 
                          ? [...formData.tasks, t]
                          : formData.tasks.filter(x => x !== t)
                        setFormData({...formData, tasks: newTasks})
                      }}
                    />
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">{t}</span>
                  </label>
                ))}
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
              <div className="space-y-2">
                <label>Report Date</label>
                <input 
                  type="date" className="input bg-slate-950/40 border-white/10 text-[11px]"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label>Day</label>
                <select 
                  className="input bg-slate-950/40 border-white/10 text-xs font-bold"
                  value={formData.day}
                  onChange={e => setFormData({...formData, day: e.target.value})}
                >
                  {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label>Current Status</label>
                <select 
                  className="input bg-slate-950/40 border-white/10 text-xs font-bold"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  {['DONE', 'PENDING', 'TMR', 'WIP'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label>ETA Time</label>
                <input 
                  type="time" className="input bg-slate-950/40 border-white/10 font-bold"
                  value={formData.eta}
                  onChange={e => setFormData({...formData, eta: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-6 py-4 text-sm tracking-widest shadow-xl shadow-indigo-500/20">
              SUBMIT TO LOG
            </button>
          </form>
        </div>
      </aside>

      {/* Main Table */}
      <div className="lg:col-span-3 space-y-6">
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
                            'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5'
                          }`}
                          value={row.status}
                          onChange={(e) => updateStatus(row.id, e.target.value)}
                        >
                          {['DONE', 'PENDING', 'TMR', 'WIP'].map(s => <option key={s} value={s}>{s}</option>)}
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
    </main>
  )
}

export default WeeklyReport
