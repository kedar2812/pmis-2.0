/**
 * SiteExecution.jsx — Daily Site Log — Premium stepped UI.
 *
 * Changes in this version:
 * - Searchable dropdowns for Projects and Tasks (custom SearchableSelect)
 * - Submit button: blue gradient (matches "Use My Location" style) + hover scale
 * - All buttons consistent with the app's blue button design
 */
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList, CloudSun, MapPin, ImageIcon, CheckCircle2,
    AlertCircle, Search, ChevronDown, Upload, Loader2, X, Star,
    Thermometer, CloudRain, ArrowRight
} from 'lucide-react';
import projectService from '@/api/services/projectService';
import executionService from '@/api/services/executionService';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const LocationPicker = lazy(() => import('@/components/execution/LocationPicker'));

// ─── Shared input class ────────────────────────────────────────────────────
const inputCls = `w-full bg-white/5 dark:bg-white/5 text-app-heading
    border border-app-subtle rounded-xl px-4 py-3 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50
    disabled:opacity-40 disabled:cursor-not-allowed
    placeholder:text-app-muted/60 transition-all duration-200`;

const FieldError = ({ msg }) => msg ? (
    <p className="flex items-center gap-1.5 text-xs text-rose-500 mt-1.5 font-medium">
        <AlertCircle size={11} /> {msg}
    </p>
) : null;

