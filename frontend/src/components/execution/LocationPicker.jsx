/**
 * LocationPicker.jsx
 *
 * Fixes in this version:
 * 1. Map search bar (leaflet-geosearch, OpenStreetMap Nominatim — free, no API key)
 * 2. Satellite view now shows place labels via Esri Reference label overlay
 * 3. Dismissible geolocation error with Retry, browser-settings hint for denied
 * 4. Custom emerald site-pin icon
 */
import { useEffect, useCallback, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    LayersControl,
    useMapEvents,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { MapPin, Navigation, X, Layers, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

// ── Fix Vite asset path issue ────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom site pin (emerald diamond) ────────────────────────────
const SITE_ICON = new L.DivIcon({
    className: '',
    html: `<div style="
        width:28px;height:28px;
        background:linear-gradient(135deg,#10b981,#0ea5e9);
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(16,185,129,0.55);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
});

// ── 1. Map search control ─────────────────────────────────────────
const SearchControl = ({ onSelect }) => {
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const ctrl = new GeoSearchControl({
            provider,
            style: 'bar',
            autoClose: true,
            retainZoomLevel: false,
            animateZoom: true,
            keepResult: true,
            searchLabel: 'Search place or address…',
            showMarker: false,   // We handle our own marker
            showPopup: false,
        });
        map.addControl(ctrl);

        // When user picks a result, drop our custom pin there
        map.on('geosearch/showlocation', (result) => {
            const { location } = result;
            onSelect?.(location.y, location.x); // y=lat, x=lng
            map.flyTo([location.y, location.x], 16, { animate: true, duration: 1.2 });
        });

        return () => {
            map.removeControl(ctrl);
            map.off('geosearch/showlocation');
        };
    }, [map, onSelect]);
    return null;
};

// ── 2. Click handler ──────────────────────────────────────────────
const ClickHandler = ({ onPick }) => {
    useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
    return null;
};

// ── 3. Fly-to on GPS ──────────────────────────────────────────────
const FlyTo = ({ lat, lng, t }) => {
    const map = useMapEvents({});
    useEffect(() => {
        if (lat != null && lng != null) {
            map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
        }
    }, [lat, lng, t, map]);
    return null;
};

// ═════════════════════════════════════════════════════════════════
const LocationPicker = ({ value, onChange, height = '340px' }) => {
    const DEFAULT_CENTER = [17.68, 77.60];
    const DEFAULT_ZOOM = 5;

    const [marker, setMarker] = useState(
        value?.latitude && value?.longitude
            ? { lat: Number(value.latitude), lng: Number(value.longitude) }
            : null
    );
    const [flyTarget, setFlyTarget] = useState(null);
    const [locating, setLocating] = useState(false);
    const [geoError, setGeoError] = useState(null);
    const [denied, setDenied] = useState(false);

    // Sync initial value from parent
    useEffect(() => {
        if (value?.latitude && value?.longitude && !marker) {
            setMarker({ lat: Number(value.latitude), lng: Number(value.longitude) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pick = useCallback((lat, lng) => {
        const pos = { lat, lng };
        setMarker(pos);
        onChange?.({ latitude: lat, longitude: lng });
    }, [onChange]);

    // Called by GeoSearch when user picks a search result
    const handleSearchSelect = useCallback((lat, lng) => {
        pick(lat, lng);
    }, [pick]);

    const handleGps = () => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by this browser.');
            return;
        }
        setGeoError(null);
        setDenied(false);
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                pick(coords.latitude, coords.longitude);
                // Include timestamp to force effect re-run even if coords match
                setFlyTarget({ lat: coords.latitude, lng: coords.longitude, t: Date.now() });
                setLocating(false);
            },
            (err) => {
                setLocating(false);
                if (err.code === err.PERMISSION_DENIED) {
                    setDenied(true);
                    setGeoError('Location access was denied by the browser.');
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setGeoError('Location unavailable. Check your device GPS.');
                } else {
                    setGeoError('Location timed out. Try again or click the map.');
                }
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    };

    const dismissError = () => { setGeoError(null); setDenied(false); };

    const coordsText = marker
        ? `${marker.lat.toFixed(5)}°,  ${marker.lng.toFixed(5)}°`
        : null;

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-300 border
                    ${marker
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-app-secondary text-app-muted border-app-subtle'}`}>
                    <MapPin size={11} className={marker ? 'text-emerald-500' : 'text-app-muted'} />
                    {coordsText ?? 'No location set — search or click map'}
                </div>

                {/* GPS button — same Button component as Create Project */}
                <Button
                    type="button"
                    onClick={handleGps}
                    disabled={locating}
                    className="text-sm"
                >
                    {locating ? (
                        <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            <span>Locating…</span>
                        </>
                    ) : (
                        <>
                            <Navigation size={14} />
                            <span>Use My Location</span>
                        </>
                    )}
                </Button>
            </div>

            {/* Error bar */}
            {geoError && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl
                    bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{geoError}</p>
                        {denied && (
                            <p className="text-xs text-rose-500/80 mt-0.5">
                                Fix: browser Settings → Site Permissions → Location → Allow.
                                Or <strong>search</strong> for a place or <strong>click the map</strong> to set location manually.
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!denied && (
                            <button type="button" onClick={handleGps} title="Retry"
                                className="p-1 rounded-lg hover:bg-rose-500/10 transition-colors">
                                <RefreshCw size={13} />
                            </button>
                        )}
                        <button type="button" onClick={dismissError} title="Dismiss"
                            className="p-1 rounded-lg hover:bg-rose-500/10 transition-colors">
                            <X size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* Map container — hides Leaflet attribution watermark */}
            <div
                className="rounded-2xl overflow-hidden border border-app-subtle shadow-lg relative"
                style={{ height }}
            >
                {/* Layer hint */}
                <div className="absolute top-14 left-3 z-[999] flex items-center gap-1.5
                    px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 text-[10px]
                    pointer-events-none select-none">
                    <Layers size={10} />
                    Street / Satellite
                </div>

                {/* Hide Leaflet attribution */}
                <style>{`.leaflet-control-attribution { display: none !important; }`}</style>

                <MapContainer
                    center={marker ? [marker.lat, marker.lng] : DEFAULT_CENTER}
                    zoom={marker ? 15 : DEFAULT_ZOOM}
                    style={{ height: '100%', width: '100%' }}
                >
                    {/* Search control (Nominatim, no API key) */}
                    <SearchControl onSelect={handleSearchSelect} />

                    <ClickHandler onPick={pick} />
                    {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} t={flyTarget.t} />}

                    <LayersControl position="topright">
                        {/* Street View */}
                        <LayersControl.BaseLayer checked name="🗺 Street">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                maxZoom={19}
                            />
                        </LayersControl.BaseLayer>

                        {/* Satellite — Esri World Imagery (no labels) */}
                        <LayersControl.BaseLayer name="🛰 Satellite">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution="Tiles © Esri — Maxar, GeoEye, Earthstar Geographics"
                                maxZoom={18}
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    {/*
                        FIX: Place labels on top of satellite.
                        This overlay is always rendered (not tied to layer toggle) so labels
                        appear on both Street and Satellite views. The Esri Reference layer
                        is transparent everywhere except text/borders.
                    */}
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        attribution=""
                        maxZoom={18}
                        opacity={1}
                        pane="overlayPane"
                    />

                    {marker && (
                        <Marker position={[marker.lat, marker.lng]} icon={SITE_ICON}>
                            <Popup closeButton={false}>
                                <div className="text-xs font-medium py-0.5">
                                    📍 Site Location<br />
                                    <span className="text-gray-500">
                                        {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            <p className="text-xs text-app-muted flex items-center gap-1.5">
                <MapPin size={10} />
                Search a place, click on the map, or use GPS to set the site location.
            </p>
        </div>
    );
};

export default LocationPicker;
