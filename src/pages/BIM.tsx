import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Box, RotateCw } from 'lucide-react';

const BIM = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Initialize Three.js scene
      import('three').then((THREE) => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current!.clientWidth / containerRef.current!.clientHeight,
          0.1,
          1000
        );
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        containerRef.current!.appendChild(renderer.domElement);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        scene.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Add some basic geometry to represent infrastructure
        const geometry1 = new THREE.BoxGeometry(2, 0.2, 2);
        const material1 = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const road = new THREE.Mesh(geometry1, material1);
        road.position.set(0, 0, 0);
        scene.add(road);

        const geometry2 = new THREE.CylinderGeometry(0.3, 0.3, 2, 32);
        const material2 = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
        const pipe = new THREE.Mesh(geometry2, material2);
        pipe.position.set(2, 1, 0);
        scene.add(pipe);

        const geometry3 = new THREE.BoxGeometry(1, 1, 1);
        const material3 = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const building = new THREE.Mesh(geometry3, material3);
        building.position.set(-2, 0.5, 0);
        scene.add(building);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        scene.add(directionalLight);

        // Animation loop
        let animationId: number;
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          camera.aspect = containerRef.current!.clientWidth / containerRef.current!.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          cancelAnimationFrame(animationId);
          renderer.dispose();
          if (containerRef.current && renderer.domElement.parentNode) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.bim')}</h1>
        <p className="text-gray-600 mt-1">3D Building Information Modeling Viewer</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>3D Model Viewer</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Interactive 3D visualization of infrastructure components
          </p>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="h-[600px] w-full rounded-lg bg-gray-100" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Box className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">Infrastructure Models</p>
                <p className="text-sm text-gray-600">3D models of project components</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <RotateCw className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">Interactive View</p>
                <p className="text-sm text-gray-600">Rotate, zoom, and explore models</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Box className="text-primary-600" size={32} />
              <div>
                <p className="font-medium">BIM Integration</p>
                <p className="text-sm text-gray-600">Building Information Modeling data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BIM;