const Label = ({ children, required }) => (
    <label className="block text-xs font-semibold text-app-muted uppercase tracking-wider mb-1.5">
        {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
);

// ══════════════════════════════════════════════════════════════════════════
// SearchableSelect — custom searchable dropdown replacing <select>
// ══════════════════════════════════════════════════════════════════════════
const SearchableSelect = ({
    options = [],           // [{ id, label }]
    value,                  // currently selected id
    onChange,               // (id) => void
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    disabled = false,
    loading = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = query.trim()
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    const selectedLabel = options.find(o => String(o.id) === String(value))?.label;

    const handleSelect = (id) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    return (
        <div ref={ref} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => setOpen(prev => !prev)}
                className={`${inputCls} flex items-center justify-between gap-2 text-left cursor-pointer
                    ${open ? 'ring-2 ring-blue-500/60 border-blue-500/50' : ''}
                    ${(disabled || loading) ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
                <span className={selectedLabel ? 'text-app-heading' : 'text-app-muted/60 text-sm'}>
                    {loading ? 'Loading…' : (selectedLabel || placeholder)}
                </span>
                {loading
                    ? <Loader2 size={14} className="animate-spin text-app-muted flex-shrink-0" />
                    : <ChevronDown size={14} className={`text-app-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                }
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 left-0 right-0 mt-1.5
                            bg-app-card border border-app-subtle rounded-xl shadow-2xl
                            overflow-hidden"
                        style={{ maxHeight: '280px' }}
                    >
                        {/* Search input */}
                        <div className="p-2 border-b border-app-subtle bg-app-secondary/60 sticky top-0">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-2 text-sm bg-transparent
                                        text-app-heading placeholder:text-app-muted/60
                                        focus:outline-none"
                                />
                                {query && (
                                    <button type="button" onClick={() => setQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-heading">
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Options list */}
                        <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                            {filtered.length === 0 ? (
                                <div className="py-6 text-center text-xs text-app-muted">
                                    No results for "<span className="font-semibold">{query}</span>"
                                </div>
                            ) : (
                                filtered.map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onMouseDown={() => handleSelect(opt.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-100
                                            flex items-center gap-2
                                            ${String(value) === String(opt.id)
                                                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                                                : 'text-app-heading hover:bg-app-hover'
                                            }`}
                                    >
                                        {String(value) === String(opt.id) && (
                                            <CheckCircle2 size={13} className="text-blue-400 flex-shrink-0" />
                                        )}
                                        <span className="flex-1 truncate">{opt.label}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Section Card ──────────────────────────────────────────────────────────
const Card = ({ step, title, subtitle, icon: Icon, color = 'blue', children, isComplete }) => {
    const gradients = {
        blue: 'from-blue-500 to-blue-600',
        emerald: 'from-emerald-500 to-teal-500',
        violet: 'from-violet-500 to-purple-600',
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-app-subtle bg-app-card shadow-sm overflow-hidden"
        >
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-app-subtle bg-app-secondary/50">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${gradients[color]} shadow`}>
                    <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-app-heading">{title}</h3>
                        {isComplete && (
                            <span className="text-[10px] font-semibold text-emerald-500
                                bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={9} /> Done
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-app-muted mt-0.5 truncate">{subtitle}</p>}
                </div>
                {/* Step number pill */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${isComplete
                        ? `bg-gradient-to-br ${gradients[color]} text-white shadow`
                        : 'bg-app-secondary text-app-muted'}`}>
                    {isComplete ? <CheckCircle2 size={14} /> : step}
                </div>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </motion.div>
    );
};

// ─── Initial form ──────────────────────────────────────────────────────────
const INIT = { project: '', task: '', achieved_quantity: '', remarks: '', latitude: null, longitude: null };

// ══════════════════════════════════════════════════════════════════════════
const SiteExecution = () => {
    const [form, setForm] = useState(INIT);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isPrimary, setIsPrimary] = useState(false);
    const [imageCaption, setImageCaption] = useState('');
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loadingPrj, setLoadingPrj] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        projectService.getAllProjects()
            .then(d => setProjects(Array.isArray(d) ? d : (d?.results ?? [])))
            .catch(() => toast.error('Failed to load projects'))
            .finally(() => setLoadingPrj(false));
    }, []);

    useEffect(() => {
        if (!form.project) { setTasks([]); setForm(f => ({ ...f, task: '' })); return; }
        setLoadingTasks(true);
        executionService.getProjectTasks(form.project)
            .then(d => { setTasks(Array.isArray(d) ? d : (d?.results ?? [])); setForm(f => ({ ...f, task: '' })); })
            .catch(() => toast.error('Failed to load tasks'))
            .finally(() => setLoadingTasks(false));
    }, [form.project]);

    const setField = (field, val) => {
        setForm(f => ({ ...f, [field]: val }));
        setErrors(e => ({ ...e, [field]: null }));
    };

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const r = new FileReader();
        r.onload = ev => setImagePreview(ev.target.result);
        r.readAsDataURL(file);
    };

    const clearImage = () => { setImageFile(null); setImagePreview(null); setIsPrimary(false); setImageCaption(''); };

    const validate = () => {
        const e = {};
        if (!form.project) e.project = 'Select a project.';
        if (!form.task) e.task = 'Select a schedule task.';
        if (!form.achieved_quantity || +form.achieved_quantity <= 0) e.achieved_quantity = 'Enter a positive quantity.';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSubmitting(true);
        setErrors({});
        try {
            const log = await executionService.createLog({
                project: form.project, task: form.task,
                achieved_quantity: form.achieved_quantity, remarks: form.remarks,
                latitude: form.latitude, longitude: form.longitude,
            });
            if (imageFile && log.id) {
                await executionService.uploadImage(log.id, imageFile, isPrimary, imageCaption);
            }
            setSubmitted(true);
            setForm(INIT);
            clearImage();
            toast.success(imageFile ? 'Log submitted with photo. Weather auto-fetched! 🌤' : 'Site log submitted. Weather auto-fetched! 🌤');
            setTimeout(() => setSubmitted(false), 6000);
        } catch (err) {
            const sd = err?.response?.data;
            if (sd && typeof sd === 'object') {
                setErrors(sd);
                toast.error(String(Object.values(sd).flat()[0] || 'Submission failed'));
            } else {
                toast.error('Failed to submit. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Convert to SearchableSelect option format
    const projectOptions = projects.map(p => ({ id: p.id, label: p.name }));
    const taskOptions = tasks.map(t => ({
        id: t.id,
        label: t.wbs_code ? `[${t.wbs_code}] ${t.name}` : t.name,
    }));

    const selectedTask = tasks.find(t => String(t.id) === String(form.task));
    const step1Done = !!(form.project && form.task && form.achieved_quantity && +form.achieved_quantity > 0);
    const step2Done = !!(form.latitude && form.longitude);
    const step3Done = !!imageFile;
    const allDone = step1Done && step2Done && step3Done;

    return (
        <div className="max-w-2xl mx-auto pb-16 space-y-1">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/25">
                    <ClipboardList size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-app-heading">Daily Site Log</h1>
                    <p className="text-xs text-app-muted mt-0.5">Track progress · GPS · Weather auto-fetched</p>
                </div>
                {/* Step dots */}
                <div className="ml-auto flex items-center gap-2">
                    {[
                        { done: step1Done, color: 'bg-blue-500' },
                        { done: step2Done, color: 'bg-emerald-500' },
                        { done: step3Done, color: 'bg-violet-500' },
                    ].map((s, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300
                            ${s.done ? s.color + ' scale-110' : 'bg-app-secondary border border-app-subtle'}`} />
                    ))}
                </div>
            </motion.div>

            {/* Success banner */}
            <AnimatePresence>
                {submitted && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 mb-4 rounded-2xl
                            bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                    >
                        <CheckCircle2 size={18} />
                        <p className="text-sm font-semibold flex-1">Log submitted and weather auto-fetched! 🌤</p>
                        <button onClick={() => setSubmitted(false)} className="opacity-60 hover:opacity-100 transition-opacity">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── Card 1: Execution Details ── */}
                <Card step={1} icon={ClipboardList} title="Execution Details" color="blue"
                    subtitle="Project, task, and quantity achieved today"
                    isComplete={step1Done}>

                    {/* Project — searchable */}
                    <div>
                        <Label required>Project</Label>
                        <SearchableSelect
                            options={projectOptions}
                            value={form.project}
                            onChange={(id) => setField('project', id)}
                            placeholder={loadingPrj ? 'Loading projects…' : 'Select a project…'}
                            searchPlaceholder="Type to search projects…"
                            loading={loadingPrj}
                        />
                        <FieldError msg={errors.project} />
                    </div>

                    {/* Task — searchable */}
                    <div>
                        <Label required>Schedule Task</Label>
                        <SearchableSelect
                            options={taskOptions}
                            value={form.task}
                            onChange={(id) => setField('task', id)}
                            placeholder={
                                !form.project ? 'Select a project first…'
                                    : tasks.length === 0 && !loadingTasks ? 'No tasks for this project'
                                        : 'Select a task…'
                            }
                            searchPlaceholder="Type to search tasks…"
                            disabled={!form.project}
                            loading={loadingTasks}
                        />
                        <FieldError msg={errors.task} />
                    </div>

                    {/* Quantity + UOM */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <Label required>Achieved Quantity</Label>
                            <input type="number" min="0" step="0.0001"
                                value={form.achieved_quantity}
                                onChange={e => setField('achieved_quantity', e.target.value)}
                                placeholder="e.g. 15.5"
                                className={inputCls}
                            />
                            <FieldError msg={errors.achieved_quantity} />
                        </div>
                        <div>
                            <Label>Unit (UOM)</Label>
                            <div className={`${inputCls} flex items-center justify-center
                                font-bold text-app-heading bg-app-secondary/60`}>
                                {selectedTask?.uom || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <Label>Remarks / Site Notes</Label>
                        <textarea rows={3}
                            value={form.remarks}
                            onChange={e => setField('remarks', e.target.value)}
                            placeholder="Site conditions, observations, issues encountered…"
                            className={inputCls + ' resize-none'}
                        />
                    </div>
                </Card>

                {/* ── Card 2: GPS Location ── */}
                <Card step={2} icon={MapPin} title="GPS Site Location" color="emerald"
                    subtitle="Search a place, use GPS, or click the map"
                    isComplete={step2Done}>
                    <Suspense fallback={
                        <div className="h-48 rounded-xl bg-app-secondary border border-app-subtle
                            flex items-center justify-center gap-2 text-app-muted text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading map…
                        </div>
                    }>
                        <LocationPicker
                            value={{ latitude: form.latitude, longitude: form.longitude }}
                            onChange={({ latitude, longitude }) => setForm(f => ({ ...f, latitude, longitude }))}
                            height="300px"
                        />
                    </Suspense>
                </Card>

                {/* ── Card 3: Site Photo ── */}
                <Card step={3} icon={ImageIcon} title="Site Photo" color="violet"
                    subtitle="Upload today's site photo (optional)"
                    isComplete={step3Done}>
                    {!imagePreview ? (
                        <label htmlFor="site-img" className="group flex flex-col items-center gap-3 py-8
                            border-2 border-dashed border-app-subtle rounded-xl cursor-pointer
                            hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300">
                            <div className="p-4 rounded-2xl bg-app-secondary group-hover:bg-blue-500/10 transition-colors">
                                <Upload size={22} className="text-app-muted group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-app-heading">Click to upload site photo</p>
                                <p className="text-xs text-app-muted mt-0.5">PNG, JPG, WEBP — up to 50 MB</p>
                            </div>
                            <input id="site-img" type="file" accept="image/*" className="sr-only" onChange={handleImageSelect} />
                        </label>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden ring-1 ring-app-subtle">
                                <img src={imagePreview} alt="preview" className="w-full h-48 object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                <button type="button" onClick={clearImage}
                                    className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80
                                        rounded-full text-white transition-colors backdrop-blur-sm">
                                    <X size={13} />
                                </button>
                                {isPrimary && (
                                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5
                                        px-2.5 py-1 bg-amber-500 rounded-full text-white text-[10px] font-bold">
                                        <Star size={9} fill="white" /> Cover Photo
                                    </div>
                                )}
                            </div>

                            <input type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)}
                                placeholder="Add caption… (optional)" className={inputCls} />

                            {/* Primary toggle */}
                            <button type="button" onClick={() => setIsPrimary(p => !p)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border
                                    transition-all duration-200
                                    ${isPrimary
                                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                                        : 'border-app-subtle bg-app-secondary/50 text-app-muted hover:border-amber-500/30 hover:bg-amber-500/5'
                                    }`}>
                                <Star size={15} fill={isPrimary ? 'currentColor' : 'none'} />
                                <span className="text-sm font-semibold flex-1 text-left">
                                    {isPrimary ? 'Set as project cover photo ✓' : 'Set as project cover photo'}
                                </span>
                                <div className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors duration-200
                                    ${isPrimary ? 'bg-amber-500' : 'bg-app-secondary border border-app-subtle'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
                                        transition-all duration-200 ${isPrimary ? 'left-[18px]' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>
                    )}
                </Card>

                {/* Weather notice */}
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl
                    bg-sky-500/8 border border-sky-500/20">
                    <div className="p-2.5 rounded-xl bg-sky-500/15 flex-shrink-0">
                        <CloudSun size={18} className="text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">Weather is auto-fetched</p>
                        <p className="text-xs text-app-muted mt-0.5">
                            Temperature and rainfall logged from Open-Meteo after submission.
                            Requires GPS location to be set.
                        </p>
                    </div>
                    <div className="text-right text-xs text-app-muted space-y-0.5 hidden sm:block flex-shrink-0">
                        <div className="flex items-center gap-1.5"><Thermometer size={11} /> Max/Min Temp</div>
                        <div className="flex items-center gap-1.5"><CloudRain size={11} /> Rainfall mm</div>
                    </div>
                </div>

                {/* ── Submit — uses the same Button as "Create Project" ── */}
                <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 text-sm"
                >
                    {submitting ? (
                        <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                    ) : (
                        <><ClipboardList size={18} /> Submit Daily Site Log <ArrowRight size={15} className="ml-auto opacity-70" /></>
                    )}
                </Button>

                {/* Completion hint */}
                <p className="text-center text-xs text-app-muted pb-2">
                    {allDone
                        ? '✅ All sections complete — ready to submit!'
                        : `${[step1Done, step2Done, step3Done].filter(Boolean).length}/3 sections complete`}
                </p>
            </form>
        </div>
    );
};

export default SiteExecution;
