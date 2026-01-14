import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Flag, Layers } from 'lucide-react';
import { format, addMonths, startOfMonth, getDaysInMonth, differenceInDays } from 'date-fns';

export const GanttChart = ({ tasks, onTaskClick }) => {
  const [viewDate, setViewDate] = useState(new Date());

  // 1. Calculate Timeline Range (View Month)
  const startDate = startOfMonth(viewDate);
  const totalDays = getDaysInMonth(viewDate);

  // 2. Helper to position bars
  const getBarPosition = (taskStart, taskEnd) => {
    const start = new Date(taskStart);
    const end = new Date(taskEnd);

    // Clamp to current view
    const effectiveStart = start < startDate ? startDate : start;
    const effectiveEnd = end > addMonths(startDate, 1) ? addMonths(startDate, 1) : end;

    if (end < startDate || start > addMonths(startDate, 1)) return null; // Not visible

    const startOffset = differenceInDays(effectiveStart, startDate);
    const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(addMonths(viewDate, -1));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header / Controls */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-primary-600" />
          <h3 className="font-bold text-slate-700">Project Timeline</h3>
        </div>
        <div className="flex items-center gap-4 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold w-32 text-center text-slate-800">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Timeline Header (Days) */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[250px_1fr] bg-slate-50 sticky top-0 z-20 border-b border-slate-200">
            <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 bg-slate-50">
              Task Name
            </div>
            <div className="relative h-10 bg-slate-50">
              {/* Render Day Markers roughly every 5 days to avoid clutter */}
              {Array.from({ length: totalDays }).map((_, i) => (
                (i % 5 === 0 || i === totalDays - 1) && (
                  <div
                    key={i}
                    className="absolute text-[10px] text-slate-400 border-l border-slate-200 pl-1 h-full flex items-center"
                    style={{ left: `${(i / totalDays) * 100}%` }}
                  >
                    {i + 1}
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100">
            {tasks.map(task => {
              const pos = getBarPosition(task.startDate, task.endDate);
              const isOverdue = new Date(task.endDate) < new Date() && task.progress < 100;

              return (
                <div key={task.id} className="grid grid-cols-[250px_1fr] hover:bg-slate-50 group">
                  {/* Task Info Column */}
                  <div className="p-3 border-r border-slate-200 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {task.isMilestone && <Flag size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                      <span className="truncate font-medium text-slate-700">{task.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.progress === 100 ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-600'
                      }`}>
                      {task.progress}%
                    </span>
                  </div>

                  {/* Timeline Bar Column */}
                  <div className="relative h-12">
                    {/* Grid Lines */}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="absolute h-full border-r border-slate-100" style={{ left: `${i * 20}%` }} />
                    ))}

                    {/* The Bar */}
                    {pos && (
                      <motion.div
                        layoutId={task.id}
                        className={`absolute top-3 h-6 rounded-md shadow-sm cursor-pointer border border-white/20 flex items-center px-2 text-xs text-white overflow-hidden whitespace-nowrap
                                                    ${isOverdue ? 'bg-red-500' :
                            task.isMilestone ? 'bg-amber-500' : 'bg-blue-500'}
                                                    hover:brightness-110 transition-all
                                                `}
                        style={{ left: pos.left, width: pos.width }}
                        onClick={() => onTaskClick(task)}
                        whileHover={{ scale: 1.02 }}
                      >
                        {task.name}
                      </motion.div>
                    )}
                    {!pos && (
                      <div className="text-[10px] text-slate-300 italic p-4">
                        (Outside View)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No tasks found for this period. Add a task to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
