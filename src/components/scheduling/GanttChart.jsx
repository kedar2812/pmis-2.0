import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { getStatusColor } from '@/lib/colors';

const DAY_WIDTH = 4; // Base width per day in pixels
const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 80;
const SIDEBAR_WIDTH = 250;

export const GanttChart = ({ projects, tasks, selectedProjectId }) => {
  const [zoom, setZoom] = useState(1);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);

  // Calculate date range from all tasks
  const calculatedDateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear() + 1, today.getMonth(), 31),
      };
    }

    const allDates = tasks.flatMap((task) => [
      new Date(task.startDate),
      new Date(task.endDate),
    ]);

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Add padding
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);

    return { start: minDate, end: maxDate };
  }, [tasks]);

  const finalDateRange = calculatedDateRange;

  // Filter tasks by selected project
  const filteredTasks = useMemo(() => {
    if (selectedProjectId) {
      return tasks.filter((task) => task.projectId === selectedProjectId);
    }
    return tasks;
  }, [tasks, selectedProjectId]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = {};

    filteredTasks.forEach((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      if (project) {
        if (!grouped[project.id]) {
          grouped[project.id] = { project, tasks: [] };
        }
        grouped[project.id].tasks.push(task);
      }
    });

    return Object.values(grouped);
  }, [filteredTasks, projects]);

  // Calculate days between dates
  const daysBetween = (start, end) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get position for a date
  const getDatePosition = (date) => {
    const days = daysBetween(finalDateRange.start, date);
    return days * DAY_WIDTH * zoom;
  };

  // Get width for a task
  const getTaskWidth = (task) => {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const days = daysBetween(start, end);
    return Math.max(days * DAY_WIDTH * zoom, 20); // Minimum 20px width
  };

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers = [];
    const current = new Date(finalDateRange.start);
    current.setDate(1); // Start of month

    while (current <= finalDateRange.end) {
      const position = getDatePosition(current);
      markers.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        position,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return markers;
  }, [finalDateRange, zoom]);

  // Generate day markers for current view
  const dayMarkers = useMemo(() => {
    const markers = [];
    const current = new Date(finalDateRange.start);
    const end = new Date(finalDateRange.end);

    while (current <= end) {
      const position = getDatePosition(current);
      markers.push({
        date: new Date(current),
        position,
      });
      current.setDate(current.getDate() + 7); // Weekly markers
    }

    return markers;
  }, [finalDateRange, zoom]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  const totalWidth = getDatePosition(finalDateRange.end);
  const totalHeight = tasksByProject.length * ROW_HEIGHT + HEADER_HEIGHT;

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div
        ref={chartRef}
        className="flex-1 overflow-auto relative"
        style={{ height: `${Math.min(totalHeight, 600)}px` }}
      >
        <div
          ref={scrollRef}
          className="relative"
          style={{ width: `${totalWidth + SIDEBAR_WIDTH}px`, height: `${totalHeight}px` }}
        >
          {/* Fixed Sidebar */}
          <div
            className="absolute left-0 top-0 bg-white border-r border-gray-200 z-10"
            style={{ width: `${SIDEBAR_WIDTH}px`, height: `${totalHeight}px` }}
          >
            {/* Header */}
            <div
              className="border-b border-gray-200 bg-gray-50 font-semibold text-sm text-gray-700 px-4 py-2"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              Tasks
            </div>
            {/* Task Names */}
            {tasksByProject.map(({ project, tasks: projectTasks }) => (
              <div key={project.id}>
                {/* Project Header */}
                <div
                  className="border-b border-gray-200 bg-primary-50 px-4 py-2 font-medium text-sm text-primary-900"
                  style={{ height: `${ROW_HEIGHT / 2}px` }}
                >
                  {project.name}
                </div>
                {/* Tasks */}
                {projectTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border-b border-gray-100 px-4 py-2 text-sm text-gray-700 flex items-center"
                    style={{ height: `${ROW_HEIGHT / 2}px` }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          task.priority === 'Critical'
                            ? 'bg-error-600'
                            : task.priority === 'High'
                            ? 'bg-accent-600'
                            : task.priority === 'Medium'
                            ? 'bg-warning-600'
                            : 'bg-success-600'
                        }`}
                      />
                      <span className="truncate">{task.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollable Timeline */}
          <div
            className="absolute"
            style={{ left: `${SIDEBAR_WIDTH}px`, width: `${totalWidth}px`, height: `${totalHeight}px` }}
          >
            {/* Timeline Header */}
            <div
              className="absolute top-0 left-0 right-0 border-b border-gray-200 bg-gray-50"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              {/* Month Markers */}
              {monthMarkers.map((marker, index) => (
                <div
                  key={index}
                  className="absolute top-0 border-l border-gray-300"
                  style={{
                    left: `${marker.position}px`,
                    height: `${HEADER_HEIGHT / 2}px`,
                  }}
                >
                  <div className="absolute top-1 left-2 text-xs font-medium text-gray-700">
                    {marker.label}
                  </div>
                </div>
              ))}
              {/* Day Markers */}
              {dayMarkers.map((marker, index) => (
                <div
                  key={index}
                  className="absolute border-l border-gray-200"
                  style={{
                    left: `${marker.position}px`,
                    top: `${HEADER_HEIGHT / 2}px`,
                    height: `${HEADER_HEIGHT / 2}px`,
                  }}
                >
                  <div className="absolute top-1 left-1 text-xs text-gray-500">
                    {marker.date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Today Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent-500 z-20"
              style={{
                left: `${getDatePosition(new Date())}px`,
                height: `${totalHeight}px`,
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-accent-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Today
              </div>
            </div>

            {/* Task Bars */}
            {tasksByProject.map(({ project, tasks: projectTasks }, projectIndex) => {
              let taskRowIndex = 0;
              return (
                <div key={project.id}>
                  {/* Project Row Background */}
                  <div
                    className="absolute border-b border-gray-200 bg-gray-50/50"
                    style={{
                      top: `${HEADER_HEIGHT + projectIndex * ROW_HEIGHT}px`,
                      left: '0px',
                      width: `${totalWidth}px`,
                      height: `${ROW_HEIGHT}px`,
                    }}
                  />
                  {/* Tasks */}
                  {projectTasks.map((task) => {
                    const taskStart = new Date(task.startDate);
                    const taskEnd = new Date(task.endDate);
                    const left = getDatePosition(taskStart);
                    const width = getTaskWidth(task);
                    const top =
                      HEADER_HEIGHT +
                      projectIndex * ROW_HEIGHT +
                      (taskRowIndex * ROW_HEIGHT) / projectTasks.length +
                      4;
                    const height = ROW_HEIGHT / projectTasks.length - 8;

                    const statusColors = getStatusColor(task.status);
                    const isCritical = task.priority === 'Critical';
                    const progressWidth = (width * task.progress) / 100;

                    taskRowIndex++;
                    return (
                      <div
                        key={task.id}
                        className="absolute group"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                      >
                        {/* Task Bar Background */}
                        <div
                          className={`absolute inset-0 rounded ${
                            isCritical ? 'border-2 border-error-500' : 'border border-gray-300'
                          } ${statusColors.bg} ${statusColors.border} transition-all hover:shadow-md`}
                          style={{
                            backgroundColor: isCritical
                              ? 'rgba(239, 68, 68, 0.2)'
                              : statusColors.bg.includes('success')
                              ? 'rgba(16, 185, 129, 0.2)'
                              : statusColors.bg.includes('warning')
                              ? 'rgba(245, 158, 11, 0.2)'
                              : statusColors.bg.includes('info')
                              ? 'rgba(2, 132, 199, 0.2)'
                              : 'rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          {/* Progress Bar */}
                          {task.progress > 0 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressWidth}px` }}
                              transition={{ duration: 0.5 }}
                              className={`absolute left-0 top-0 bottom-0 rounded-l ${
                                task.progress === 100
                                  ? 'bg-success-600'
                                  : task.status === 'In Progress'
                                  ? 'bg-primary-600'
                                  : 'bg-warning-500'
                              }`}
                              style={{ width: `${progressWidth}px` }}
                            />
                          )}
                          {/* Task Label */}
                          <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-900 z-10">
                            <span className="truncate">{task.name}</span>
                            <span className="ml-2 text-gray-600">{task.progress}%</span>
                          </div>
                        </div>
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                            <div className="font-semibold mb-1">{task.name}</div>
                            <div>Start: {taskStart.toLocaleDateString()}</div>
                            <div>End: {taskEnd.toLocaleDateString()}</div>
                            <div>Progress: {task.progress}%</div>
                            <div>Status: {task.status}</div>
                            <div>Priority: {task.priority}</div>
                            <div>Assigned: {task.assignedTo}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};





