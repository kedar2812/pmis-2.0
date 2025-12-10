import { useParams, useNavigate } from 'react-router-dom';
import { useMockData } from '@/hooks/useMockData';
import { ProjectDetailView } from '@/components/projects/ProjectDetailView';
import Button from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';

const ProjectDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { projects } = useMockData();

    const project = projects.find((p) => String(p.id) === String(id));

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <h2 className="text-2xl font-bold text-slate-800">Project Not Found</h2>
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
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[85vh]">
                <ProjectDetailView project={project} />
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
