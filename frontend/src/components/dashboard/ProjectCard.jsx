/**
 * ProjectCard.jsx — Media-rich project card for the dashboard portfolio section.
 *
 * Layout:
 * - Top 40-50%: site photo (object-cover) with gradient fallback
 * - Body: name, status badge, live physical progress bar
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, MapPin, Calendar } from 'lucide-react';

// ─── Status badge config ───────────────────────────────────────────────────
const STATUS_CONFIG = {
    'In Progress': {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
    },
    'Planning': {
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    'Completed': {
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
    },
    'On Hold': {
        bg: 'bg-slate-100 dark:bg-neutral-700/60',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
    'Under Review': {
        bg: 'bg-violet-100 dark:bg-violet-900/40',
        text: 'text-violet-700 dark:text-violet-300',
        dot: 'bg-violet-500',
    },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['On Hold'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {status || 'Unknown'}
        </span>
    );
};

// ─── Progress bar ──────────────────────────────────────────────────────────
const ProgressBar = ({ value = 0, label }) => {
    const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
    const color =
        pct >= 75 ? 'from-emerald-500 to-emerald-600' :
            pct >= 40 ? 'from-blue-500 to-blue-600' :
                'from-amber-500 to-amber-600';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-app-muted font-medium flex items-center gap-1">
                    <TrendingUp size={11} />
                    {label}
                </span>
                <span className="font-bold text-app-heading">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-app-secondary rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
};

// ─── Geometric gradient fallback (no photo) ────────────────────────────────
const NoPhotoFallback = ({ name }) => {
    // Generate a deterministic hue from the project name string
    const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    const hue2 = (hue + 60) % 360;

    return (
        <div
            className="w-full h-full flex items-center justify-center relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, hsl(${hue}, 55%, 20%) 0%, hsl(${hue2}, 40%, 15%) 100%)`,
            }}
        >
            {/* Geometric SVG pattern */}
            <svg
                className="absolute inset-0 w-full h-full opacity-20"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern id={`grid-${hue}`} width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${hue})`} />
                <circle cx="30%" cy="50%" r="60" fill="white" fillOpacity="0.05" />
                <circle cx="80%" cy="30%" r="80" fill="white" fillOpacity="0.04" />
            </svg>
            <p className="relative text-white/70 text-xs font-medium tracking-wider uppercase px-4 text-center">
                No site photo yet
            </p>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
const ProjectCard = ({ project }) => {
    const navigate = useNavigate();

    const {
        id,
        name = 'Untitled Project',
        status = 'Planning',
        physical_progress = 0,
        latest_site_photo,
        location_display,
        end_date,
    } = project;

    // Build absolute media URL for the site photo
    const photoUrl = latest_site_photo
        ? (latest_site_photo.startsWith('http')
            ? latest_site_photo
            : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'}${latest_site_photo.startsWith('/') ? latest_site_photo : `/${latest_site_photo}`
            }`)
        : null;

    return (
        <motion.div
            onClick={() => navigate(`/projects/${id}`)}
            className="group cursor-pointer rounded-2xl overflow-hidden
                       bg-app-card border border-app-subtle shadow-sm
                       hover:shadow-xl dark:hover:shadow-2xl
                       hover:border-blue-500/30 transition-all duration-300"
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            {/* ── Top: Site Photo or Fallback (h-48 = ~192px) ── */}
            <div className="relative h-48 w-full overflow-hidden">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={`${name} — latest site photo`}
                        className="object-cover w-full h-48 group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <NoPhotoFallback name={name} />
                )}

                {/* Status badge overlay */}
                <div className="absolute top-3 right-3">
                    <StatusBadge status={status} />
                </div>

                {/* Gradient scrim at bottom for readability */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
            </div>

            {/* ── Card Body ── */}
            <div className="p-4 space-y-3">
                {/* Project Name */}
                <h3 className="font-bold text-app-heading text-base leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {name}
                </h3>

                {/* Location & End Date */}
                <div className="flex items-center gap-3 text-xs text-app-muted">
                    {location_display && (
                        <span className="flex items-center gap-1 truncate">
                            <MapPin size={11} />
                            {location_display}
                        </span>
                    )}
                    {end_date && (
                        <span className="flex items-center gap-1 shrink-0 ml-auto">
                            <Calendar size={11} />
                            {new Date(end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                    )}
                </div>

                {/* Physical Progress Bar */}
                <ProgressBar
                    value={physical_progress}
                    label="Physical Progress"
                />
            </div>
        </motion.div>
    );
};

export default ProjectCard;
