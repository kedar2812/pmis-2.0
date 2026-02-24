import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Flag, Layers, Shield, AlertTriangle } from 'lucide-react';
import { format, addMonths, startOfMonth, getDaysInMonth, differenceInDays } from 'date-fns';

export const GanttChart = ({ tasks, onTaskClick, isBaselineFrozen = false }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showBaseline, setShowBaseline] = useState(true);

  // 1. Calculate Timeline Range (View Month)
  const startDate = startOfMonth(viewDate);
  const totalDays = getDaysInMonth(viewDate);
  const viewEnd = addMonths(startDate, 1);

  // 2. Helper to position bars
  const getBarPosition = (taskStart, taskEnd) => {
    if (!taskStart || !taskEnd) return null;
    const start = new Date(taskStart);
    const end = new Date(taskEnd);

    // Clamp to current view
    const effectiveStart = start < startDate ? startDate : start;
    const effectiveEnd = end > viewEnd ? viewEnd : end;

    if (end < startDate || start > viewEnd) return null; // Not visible

    const startOffset = differenceInDays(effectiveStart, startDate);
    const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max((duration / totalDays) * 100, 1)}%`
    };
  };

  // 3. Check if task is delayed vs baseline
  const isDelayedVsBaseline = (task) => {
    if (!task.baselineEndDate || !task.endDate) return false;
    return new Date(task.endDate) > new Date(task.baselineEndDate);
  };

  // 4. Calculate delay in days
  const getDelayDays = (task) => {
    if (!task.baselineEndDate || !task.endDate) return 0;
    const delay = differenceInDays(new Date(task.endDate), new Date(task.baselineEndDate));
    return Math.max(delay, 0);
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(addMonths(viewDate, -1));

  // Today marker position
  const today = new Date();
  const todayOffset = differenceInDays(today, startDate);
  const todayPosition = todayOffset >= 0 && todayOffset <= totalDays
    ? `${(todayOffset / totalDays) * 100}%`
    : null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-700 flex flex-col h-full overflow-hidden">
      {/* Header / Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-neutral-700 flex justify-between items-center bg-slate-50 dark:bg-neutral-800">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-primary-600" />
          <h3 className="font-bold text-slate-700 dark:text-white">Project Timeline</h3>
          {isBaselineFrozen && (
            <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              <Shield size={12} />
              Baseline Frozen
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Baseline Toggle */}
          {isBaselineFrozen && (
            <button
              onClick={() => setShowBaseline(!showBaseline)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showBaseline
                  ? 'bg-slate-600 text-white border-slate-600 dark:bg-slate-500'
                  : 'bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700'
                }`}
            >
              {showBaseline ? '✓ Baseline' : 'Baseline'}
            </button>
          )}
          {/* Month Navigation */}
          <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-neutral-700 shadow-sm">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded"><ChevronLeft size={18} className="dark:text-neutral-300" /></button>
            <span className="text-sm font-semibold w-32 text-center text-slate-800 dark:text-white">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded"><ChevronRight size={18} className="dark:text-neutral-300" /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      {isBaselineFrozen && showBaseline && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-6 text-xs text-slate-500 dark:text-neutral-400 bg-slate-50/50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 rounded bg-slate-300 dark:bg-slate-600 opacity-60" />
            <span>Baseline Schedule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 rounded bg-blue-500" />
            <span>Current / Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-2 rounded bg-red-500" />
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Timeline Header (Days) */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[250px_1fr] bg-slate-50 dark:bg-neutral-800 sticky top-0 z-20 border-b border-slate-200 dark:border-neutral-700">
            <div className="p-3 text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider border-r border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800">
              Task Name
            </div>
            <div className="relative h-10 bg-slate-50 dark:bg-neutral-800">
              {/* Render Day Markers roughly every 5 days to avoid clutter */}
              {Array.from({ length: totalDays }).map((_, i) => (
                (i % 5 === 0 || i === totalDays - 1) && (
                  <div
                    key={i}
                    className="absolute text-[10px] text-slate-400 dark:text-neutral-500 border-l border-slate-200 dark:border-neutral-700 pl-1 h-full flex items-center"
                    style={{ left: `${(i / totalDays) * 100}%` }}
                  >
                    {i + 1}
                  </div>
                )
              ))}
              {/* Today Marker in header */}
              {todayPosition && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-amber-500 z-10"
                  style={{ left: todayPosition }}
                />
              )}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {tasks.map(task => {
              const currentPos = getBarPosition(task.startDate || task.start_date, task.endDate || task.end_date);
              const baselinePos = isBaselineFrozen && showBaseline
                ? getBarPosition(task.baselineStartDate || task.baseline_start_date, task.baselineEndDate || task.baseline_end_date)
                : null;
              const isOverdue = new Date(task.endDate || task.end_date) < new Date() && (task.progress || task.computed_progress || 0) < 100;
              const delayed = isBaselineFrozen && isDelayedVsBaseline(task);
              const delayDays = isBaselineFrozen ? getDelayDays(task) : 0;
              const progress = task.progress ?? task.computed_progress ?? task.physical_progress_pct ?? 0;

              return (
                <div key={task.id} className="grid grid-cols-[250px_1fr] hover:bg-slate-50 dark:hover:bg-neutral-800 group">
                  {/* Task Info Column */}
                  <div className="p-3 border-r border-slate-200 dark:border-neutral-700 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {task.isMilestone || task.is_milestone ? (
                        <Flag size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                      ) : null}
                      <span className="truncate font-medium text-slate-700 dark:text-neutral-300">{task.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {delayed && delayDays > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium" title={`${delayDays} days behind baseline`}>
                          +{delayDays}d
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${progress >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          progress > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-slate-100 text-slate-500 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  {/* Timeline Bar Column */}
                  <div className="relative h-14">
                    {/* Grid Lines */}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="absolute h-full border-r border-slate-100 dark:border-neutral-800" style={{ left: `${i * 20}%` }} />
                    ))}

                    {/* Today Marker */}
                    {todayPosition && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-amber-500/30 z-5"
                        style={{ left: todayPosition }}
                      />
                    )}

                    {/* ====== BASELINE BAR (Grey, underneath) ====== */}
                    {baselinePos && (
                      <div
                        className="absolute top-2 h-4 rounded bg-slate-300 dark:bg-slate-600 opacity-50 border border-slate-400/30 dark:border-slate-500/30"
                        style={{ left: baselinePos.left, width: baselinePos.width }}
                        title={`Baseline: ${task.baselineStartDate || task.baseline_start_date} → ${task.baselineEndDate || task.baseline_end_date}`}
                      />
                    )}

                    {/* ====== CURRENT/ACTUAL BAR (Colored, on top) ====== */}
                    {currentPos && (
                      <motion.div
                        layoutId={task.id}
                        className={`absolute h-5 rounded-md shadow-sm cursor-pointer border border-white/20 flex items-center px-2 text-[10px] text-white overflow-hidden whitespace-nowrap
                          ${delayed ? 'bg-red-500 dark:bg-red-600' :
                            isOverdue ? 'bg-red-500' :
                              (task.isMilestone || task.is_milestone) ? 'bg-amber-500' :
                                'bg-blue-500 dark:bg-blue-600'}
                          hover:brightness-110 transition-all z-10
                        `}
                        style={{
                          left: currentPos.left,
                          width: currentPos.width,
                          top: baselinePos ? '18px' : '16px'  // Offset down if baseline is shown
                        }}
                        onClick={() => onTaskClick?.(task)}
                        whileHover={{ scale: 1.02 }}
                      >
                        {/* Progress fill inside bar */}
                        <div
                          className="absolute inset-0 bg-white/20 rounded-md"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                        <span className="relative z-10 font-medium">{task.name}</span>
                      </motion.div>
                    )}
                    {!currentPos && !baselinePos && (
                      <div className="text-[10px] text-slate-300 dark:text-neutral-600 italic p-4">
                        (Outside View)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-slate-400 dark:text-neutral-500 text-sm">
                No tasks found for this period. Add a task to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
