
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, User, Loader2, ArrowLeft, Bot, Sparkles, Brain } from 'lucide-react';
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
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface AgentProfile {
    id: string;
    name: string;
    model: string;
    systemPrompt: string;
    color: string;
}

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
        name: 'Skeptic Tron',
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

export default function AgentConfigDialog({ open, onOpenChange, onAgentsChange }: AgentConfigDialogProps) {
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null); // If null, show list. If set, show edit.
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
        setSelectedAgentId(null); // Go back to list
    };

    const handleCreateNew = () => {
        const newAgent: AgentProfile = {
            id: Date.now().toString(),
            name: 'New Agent',
            model: 'google/gemini-2.0-flash-exp',
            systemPrompt: 'You are a helpful assistant.',
            color: 'bg-slate-500'
        };
        const updated = [...agents, newAgent];
        saveAgents(updated);
        setSelectedAgentId(newAgent.id); // Go directly to edit
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50/50">
                <DialogHeader className="px-10 py-8 border-b bg-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-3xl font-light tracking-tight text-slate-900">
                                {selectedAgentId ? `Edit ${name}` : 'Debate Council'}
                            </DialogTitle>
                            <DialogDescription className="text-lg text-slate-400 mt-2 font-light">
                                {selectedAgentId
                                    ? 'Start typing to customize the agent behavior.'
                                    : 'Select an AI persona to configure or add a new one.'}
                            </DialogDescription>
                        </div>
                        {selectedAgentId && (
                            <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={() => setSelectedAgentId(null)}>
                                <ArrowLeft className="w-5 h-5 mr-2" /> Back
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-10">
                    {!selectedAgentId ? (
                        // LIST VIEW (Grid)
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
                            {/* New Agent Card */}
                            <Card
                                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-transparent hover:bg-white hover:border-slate-300 transition-all duration-300 cursor-pointer h-[320px] group shadow-none"
                                onClick={handleCreateNew}
                            >
                                <div className="h-16 w-16 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all">
                                    <Plus className="w-6 h-6 text-slate-300 group-hover:text-slate-600" />
                                </div>
                                <h3 className="font-medium text-xl text-slate-400 group-hover:text-slate-900 transition-colors">New Agent</h3>
                            </Card>

                            {/* Existing Agents */}
                            {agents.map((agent) => (
                                <Card
                                    key={agent.id}
                                    className="flex flex-col h-[320px] bg-white border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group relative"
                                    onClick={() => setSelectedAgentId(agent.id)}
                                >
                                    <div className="p-8 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`h-12 w-12 rounded-2xl ${agent.color} bg-opacity-10 flex items-center justify-center`}>
                                                <Bot className={`w-6 h-6 ${agent.color.replace('bg-', 'text-')}`} />
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-slate-100 p-2 rounded-full">
                                                    <Sparkles className="w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h3 className="text-2xl font-semibold text-slate-900 mb-1">{agent.name}</h3>
                                            <p className="font-mono text-xs text-slate-400 truncate">{agent.model}</p>
                                        </div>

                                        <p className="text-slate-500 leading-relaxed text-sm line-clamp-4 flex-1">
                                            {agent.systemPrompt}
                                        </p>
                                    </div>
                                    <div className={`h-1 w-full ${agent.color} opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0`} />
                                </Card>
                            ))}
                        </div>
                    ) : (
                        // EDIT VIEW (Form) - Simplified, no container box
                        <div className="max-w-4xl mx-auto py-4">
                            <div className="space-y-10">
                                {/* Top Row: Name and Model */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium text-slate-900">Agent Name</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Socrates"
                                            className="h-12 text-lg px-0 border-0 border-b border-slate-200 rounded-none focus-visible:ring-0 focus-visible:border-slate-900 bg-transparent placeholder:text-slate-300 transition-colors"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-base font-medium text-slate-900">Model</Label>
                                        <Select value={model} onValueChange={setModel}>
                                            <SelectTrigger className="h-12 w-full border-0 border-b border-slate-200 rounded-none focus:ring-0 px-0 focus:border-slate-900 bg-transparent">
                                                <SelectValue placeholder="Select a model..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {isLoadingModels ? (
                                                    <div className="flex items-center justify-center p-4 text-slate-400 gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
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
                                        <p className="text-xs text-slate-400 mt-2">
                                            The LLM engine driving this agent.
                                        </p>
                                    </div>
                                </div>

                                {/* System Prompt */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                                        <Label className="text-base font-medium text-slate-900 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-slate-400" />
                                            System Prompt / Persona
                                        </Label>
                                        <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                                            Behavior Instructions
                                        </span>
                                    </div>
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="min-h-[400px] font-mono text-sm leading-8 bg-slate-50/30 border-0 focus-visible:ring-0 focus:bg-white resize-none p-6 text-slate-700"
                                        placeholder="You are logic bot..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-10 flex justify-between items-center bg-white">
                                    <Button
                                        variant="ghost"
                                        className="text-slate-400 hover:text-red-600 hover:bg-transparent px-0 font-normal"
                                        onClick={() => handleDelete(selectedAgentId)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Agent
                                    </Button>

                                    <div className="flex gap-4">
                                        <Button variant="ghost" className="font-normal text-slate-500 hover:text-slate-900" onClick={() => setSelectedAgentId(null)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveAgent}
                                            className="min-w-[140px] rounded-full bg-slate-900 hover:bg-slate-800 text-white"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
