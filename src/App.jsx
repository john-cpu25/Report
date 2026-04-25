import React, { useState, useEffect, useMemo } from 'react'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import { Download, Layout, FileBarChart, CalendarDays } from 'lucide-react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import WeeklyReport from './WeeklyReport'
import CSVProcessor from './CSVProcessor'
import projectsData from './data/projects.json'
import CelestialBackground from './CelestialBackground'
import RincovitchLogo from './RincovitchLogo'
import Preloader from './Preloader'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function App() {
  const [activeTab, setActiveTab] = useState('report')
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState([])
  const [customProjects, setCustomProjects] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  
  // Load data
  useEffect(() => {
    const savedLogs = localStorage.getItem('weeklyReportData')
    const savedProjects = localStorage.getItem('customProjects')
    if (savedLogs) setReportData(JSON.parse(savedLogs))
    if (savedProjects) setCustomProjects(JSON.parse(savedProjects))
  }, [])

  // Save data
  useEffect(() => {
    localStorage.setItem('weeklyReportData', JSON.stringify(reportData))
  }, [reportData])

  useEffect(() => {
    localStorage.setItem('customProjects', JSON.stringify(customProjects))
  }, [customProjects])

  const addCustomProject = (name) => {
    if (!name || customProjects.includes(name) || projectsData.includes(name)) return
    setCustomProjects(prev => [...prev, name])
  }

  const [formData, setFormData] = useState({
    project: '',
    level: '',
    tasks: [],
    note: '',
    day: format(new Date(), 'EEEE'),
    status: 'WIP',
    eta: ''
  })

  // Auto-update day when date changes
  useEffect(() => {
    try {
      const date = parseISO(selectedDate)
      const dayName = format(date, 'EEEE')
      setFormData(prev => ({ ...prev, day: dayName }))
    } catch (e) {
      console.error('Invalid date')
    }
  }, [selectedDate])

  // Calculate week dates
  const weekDates = useMemo(() => {
    const date = parseISO(selectedDate)
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    return DAYS_OF_WEEK.map((_, i) => format(addDays(monday, i), 'dd/MM/yyyy'))
  }, [selectedDate])

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!formData.project || !formData.level) return

    let taskName = `LEVEL ${formData.level}`
    if (formData.tasks.length > 0) taskName += ` ${formData.tasks.join(' ')}`
    if (formData.note) taskName += ` ${formData.note}`

    const existingIndex = reportData.findIndex(
      (r) => r.project === formData.project && r.task === taskName
    )

    if (existingIndex > -1) {
      const newData = [...reportData]
      newData[existingIndex].days[formData.day] = formData.eta
      newData[existingIndex].status = formData.status
      setReportData(newData)
    } else {
      setReportData([
        ...reportData,
        {
          id: Date.now(),
          project: formData.project,
          task: taskName,
          status: formData.status,
          days: { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', ...{ [formData.day]: formData.eta } }
        }
      ])
    }

    setFormData(prev => ({
      ...prev,
      project: '',
      level: '',
      tasks: [],
      note: '',
      eta: ''
    }))
  }

  const deleteRow = (id) => setReportData(reportData.filter(r => r.id !== id))
  
  const moveRow = (idx, dir) => {
    const ni = idx + dir
    if (ni < 0 || ni >= reportData.length) return
    const newData = [...reportData]
    ;[newData[idx], newData[ni]] = [newData[ni], newData[idx]]
    setReportData(newData)
  }

  const updateStatus = (id, status) => {
    setReportData(reportData.map(r => r.id === id ? { ...r, status } : r))
  }

  const exportExcel = async () => {
    if (reportData.length === 0) return
    
    // Create header row with dates
    const headers = ['PROJECT', 'TASK DETAILS', 'STATUS', ...DAYS_OF_WEEK.map((d, i) => `${d.toUpperCase()} (${weekDates[i]})`)]
    
    // Create data rows
    const rows = reportData.map(r => [
      r.project, 
      r.task, 
      r.status, 
      r.days.Monday || '-', 
      r.days.Tuesday || '-', 
      r.days.Wednesday || '-', 
      r.days.Thursday || '-', 
      r.days.Friday || '-'
    ])

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    
    // Add a title row
    const titleRow = [['RINCOVITCH WEEKLY REPORT - ' + weekDates[0] + ' to ' + weekDates[4]]]
    const ws = XLSX.utils.aoa_to_sheet([...titleRow, [], headers, ...rows])

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Project
      { wch: 50 }, // Task Details
      { wch: 12 }, // Status
      { wch: 18 }, // Monday
      { wch: 18 }, // Tuesday
      { wch: 18 }, // Wednesday
      { wch: 18 }, // Thursday
      { wch: 18 }  // Friday
    ]

    // Merge title cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } } // Merge title across all columns
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report')
    
    const fileName = `Rincovitch_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    // Advanced "Save As" if supported by browser (Chrome, Edge, etc.)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Excel Files',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        })
        const writable = await handle.createWritable()
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        await writable.write(excelBuffer)
        await writable.close()
      } catch (err) {
        // Fallback to standard download if user cancels or error occurs
        if (err.name !== 'AbortError') {
          XLSX.writeFile(wb, fileName)
        }
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker
      XLSX.writeFile(wb, fileName)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <Preloader key="preloader" onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <motion.div 
          key="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen p-4 md:p-8 selection:bg-indigo-500/30"
        >
          <CelestialBackground />
          <header className="max-w-[1800px] w-[95%] mx-auto mb-12 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4 group">
          <div className="p-2.5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-300">
            <RincovitchLogo size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">RINCOVITCH <span className="text-indigo-400">REPORT</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Intelligence System v2.1</p>
          </div>
        </div>

        <div className="flex gap-2 bg-slate-900/40 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/5 shadow-2xl">
          <button 
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500 ${
              activeTab === 'report' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <CalendarDays size={20} strokeWidth={2.5} />
            <span>Weekly Report</span>
          </button>
          <button 
            onClick={() => setActiveTab('processor')}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500 ${
              activeTab === 'processor' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <FileBarChart size={20} strokeWidth={2.5} />
            <span>Data Processor</span>
          </button>
        </div>

        {activeTab === 'report' ? (
          <button onClick={exportExcel} className="btn btn-primary px-8 py-4 shadow-2xl shadow-indigo-500/20">
            <Download size={20} strokeWidth={2.5} />
            <span>Export Final XLSX</span>
          </button>
        ) : (
          <div className="w-[180px] hidden md:block"></div>
        )}
      </header>

      <div className="max-w-[1800px] w-[95%] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {activeTab === 'report' ? (
              <WeeklyReport 
                reportData={reportData} setReportData={setReportData}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                weekDates={weekDates} formData={formData} setFormData={setFormData}
                handleAddTask={handleAddTask} deleteRow={deleteRow} moveRow={moveRow}
                updateStatus={updateStatus}
                customProjects={customProjects} addCustomProject={addCustomProject}
              />
            ) : (
              <CSVProcessor />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <footer className="max-w-[1800px] w-[95%] mx-auto mt-12 pt-8 border-t border-white/10 text-center text-white/30 text-xs">
        <p>&copy; 2026 Rincovitch - Weekly Report System - Vietnam</p>
      </footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App
