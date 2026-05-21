import React from 'react'
import { ArrowUp, ArrowDown, FileSpreadsheet, Filter, Activity, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkflowAnimation from './WorkflowAnimation'

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
    reportData,
    weekDates,
    showProjectGroups,
    dashboardProjects,
  } = useApp();

  const [sortConfig, setSortConfig] = React.useState({ key: 'project', direction: 'asc' })
  const [collapsedProjects, setCollapsedProjects] = React.useState({}) // { [projectName]: boolean }
  const [focusedProject, setFocusedProject] = React.useState(null)
  const [visibleStatuses, setVisibleStatuses] = React.useState(ALL_STATUSES)
  const [showStatusFilter, setShowStatusFilter] = React.useState(false)

  const projectColorMap = React.useMemo(() => {
    const map = {};
    if (dashboardProjects) {
      dashboardProjects.forEach(p => {
        const key = (p.key || p.name || '').toUpperCase();
        if (key) {
          map[key] = p.color;
        }
      });
    }
    return map;
  }, [dashboardProjects]);

  const filteredReportData = React.useMemo(() => {
    let result = reportData.filter(r => visibleStatuses.includes(r.status))
    
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
  }, [reportData, sortConfig, showProjectGroups, focusedProject, visibleStatuses])

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

  const getStatusBadge = (status) => {
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


  return (
    <div className="relative min-h-screen pt-[10px] pr-[10px] pb-[10px] pl-[20px]">
      <div className="w-full mx-auto pb-[10px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] items-start">

          {/* MAIN TABLE */}
          <div className="lg:col-span-9 flex flex-col gap-[10px]">
            <div className="flex items-center justify-between gap-[10px] p-[10px]">
              {showProjectGroups && (
                <div className="neu-inset rounded-2xl p-1.5 flex gap-2">
                  <button onClick={expandAll} className="neu-button px-6 py-2 text-[14px]">EXPAND ALL</button>
                  <button onClick={collapseAll} className="neu-button px-6 py-2 text-[14px]">COLLAPSE ALL</button>
                  {focusedProject && (
                    <button onClick={() => setFocusedProject(null)} className="neu-button px-6 py-2 text-[14px] text-rose-500">RESET FOCUS</button>
                  )}
                </div>
              )}
            </div>
            <div className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)] shadow-2xl overflow-hidden m-[10px]">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr className="bg-[var(--bg-header)] text-[14px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
                      <th className="py-[10px] border-r border-b border-[var(--border)] cursor-pointer hover:bg-white/[0.05] transition-all group" style={{ paddingLeft: '32px', paddingRight: '32px' }} onClick={() => handleSort('project')}>
                        <div className="flex items-center gap-[10px]">Project
                          <div className="text-slate-600 group-hover:text-slate-400">{sortConfig.key==='project'?(sortConfig.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}</div>
                        </div>
                      </th>
                      <th className="py-[10px] border-r border-b border-[var(--border)] cursor-pointer hover:bg-white/[0.05] transition-all group" style={{ paddingLeft: '32px', paddingRight: '32px' }} onClick={() => handleSort('task')}>
                        <div className="flex items-center gap-[10px]">Task Analysis
                          <div className="text-slate-600 group-hover:text-slate-400">{sortConfig.key==='task'?(sortConfig.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}</div>
                        </div>
                      </th>
                      <th className="p-[10px] text-center border-r border-b border-[var(--border)] cursor-pointer hover:bg-white/[0.05] transition-all group" onClick={() => handleSort('markupTime')}>
                        <div className="flex items-center justify-center gap-[10px]">Timestamp
                          <div className="text-slate-600 group-hover:text-slate-400">{sortConfig.key==='markupTime'?(sortConfig.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUp size={12} className="opacity-0 group-hover:opacity-50"/>}</div>
                        </div>
                      </th>
                      <th className="p-[10px] text-center border-r border-b border-[var(--border)] relative">
                        <div className="flex items-center justify-center gap-[10px]">
                          <div className="flex items-center gap-[10px] cursor-pointer hover:text-slate-300 group/header" onClick={() => handleSort('status')}>
                            Status
                            <div className="text-slate-600 group-hover/header:text-slate-400">{sortConfig.key==='status'?(sortConfig.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUp size={12} className="opacity-0 group-hover/header:opacity-50"/>}</div>
                          </div>
                          <button onClick={(e)=>{e.stopPropagation();setShowStatusFilter(!showStatusFilter);}} className={`p-[5px] rounded-[4px] transition-all ${visibleStatuses.length < ALL_STATUSES.length ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-400'}`}><Filter size={12}/></button>
                        </div>
                        {showStatusFilter && (
                          <div className="absolute top-full right-0 z-30 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] shadow-2xl p-2 min-w-[160px]">
                            {ALL_STATUSES.map(s=>(
                              <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer">
                                <input type="checkbox" className="w-3.5 h-3.5 rounded" checked={visibleStatuses.includes(s)} onChange={()=>setVisibleStatuses(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}/>
                                <span className={`text-[11px] font-black uppercase tracking-wider ${getStatusBadge(s).text}`}>{s}</span>
                              </label>
                            ))}
                            <button className="mt-1 w-full text-[10px] font-black uppercase tracking-widest text-indigo-400 py-1" onClick={()=>setVisibleStatuses(ALL_STATUSES)}>RESET</button>
                          </div>
                        )}
                      </th>
                      {DAYS_OF_WEEK.map((d,i)=>{
                        const t=new Date();
                        const todayStr=`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}`;
                        const dateStr=weekDates[i]?weekDates[i].substring(0,5):'';
                        const isToday=dateStr===todayStr;
                        return(
                          <th key={d} className={`text-center px-[10px] py-[12px] border-r border-b border-[var(--border)] ${isToday ? 'bg-indigo-500/10' : 'bg-[var(--bg-card)]'}`} style={{ width: '10%', minWidth: '100px' }}>
                            <div className={`text-[12px] font-black uppercase tracking-wider ${isToday ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>{d.substring(0,3)}</div>
                            <div className={`text-[12px] font-medium ${isToday ? 'text-emerald-500' : 'text-[var(--text-contrast)]'}`}>{dateStr}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    <AnimatePresence>
                      {showProjectGroups?(
                        Object.entries(groupedData).map(([projectName,tasks])=>{
                          const isCollapsed=collapsedProjects[projectName];
                          return(
                            <React.Fragment key={projectName}>
                              <tr className={`sticky top-0 z-20 bg-[var(--table-sticky)] backdrop-blur-md cursor-pointer hover:bg-indigo-500/5 transition-all ${focusedProject===projectName?'ring-1 ring-indigo-500 ring-inset':''}`} onClick={()=>toggleCollapse(projectName)}>
                                <td colSpan={9} className="p-0 border-r border-b border-[var(--border)]">
                                  <div className="flex items-center justify-between" style={{ padding: '10px 32px 10px 10px' }}>
                                    <div className="flex items-center gap-[10px]">
                                      <motion.div animate={{rotate:isCollapsed?0:90}} className="text-indigo-500"><ArrowDown size={14}/></motion.div>
                                      <div style={{backgroundColor:projectColorMap[(projectName||'').toUpperCase()]||'#6366f1'}} className="w-1.5 h-6 rounded-full"></div>
                                      <div className="flex items-center gap-[10px]">
                                        <span style={{color:projectColorMap[(projectName||'').toUpperCase()]||'#818cf8'}} className="text-[14px] font-black uppercase tracking-[0.2em]">{projectName}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-[10px]">
                                      <span style={{backgroundColor:`${projectColorMap[(projectName||'').toUpperCase()]||'#6366f1'}15`,color:projectColorMap[(projectName||'').toUpperCase()]||'#818cf8',borderColor:`${projectColorMap[(projectName||'').toUpperCase()]||'#6366f1'}30`}} className="px-[10px] py-[2px] text-[12px] font-black rounded-[4px] uppercase border mr-[10px]">{tasks.length} UNIT{tasks.length>1?'S':''}</span>
                                      <button onClick={(e)=>{e.stopPropagation();setFocusedProject(focusedProject===projectName?null:projectName);}} className={`px-[15px] py-[10px] rounded-[8px] text-[12px] font-black uppercase border transition-all ${focusedProject===projectName?'bg-indigo-500 text-white border-indigo-400':'bg-white/5 text-slate-500 border-white/5 hover:border-indigo-500/30 hover:text-indigo-400'}`}>{focusedProject===projectName?'EXIT FOCUS':'FOCUS'}</button>
                                      <Filter size={14} className={`transition-colors ${isCollapsed?'text-slate-600':'text-indigo-400'}`}/>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {!isCollapsed&&tasks.map((row,index)=>(
                                <motion.tr key={row.id} initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="hover:bg-[var(--bg-header)] transition-all border-b border-[var(--border)]" style={{backgroundColor:index%2===0?'var(--row-odd)':'var(--row-even)'}}>
                                  <td className="py-[10px] border-r border-b border-[var(--border)]" style={{ paddingLeft: '32px', paddingRight: '32px' }}><span style={{color:projectColorMap[(row.project||'').toUpperCase()]||'#818cf8'}} className="text-[14px] font-medium uppercase tracking-tighter">{row.project}</span></td>
                                  <td className="py-[10px] border-r border-b border-[var(--border)]" style={{ paddingLeft: '32px', paddingRight: '32px' }}><div className="text-[14px] font-normal text-[var(--text-main)] tracking-tight uppercase leading-relaxed">{row.task}</div></td>
                                  <td className="p-[10px] text-center border-r border-b border-[var(--border)]">{(row.markupDate||row.markupTime)?(<div className="flex flex-col"><span className="text-[12px] font-normal text-[var(--text-muted)]">{row.markupDate||''}</span><span className="text-[12px] font-normal text-slate-400">{row.markupTime||''}</span></div>):(<span className="text-[12px] font-normal text-slate-600">—</span>)}</td>
                                  <td className="p-[10px] text-center border-r border-b border-[var(--border)]"><span className={`text-[12px] font-medium py-[4px] px-[10px] rounded-[6px] border ${getStatusBadge(row.status).bg} ${getStatusBadge(row.status).text} ${getStatusBadge(row.status).border}`}>{row.status}</span></td>
                                  {DAYS_OF_WEEK.map(d=>(<td key={d} className="p-[5px] text-center border-r border-b border-[var(--border)]"><span className={`text-[13px] font-normal tracking-tighter px-[8px] py-[4px] rounded-[6px] ${row.days[d]?'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20':'text-slate-600'}`}>{row.days[d]||'—'}</span></td>))}
                                </motion.tr>
                              ))}
                            </React.Fragment>
                          );
                        })
                      ):(
                        filteredReportData.map((row,i)=>(
                          <motion.tr key={row.id} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="hover:bg-[var(--bg-header)] transition-all border-b border-[var(--border)]" style={{backgroundColor:i%2===0?'var(--row-odd)':'var(--row-even)'}}>
                            <td className="py-3 border-r border-b border-[var(--border)]" style={{ paddingLeft: '32px', paddingRight: '32px' }}><span style={{color:projectColorMap[(row.project||'').toUpperCase()]||'#818cf8'}} className="text-[14px] font-medium tracking-tight uppercase">{row.project}</span></td>
                            <td className="py-3 border-r border-b border-[var(--border)]" style={{ paddingLeft: '32px', paddingRight: '32px' }}><div className="text-[14px] font-normal text-[var(--text-main)] tracking-tight leading-relaxed">{row.task}</div></td>
                            <td className="px-3 py-3 text-center border-r border-b border-[var(--border)]">{(row.markupDate||row.markupTime)?(<div className="flex flex-col"><span className="text-[12px] font-normal text-[var(--text-muted)]">{row.markupDate||''}</span><span className="text-[12px] font-normal text-slate-400">{row.markupTime||''}</span></div>):(<span className="text-[12px] font-normal text-slate-600">—</span>)}</td>
                            <td className="px-3 py-3 text-center border-r border-b border-[var(--border)]"><span className={`text-[12px] font-medium py-[4px] px-[10px] rounded-[6px] border ${getStatusBadge(row.status).bg} ${getStatusBadge(row.status).text} ${getStatusBadge(row.status).border}`}>{row.status}</span></td>
                            {DAYS_OF_WEEK.map(d=>(<td key={d} className="px-2 py-2 text-center border-r border-b border-[var(--border)]"><span className={`text-[13px] font-normal tracking-tight px-2 py-0.5 rounded-md ${row.days[d]?'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20':'text-[var(--text-muted)]'}`}>{row.days[d]||'—'}</span></td>))}
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                    {filteredReportData.length===0&&(
                      <tr><td colSpan={9} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
                          <div className="p-8 bg-slate-800 rounded-full shadow-inner"><FileSpreadsheet size={64} strokeWidth={1}/></div>
                          <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">System Ready // No Logs Detected</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-4 sticky top-24">
            <div className="glass-panel p-4 border-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight uppercase">Data Intelligence</h2>
                  <p className="text-[14px] text-slate-500 font-bold uppercase tracking-widest">Real-time Analytics</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-[220px] relative flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: Object.keys(stats.statusCounts),
                      datasets: [{
                        data: Object.values(stats.statusCounts),
                        backgroundColor: ['rgba(16,185,129,0.6)','rgba(100,116,139,0.6)','rgba(249,115,22,0.6)','rgba(244,63,94,0.6)','rgba(251,191,36,0.6)','rgba(139,92,246,0.6)','rgba(239,68,68,0.6)','rgba(99,102,241,0.6)'],
                        borderColor: 'rgba(255,255,255,0.1)', borderWidth: 2, hoverOffset: 10
                      }]
                    }}
                    options={{
                      plugins: { legend:{display:false}, tooltip:{backgroundColor:'rgba(15,23,42,0.9)',titleFont:{size:10,weight:'bold'},bodyFont:{size:10},padding:10,cornerRadius:8,borderColor:'rgba(255,255,255,0.1)',borderWidth:1} },
                      maintainAspectRatio: false, cutout: '75%'
                    }}
                  />
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[14px] font-black text-slate-500 uppercase tracking-widest">Tasks</span>
                    <span className="text-3xl font-black text-white">{stats.totalTasks}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Projects</p><p className="text-xl font-black text-indigo-400">{stats.uniqueProjects}</p></div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Done</p><p className="text-xl font-black text-emerald-400">{stats.doneTasks}</p></div>
                </div>
                <div className="space-y-3">
                  <p className="text-[14px] font-black text-slate-500 uppercase tracking-widest">Project Load</p>
                  <div className="h-[150px]">
                    <Bar
                      data={{ labels: Object.keys(stats.projectCounts).map(k=>k.length>8?k.substring(0,8)+'...':k), datasets: [{label:'Tasks',data:Object.values(stats.projectCounts),backgroundColor:'rgba(99,102,241,0.4)',borderColor:'#6366f1',borderWidth:1,borderRadius:4}] }}
                      options={{ indexAxis:'y', plugins:{legend:{display:false}}, maintainAspectRatio:false, scales:{x:{display:false,grid:{display:false}},y:{grid:{display:false},ticks:{color:'#64748b',font:{size:9,weight:'bold'}}}} }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-panel p-4 border-white/5 shadow-2xl">
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-indigo-400"/>
                  <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Daily Intensity</h3>
                </div>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map(day=>(
                    <div key={day} className="group flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[12px] font-black uppercase tracking-tighter">
                        <span className={stats.dayCounts[day]>0?'text-indigo-300':'text-slate-600'}>{day}</span>
                        <span className={stats.dayCounts[day]>0?'text-white':'text-slate-700'}>{stats.dayCounts[day]}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{width:0}} animate={{width:`${(stats.dayCounts[day]/(stats.totalTasks||1))*100}%`}} className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  )
}

export default WeeklyReport
