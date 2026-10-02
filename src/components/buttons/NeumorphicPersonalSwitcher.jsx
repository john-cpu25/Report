import { ListIcon, GanttIcon, DailyIcon, ProjectIcon, PerformanceIcon, TimesheetIcon, TotalTimesheetIcon, PerformanceTimesheetIcon } from './CustomIcons';
import PillSwitcher from './PillSwitcher';

const NeumorphicPersonalSwitcher = ({ viewMode, setViewMode }) => {
  const views = [
    { id: 'list', label: 'LIST', icon: <ListIcon />, color: 'text-orange-500' },
    { id: 'daily', label: 'DAILY', icon: <DailyIcon />, color: 'text-orange-500' },
    { id: 'project', label: 'PROJECT', icon: <ProjectIcon />, color: 'text-emerald-500' },
    { id: 'performance', label: 'PERFORMANCE', icon: <PerformanceIcon />, color: 'text-indigo-500' },
    { id: 'timesheet', label: 'TIME SHEET', icon: <TimesheetIcon />, color: 'text-cyan-500' },
    { id: 'total_timesheet', label: 'TOTAL TIME SHEET', icon: <TotalTimesheetIcon />, color: 'text-teal-500' },
    { id: 'performance_timesheet', label: 'PERFORMANCE TIME SHEET', icon: <PerformanceTimesheetIcon />, color: 'text-violet-500' },
    { id: 'gantt', label: 'GANTT', icon: <GanttIcon />, color: 'text-indigo-500' }
  ];

  return (
    <PillSwitcher 
      options={views}
      value={viewMode}
      onChange={setViewMode}
      type="icon"
      size="md"
    />
  );
};

export default NeumorphicPersonalSwitcher;
