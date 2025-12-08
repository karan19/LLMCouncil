
import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface AgentProfile {
    id: string;
    name: string;
    model: string;
    systemPrompt: string;
    color: string;
}

const AGENT_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-indigo-500',
];

const DEFAULT_AGENTS: AgentProfile[] = [
    {
        id: '1',
        name: 'LogicBot',
        model: 'openai/gpt-4o',
        systemPrompt: 'You are a purely logical being. Analyze arguments based on facts and invalid inferences.',
        color: 'bg-blue-500'
    },
    {
        id: '2',
        name: 'CreativeAI',
        model: 'anthropic/claude-3-opus',
        systemPrompt: 'You are a creative thinker. Look for novel connections and metaphorical interpretations.',
        color: 'bg-purple-500'
    },
    {
        id: '3',
        name: 'Skeptic',
        model: 'google/gemini-2.0-flash-exp',
        systemPrompt: 'You are a healthy skeptic. Question assumptions and demand evidence.',
        color: 'bg-orange-500'
    }
];

interface AgentConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAgentsChange: (agents: AgentProfile[]) => void;
}

// Get initials from agent name
function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function AgentConfigDialog({ open, onOpenChange, onAgentsChange }: AgentConfigDialogProps) {
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState('');

    // Load agents from local storage / defaults
    useEffect(() => {
        const saved = localStorage.getItem('llm_council_custom_agents');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAgents(parsed);
            } catch (e) {
                console.error("Failed to parse agents", e);
                setAgents(DEFAULT_AGENTS);
            }
        } else {
            setAgents(DEFAULT_AGENTS);
        }
    }, []);

    // Load available models
    useEffect(() => {
        if (open) {
            setIsLoadingModels(true);
            api.listModels()
                .then(data => {
                    setAvailableModels(data.available_models || []);
                })
                .catch(err => {
                    console.error("Failed to load models", err);
                    toast.error("Could not load model list");
                })
                .finally(() => setIsLoadingModels(false));
        }
    }, [open]);

    // Update parent when agents change
    useEffect(() => {
        if (agents.length > 0) {
            onAgentsChange(agents);
        }
    }, [agents, onAgentsChange]);

    // Handle selection change (Enter Edit Mode)
    useEffect(() => {
        if (selectedAgentId) {
            const agent = agents.find(a => a.id === selectedAgentId);
            if (agent) {
                setName(agent.name);
                setPrompt(agent.systemPrompt);
                setModel(agent.model);
            }
        }
    }, [selectedAgentId, agents]);

    const handleSaveAgent = () => {
        if (!selectedAgentId) return;

        const updatedAgents = agents.map(agent =>
            agent.id === selectedAgentId
                ? { ...agent, name, systemPrompt: prompt, model }
                : agent
        );

        saveAgents(updatedAgents);
        toast.success("Agent saved");
        setSelectedAgentId(null);
    };

    const handleCreateNew = () => {
        const usedColors = agents.map(a => a.color);
        const availableColor = AGENT_COLORS.find(c => !usedColors.includes(c)) || AGENT_COLORS[0];

        const newAgent: AgentProfile = {
            id: Date.now().toString(),
            name: 'New Agent',
            model: 'google/gemini-2.0-flash-exp',
            systemPrompt: 'You are a helpful assistant.',
            color: availableColor
        };
        const updated = [...agents, newAgent];
        saveAgents(updated);
        setSelectedAgentId(newAgent.id);
    };

    const handleDelete = (id: string | null) => {
        if (!id) return;
        const updated = agents.filter(a => a.id !== id);
        saveAgents(updated);
        setSelectedAgentId(null);
        toast.success("Agent deleted");
    };

    const saveAgents = (newAgents: AgentProfile[]) => {
        setAgents(newAgents);
        localStorage.setItem('llm_council_custom_agents', JSON.stringify(newAgents));
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-0 shadow-2xl bg-white">
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        {selectedAgentId && (
                            <button
                                onClick={() => setSelectedAgentId(null)}
                                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                        )}
                        <div>
                            <DialogTitle className="text-xl font-semibold text-slate-900">
                                {selectedAgentId ? 'Edit Agent' : 'Debate Council'}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 mt-0.5">
                                {selectedAgentId
                                    ? 'Configure the agent\'s personality and behavior'
                                    : `${agents.length} agents configured`}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {!selectedAgentId ? (
                        // LIST VIEW
                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Existing Agents */}
                                {agents.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => setSelectedAgentId(agent.id)}
                                        className="group text-left p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200"
                                    >
                                        <h3 className="font-medium text-slate-900 truncate">
                                            {agent.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                                            {agent.model.split('/').pop()}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed">
                                            {agent.systemPrompt}
                                        </p>
                                    </button>
                                ))}

                                {/* Add New Agent */}
                                <button
                                    onClick={handleCreateNew}
                                    className="group p-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                                >
                                    <h3 className="font-medium text-slate-600 flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Agent
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">Create a new persona</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // EDIT VIEW
                        <div className="p-8 space-y-6">


                            {/* Name Field */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Socrates"
                                    className="h-11 border-slate-200 focus:border-slate-400 focus:ring-0"
                                />
                            </div>

                            {/* Model Field */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">Model</Label>
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger className="h-11 border-slate-200 focus:border-slate-400 focus:ring-0">
                                        <SelectValue placeholder="Select a model..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {isLoadingModels ? (
                                            <div className="flex items-center justify-center p-4 text-slate-400 gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">Loading...</span>
                                            </div>
                                        ) : availableModels.length > 0 ? (
                                            availableModels.map((m) => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-slate-400">No models found</div>
                                        )}
                                        {model && !availableModels.includes(model) && (
                                            <SelectItem value={model}>{model} (Current)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* System Prompt Field */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">System Prompt</Label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="min-h-[200px] border-slate-200 focus:border-slate-400 focus:ring-0 text-sm leading-relaxed resize-none"
                                    placeholder="Define the agent's personality and behavior..."
                                />
                                <p className="text-xs text-slate-400">
                                    This prompt defines how the agent thinks and responds.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedAgentId && (
                    <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(selectedAgentId)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedAgentId(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveAgent}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
