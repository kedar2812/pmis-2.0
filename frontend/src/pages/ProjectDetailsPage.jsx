import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService from '@/api/services/projectService';
import mastersService from '@/api/services/mastersService';

import { ProjectDetailView } from '@/components/projects/ProjectDetailView';
import Button from '@/components/ui/Button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProjectDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [packages, setPackages] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadProjectData = async () => {
        try {
            setLoading(true);
            const [projectData, contractorsRes] = await Promise.all([
                projectService.getProjectById(id),
                mastersService.getActiveContractors()
            ]);

            setProject(projectData);
            setContractors(contractorsRes.data?.results || contractorsRes.data || []);

            // If the project serializer returns work_packages, use them.
            // Otherwise fetch separately.
            if (projectData.work_packages) {
                setPackages(projectData.work_packages);
            } else {
                const packagesData = await projectService.getPackages(id);
                setPackages(packagesData);
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            toast.error('Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadProjectData();
        }
    }, [id]);

    const handlePackageCreated = () => {
        loadProjectData(); // Refresh data
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <h2 className="text-2xl font-bold text-app-heading">Project Not Found</h2>
                <Button onClick={() => navigate('/projects')} className="mt-4">
                    Back to Projects
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full">
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-2">
                <ChevronLeft size={16} className="mr-1" /> Back
            </Button>
            <div className="bg-app-card rounded-lg shadow-sm border border-app-subtle overflow-hidden min-h-[85vh]">
                <ProjectDetailView
                    project={project}
                    packages={packages}
                    contractors={contractors}
                    onPackageUpdate={handlePackageCreated}
                />
            </div>
        </div>
    );
};

export default ProjectDetailsPage;

