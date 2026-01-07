import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const userRoles = ['SPV_Official', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design', 'Govt_Department', 'NICDC_HQ'];
const actions = ['Verify', 'Approve', 'Review', 'Sign', 'Submit', 'Reject'];

const SortableStep = ({ step, index, onDelete, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `step-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Step</label>
          <input
            type="number"
            value={step.step}
            onChange={(e) => onUpdate(index, 'step', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            min={1}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
          <select
            value={step.role}
            onChange={(e) => onUpdate(index, 'role', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Action</label>
          <select
            value={step.action}
            onChange={(e) => onUpdate(index, 'action', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => onDelete(index)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        aria-label="Delete step"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const WorkflowConfig = () => {

  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([
    {
      id: 'wf-1',
      name: 'RFQ Approval Flow',
      type: 'RFQ',
      steps: [
        { step: 1, role: 'EPC_Contractor', action: 'Submit', required: true },
        { step: 2, role: 'PMNC_Team', action: 'Review', required: true },
        { step: 3, role: 'SPV_Official', action: 'Approve', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || '',
    },
  ]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowType, setWorkflowType] = useState('Custom');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!selectedWorkflow || !over || active.id === over.id) return;

    const oldIndex = selectedWorkflow.steps.findIndex((_, i) => `step-${i}` === active.id);
    const newIndex = selectedWorkflow.steps.findIndex((_, i) => `step-${i}` === over.id);

    const newSteps = arrayMove(selectedWorkflow.steps, oldIndex, newIndex);
    const updatedSteps = newSteps.map((step, index) => ({ ...step, step: index + 1 }));

    setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
  };

  const handleAddStep = () => {
    if (!selectedWorkflow) return;
    const newStep = {
      step: selectedWorkflow.steps.length + 1,
      role: 'PMNC_Team',
      action: 'Review',
      required: true,
    };
    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: [...selectedWorkflow.steps, newStep],
    });
  };

  const handleDeleteStep = (index) => {
    if (!selectedWorkflow) return;
    const newSteps = selectedWorkflow.steps.filter((_, i) => i !== index);
    const updatedSteps = newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
  };

  const handleUpdateStep = (index, field, value) => {
    if (!selectedWorkflow) return;
    const newSteps = [...selectedWorkflow.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSelectedWorkflow({ ...selectedWorkflow, steps: newSteps });
  };

  const handleSaveWorkflow = () => {
    if (!selectedWorkflow || !workflowName) {
      toast.error('Please enter a workflow name');
      return;
    }

    const workflow = {
      ...selectedWorkflow,
      name: workflowName,
      type: workflowType,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = workflows.findIndex((w) => w.id === workflow.id);
    if (existingIndex >= 0) {
      const updated = [...workflows];
      updated[existingIndex] = workflow;
      setWorkflows(updated);
    } else {
      setWorkflows([...workflows, { ...workflow, id: `wf-${Date.now()}`, createdAt: new Date().toISOString() }]);
    }

    toast.success('Workflow saved successfully');
  };

  const handleCreateNew = () => {
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      name: '',
      type: 'Custom',
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || '',
    };
    setWorkflows([...workflows, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
    setWorkflowName('');
    setWorkflowType('Custom');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary-950">Workflow Configuration</h1>
          <p className="text-slate-500 mt-1">Define approval flows dynamically</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus size={18} />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setWorkflowName(workflow.name);
                    setWorkflowType(workflow.type);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedWorkflow?.id === workflow.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <p className="font-semibold text-sm">{workflow.name || 'Unnamed Workflow'}</p>
                  <p className="text-xs text-slate-500 mt-1">{workflow.type} • {workflow.steps.length} steps</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Editor */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWorkflow ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Workflow Name</label>
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g., RFQ Approval Flow"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Workflow Type</label>
                    <select
                      value={workflowType}
                      onChange={(e) => setWorkflowType(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="RFQ">RFQ</option>
                      <option value="Contract">Contract</option>
                      <option value="Bill">Bill</option>
                      <option value="Payment">Payment</option>
                      <option value="Document">Document</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Approval Steps</CardTitle>
                  <Button onClick={handleAddStep} size="sm">
                    <Plus size={16} />
                    Add Step
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedWorkflow.steps.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No steps defined. Click "Add Step" to get started.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={selectedWorkflow.steps.map((_, i) => `step-${i}`)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {selectedWorkflow.steps.map((step, index) => (
                            <SortableStep
                              key={`step-${index}`}
                              step={step}
                              index={index}
                              onDelete={handleDeleteStep}
                              onUpdate={handleUpdateStep}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveWorkflow}>
                  <Save size={18} />
                  Save Workflow
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <p>Select a workflow from the list or create a new one to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowConfig;






