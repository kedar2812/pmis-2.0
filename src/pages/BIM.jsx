import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Box, RotateCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BIM = () => {
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const [activeHotspot, setActiveHotspot] = useState(null);

  const hotspots = [
    { id: 'road', x: 50, y: 50, label: 'Road Infrastructure', info: 'Main road section with standard specifications' },
    { id: 'pipe', x: 65, y: 35, label: 'Utility Pipe', info: 'Water supply pipe with 300mm diameter' },
    { id: 'building', x: 30, y: 60, label: 'Building Structure', info: 'Administrative building with 3 floors' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    // Use refs to track Three.js objects for proper cleanup
    const threeState = {
      scene: null,
      camera: null,
      renderer: null,
      animationId: null,
      isMounted: true,
      resizeTimeout: null,
      handleResize: null,
    };

    // Initialize Three.js scene
    import('three').then((THREE) => {
      if (!threeState.isMounted || !containerRef.current) return;

      try {
        threeState.scene = new THREE.Scene();
        threeState.scene.background = new THREE.Color(0xf0f0f0);

        threeState.camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        threeState.camera.position.set(5, 5, 5);
        threeState.camera.lookAt(0, 0, 0);

        threeState.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        threeState.renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        threeState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(threeState.renderer.domElement);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        threeState.scene.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        threeState.scene.add(axesHelper);

        // Add some basic geometry to represent infrastructure
        const geometry1 = new THREE.BoxGeometry(2, 0.2, 2);
        const material1 = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const road = new THREE.Mesh(geometry1, material1);
        road.position.set(0, 0, 0);
        threeState.scene.add(road);

        const geometry2 = new THREE.CylinderGeometry(0.3, 0.3, 2, 32);
        const material2 = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
        const pipe = new THREE.Mesh(geometry2, material2);
        pipe.position.set(2, 1, 0);
        threeState.scene.add(pipe);

        const geometry3 = new THREE.BoxGeometry(1, 1, 1);
        const material3 = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const building = new THREE.Mesh(geometry3, material3);
        building.position.set(-2, 0.5, 0);
        threeState.scene.add(building);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        threeState.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        threeState.scene.add(directionalLight);

        // Animation loop
        const animate = () => {
          if (!threeState.isMounted) return;
          threeState.animationId = requestAnimationFrame(animate);
          if (threeState.renderer && threeState.scene && threeState.camera) {
            threeState.renderer.render(threeState.scene, threeState.camera);
          }
        };
        animate();

        // Handle resize with debounce
        threeState.handleResize = () => {
          if (!threeState.isMounted || !containerRef.current || !threeState.camera || !threeState.renderer) return;
          if (threeState.resizeTimeout) clearTimeout(threeState.resizeTimeout);
          threeState.resizeTimeout = setTimeout(() => {
            if (!threeState.isMounted || !containerRef.current || !threeState.camera || !threeState.renderer) return;
            threeState.camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            threeState.camera.updateProjectionMatrix();
            threeState.renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
          }, 100);
        };
        window.addEventListener('resize', threeState.handleResize);
      } catch (error) {
        console.error('Failed to initialize Three.js:', error);
      }
    }).catch((error) => {
      console.error('Failed to load Three.js:', error);
    });

    return () => {
      threeState.isMounted = false;
      
      if (threeState.handleResize) {
        window.removeEventListener('resize', threeState.handleResize);
      }
      if (threeState.resizeTimeout) {
        clearTimeout(threeState.resizeTimeout);
      }
      if (threeState.animationId !== null) {
        cancelAnimationFrame(threeState.animationId);
      }
      if (threeState.renderer) {
        threeState.renderer.dispose();
        // Safely remove the canvas element
        if (threeState.renderer.domElement && threeState.renderer.domElement.parentNode) {
          threeState.renderer.domElement.parentNode.removeChild(threeState.renderer.domElement);
        }
      }
      // Clean up geometries and materials
      if (threeState.scene) {
        threeState.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.bim')}</h1>
        <p className="text-gray-600 mt-1">{t('bim.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('bim.modelViewer')}</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {t('bim.interactiveVisualization')}
          </p>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="h-[600px] w-full rounded-lg bg-gray-100 relative overflow-hidden">
            {/* Interactive Hotspots */}
            {hotspots.map((hotspot) => (
              <motion.button
                key={hotspot.id}
                className="absolute z-10 w-8 h-8 bg-primary-600 rounded-full border-2 border-white shadow-lg hover:bg-primary-700 transition-colors"
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                onClick={() => setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Info size={16} className="text-white m-auto" />
              </motion.button>
            ))}
            
            {/* Hotspot Info Popup */}
            <AnimatePresence>
              {activeHotspot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-xl rounded-xl shadow-glass border border-slate-200/50 p-4"
                >
                  {(() => {
                    const hotspot = hotspots.find((h) => h.id === activeHotspot);
                    return hotspot ? (
                      <>
                        <h4 className="font-semibold text-sm mb-1">{hotspot.label}</h4>
                        <p className="text-xs text-slate-600">{hotspot.info}</p>
                      </>
                    ) : null;
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Box className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">{t('bim.infrastructureModels')}</p>
                <p className="text-sm text-gray-600">{t('bim.modelsDescription')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <RotateCw className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">{t('bim.interactiveView')}</p>
                <p className="text-sm text-gray-600">{t('bim.rotateZoomExplore')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Box className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">{t('bim.bimIntegration')}</p>
                <p className="text-sm text-gray-600">{t('bim.bimData')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BIM;


