import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Save, Settings, Filter, ChevronRight, Clock, ToggleLeft, ToggleRight, Loader2, AlertCircle, Workflow, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { workflowService, WORKFLOW_MODULES, ACTION_TYPES, WORKFLOW_ROLES } from '@/api/services/workflowService';

// Sortable Step Component
const SortableStep = ({ step, index, onDelete, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id || `step-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex items-center gap-3 p-4 bg-app-surface border border-app-subtle rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-app-muted hover:text-app-text">
        <GripVertical size={20} />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300">
        {step.sequence || index + 1}
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Role</label>
          <select
            value={step.role || ''}
            onChange={(e) => onUpdate(index, 'role', e.target.value)}
            className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
          >
            <option value="">Select Role</option>
            {WORKFLOW_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Action Type</label>
          <select
            value={step.action_type || ''}
            onChange={(e) => onUpdate(index, 'action_type', e.target.value)}
            className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
          >
            {ACTION_TYPES.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">Custom Label</label>
          <input
            type="text"
            value={step.action_label || ''}
            onChange={(e) => onUpdate(index, 'action_label', e.target.value)}
            placeholder="e.g., Technical Sanction"
            className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-app-muted mb-1 block">SLA (Days)</label>
          <input
            type="number"
            value={step.deadline_days || 3}
            onChange={(e) => onUpdate(index, 'deadline_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
            min={1}
            max={30}
          />
        </div>
      </div>
      <button
        onClick={() => onDelete(index)}
        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        aria-label="Delete step"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
};

// Trigger Rule Component
const TriggerRuleCard = ({ rule, onEdit, onDelete }) => {
  const operatorLabels = {
    GT: '>',
    GTE: '≥',
    LT: '<',
    LTE: '≤',
    EQ: '=',
    NEQ: '≠',
    IN: 'in',
    NOT_IN: 'not in',
    CONTAINS: 'contains'
  };

  return (
    <div className="p-4 bg-app-surface border border-app-subtle rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-app-heading">{rule.name}</h4>
        <div className="flex gap-2">
          <button onClick={() => onEdit(rule)} className="text-primary-600 hover:text-primary-700 text-sm">
            Edit
          </button>
          <button onClick={() => onDelete(rule.id)} className="text-red-500 hover:text-red-600 text-sm">
            Delete
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-app-muted">
        <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">{rule.condition_field}</code>
        <span>{operatorLabels[rule.condition_operator] || rule.condition_operator}</span>
        <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">{rule.condition_value}</code>
        <ChevronRight size={16} />
        <span className="text-primary-600">{rule.template_name}</span>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-app-muted">
        <span>Priority: {rule.priority}</span>
        <span className={`px-2 py-0.5 rounded ${rule.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
          {rule.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
};

const WorkflowConfig = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    module: 'RA_BILL',
    description: '',
    is_active: true,
    is_default: false
  });
  const [localSteps, setLocalSteps] = useState([]);

  // Trigger rules state
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    module: 'RA_BILL',
    condition_field: '',
    condition_operator: 'GT',
    condition_value: '',
    template: '',
    priority: 100,
    is_active: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch data
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workflowService.getTemplates();
      setTemplates(data.results || data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const data = await workflowService.getRules();
      setRules(data.results || data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRules();
  }, [fetchTemplates, fetchRules]);

  // Template handlers
  const handleSelectTemplate = async (template) => {
    try {
      const detail = await workflowService.getTemplate(template.id);
      setSelectedTemplate(detail);
      setTemplateForm({
        name: detail.name,
        module: detail.module,
        description: detail.description || '',
        is_active: detail.is_active,
        is_default: detail.is_default
      });
      setLocalSteps(detail.steps || []);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      toast.error('Failed to load template details');
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate({ id: 'new' });
    setTemplateForm({
      name: '',
      module: 'RA_BILL',
      description: '',
      is_active: true,
      is_default: false
    });
    setLocalSteps([]);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      setSaving(true);
      let savedTemplate;

      if (selectedTemplate?.id === 'new') {
        // Create new template
        savedTemplate = await workflowService.createTemplate(templateForm);
        toast.success('Template created successfully');
      } else {
        // Update existing template
        savedTemplate = await workflowService.updateTemplate(selectedTemplate.id, templateForm);
        toast.success('Template updated successfully');
      }

      // Save steps if template is not new
      if (savedTemplate && savedTemplate.id !== 'new') {
        // For new steps, we need to add them
        for (const step of localSteps) {
          if (!step.id && step.role && step.action_type) {
            await workflowService.addStep(savedTemplate.id, {
              sequence: step.sequence,
              role: step.role,
              action_type: step.action_type,
              action_label: step.action_label || '',
              deadline_days: step.deadline_days || 3,
              can_revert: step.can_revert !== false,
              remarks_required: step.remarks_required || false
            });
          } else if (step.id) {
            await workflowService.updateStep(step.id, {
              role: step.role,
              action_type: step.action_type,
              action_label: step.action_label,
              deadline_days: step.deadline_days
            });
          }
        }

        // Reorder steps
        const stepIds = localSteps.filter(s => s.id).map(s => s.id);
        if (stepIds.length > 0) {
          await workflowService.reorderSteps(savedTemplate.id, stepIds);
        }
      }

      fetchTemplates();

      // Reload the template to get updated data
      if (savedTemplate?.id) {
        handleSelectTemplate(savedTemplate);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await workflowService.deleteTemplate(templateId);
      toast.success('Template deleted');
      setSelectedTemplate(null);
      setLocalSteps([]);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Step handlers
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localSteps.findIndex((s) => (s.id || `step-${localSteps.indexOf(s)}`) === active.id);
    const newIndex = localSteps.findIndex((s) => (s.id || `step-${localSteps.indexOf(s)}`) === over.id);

    const newSteps = arrayMove(localSteps, oldIndex, newIndex);
    const updatedSteps = newSteps.map((step, index) => ({ ...step, sequence: index + 1 }));
    setLocalSteps(updatedSteps);
  };

  const handleAddStep = () => {
    const newStep = {
      sequence: localSteps.length + 1,
      role: 'PMNC_Team',
      action_type: 'REVIEW',
      action_label: '',
      deadline_days: 3,
      can_revert: true,
      remarks_required: false
    };
    setLocalSteps([...localSteps, newStep]);
  };

  const handleDeleteStep = async (index) => {
    const step = localSteps[index];

    if (step.id) {
      try {
        await workflowService.deleteStep(step.id);
        toast.success('Step deleted');
      } catch (error) {
        console.error('Failed to delete step:', error);
        toast.error('Failed to delete step');
        return;
      }
    }

    const newSteps = localSteps.filter((_, i) => i !== index);
    const updatedSteps = newSteps.map((s, i) => ({ ...s, sequence: i + 1 }));
    setLocalSteps(updatedSteps);
  };

  const handleUpdateStep = (index, field, value) => {
    const newSteps = [...localSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setLocalSteps(newSteps);
  };

  // Trigger rule handlers
  const handleSaveRule = async () => {
    if (!ruleForm.name || !ruleForm.condition_field || !ruleForm.condition_value || !ruleForm.template) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingRule) {
        await workflowService.updateRule(editingRule.id, ruleForm);
        toast.success('Rule updated');
      } else {
        await workflowService.createRule(ruleForm);
        toast.success('Rule created');
      }

      setEditingRule(null);
      setRuleForm({
        name: '',
        module: 'RA_BILL',
        condition_field: '',
        condition_operator: 'GT',
        condition_value: '',
        template: '',
        priority: 100,
        is_active: true
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this trigger rule?')) return;

    try {
      await workflowService.deleteRule(ruleId);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-app-heading flex items-center gap-3">
            <Workflow className="text-primary-600" />
            Workflow Configuration
          </h1>
          <p className="text-app-muted mt-1">Design and manage approval workflows for your organization</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-app-subtle">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'templates'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-app-muted hover:text-app-text'
            }`}
        >
          <Settings size={18} className="inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'rules'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-app-muted hover:text-app-text'
            }`}
        >
          <Filter size={18} className="inline mr-2" />
          Trigger Rules
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Templates</CardTitle>
              <Button size="sm" onClick={handleCreateTemplate}>
                <Plus size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {templates.length === 0 ? (
                  <p className="text-center py-8 text-app-muted">No templates yet. Create one!</p>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTemplate?.id === template.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-app-subtle hover:border-primary-300 dark:hover:border-primary-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-app-heading">{template.name || 'Unnamed'}</p>
                        {template.is_active ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs text-app-muted mt-1">
                        {template.module_display || template.module} • {template.step_count || 0} steps
                        {template.is_default && <span className="ml-2 text-primary-600">Default</span>}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Editor */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTemplate ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Template Details</CardTitle>
                    {selectedTemplate.id !== 'new' && (
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Delete Template
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-app-text mb-2 block">Template Name *</label>
                        <input
                          type="text"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                          placeholder="e.g., High Value Bill Approval"
                          className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-app-text mb-2 block">Module *</label>
                        <select
                          value={templateForm.module}
                          onChange={(e) => setTemplateForm({ ...templateForm, module: e.target.value })}
                          className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                        >
                          {WORKFLOW_MODULES.map((mod) => (
                            <option key={mod.value} value={mod.value}>{mod.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-app-text mb-2 block">Description</label>
                      <textarea
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                        placeholder="Describe when this workflow should be used..."
                        rows={2}
                        className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                      />
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setTemplateForm({ ...templateForm, is_active: !templateForm.is_active })}
                          className="text-primary-600"
                        >
                          {templateForm.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-400" />}
                        </button>
                        <span className="text-sm text-app-text">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setTemplateForm({ ...templateForm, is_default: !templateForm.is_default })}
                          className="text-primary-600"
                        >
                          {templateForm.is_default ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-400" />}
                        </button>
                        <span className="text-sm text-app-text">Default for Module</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock size={20} className="text-primary-600" />
                      Approval Steps
                    </CardTitle>
                    <Button onClick={handleAddStep} size="sm">
                      <Plus size={16} />
                      Add Step
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {localSteps.length === 0 ? (
                      <div className="text-center py-12 text-app-muted border-2 border-dashed border-app-subtle rounded-xl">
                        <Workflow size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No steps defined yet.</p>
                        <p className="text-sm">Click "Add Step" to create your approval chain.</p>
                      </div>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={localSteps.map((s, i) => s.id || `step-${i}`)} strategy={verticalListSortingStrategy}>
                          <AnimatePresence mode="popLayout">
                            <div className="space-y-3">
                              {localSteps.map((step, index) => (
                                <SortableStep
                                  key={step.id || `step-${index}`}
                                  step={step}
                                  index={index}
                                  onDelete={handleDeleteStep}
                                  onUpdate={handleUpdateStep}
                                />
                              ))}
                            </div>
                          </AnimatePresence>
                        </SortableContext>
                      </DndContext>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={saving}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Template
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-app-muted">
                  <Workflow size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a template to edit</p>
                  <p className="text-sm mt-1">Or create a new one to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Trigger Rules Tab */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rule Form */}
          <Card>
            <CardHeader>
              <CardTitle>{editingRule ? 'Edit Trigger Rule' : 'Create Trigger Rule'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-app-text mb-2 block">Rule Name *</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="e.g., High Value Bill Rule"
                  className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-app-text mb-2 block">Module</label>
                <select
                  value={ruleForm.module}
                  onChange={(e) => setRuleForm({ ...ruleForm, module: e.target.value })}
                  className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                >
                  {WORKFLOW_MODULES.map((mod) => (
                    <option key={mod.value} value={mod.value}>{mod.label}</option>
                  ))}
                </select>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                <p className="text-sm font-medium text-app-text">Condition</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-app-muted block mb-1">Field</label>
                    <input
                      type="text"
                      value={ruleForm.condition_field}
                      onChange={(e) => setRuleForm({ ...ruleForm, condition_field: e.target.value })}
                      placeholder="amount"
                      className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-muted block mb-1">Operator</label>
                    <select
                      value={ruleForm.condition_operator}
                      onChange={(e) => setRuleForm({ ...ruleForm, condition_operator: e.target.value })}
                      className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
                    >
                      <option value="GT">Greater Than</option>
                      <option value="GTE">Greater or Equal</option>
                      <option value="LT">Less Than</option>
                      <option value="LTE">Less or Equal</option>
                      <option value="EQ">Equals</option>
                      <option value="NEQ">Not Equals</option>
                      <option value="IN">In List</option>
                      <option value="CONTAINS">Contains</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-app-muted block mb-1">Value</label>
                    <input
                      type="text"
                      value={ruleForm.condition_value}
                      onChange={(e) => setRuleForm({ ...ruleForm, condition_value: e.target.value })}
                      placeholder="5000000"
                      className="w-full px-3 py-2 bg-app-input text-app-text border border-app rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-app-text mb-2 block">Use Template *</label>
                <select
                  value={ruleForm.template}
                  onChange={(e) => setRuleForm({ ...ruleForm, template: e.target.value })}
                  className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                >
                  <option value="">Select Template</option>
                  {templates
                    .filter(t => t.module === ruleForm.module)
                    .map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-app-text mb-2 block">Priority (Lower = First)</label>
                  <input
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-app-input text-app-text border border-app rounded-lg"
                    min={1}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setRuleForm({ ...ruleForm, is_active: !ruleForm.is_active })}
                      className="text-primary-600"
                    >
                      {ruleForm.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-400" />}
                    </button>
                    <span className="text-sm text-app-text">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {editingRule && (
                  <Button variant="outline" onClick={() => {
                    setEditingRule(null);
                    setRuleForm({
                      name: '',
                      module: 'RA_BILL',
                      condition_field: '',
                      condition_operator: 'GT',
                      condition_value: '',
                      template: '',
                      priority: 100,
                      is_active: true
                    });
                  }}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSaveRule} disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Rules List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-12 text-app-muted">
                  <Filter size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No trigger rules defined yet.</p>
                  <p className="text-sm mt-1">Rules determine which template is used based on conditions.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {rules.map((rule) => (
                    <TriggerRuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={(r) => {
                        setEditingRule(r);
                        setRuleForm({
                          name: r.name,
                          module: r.module,
                          condition_field: r.condition_field,
                          condition_operator: r.condition_operator,
                          condition_value: r.condition_value,
                          template: r.template,
                          priority: r.priority,
                          is_active: r.is_active
                        });
                      }}
                      onDelete={handleDeleteRule}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkflowConfig;
