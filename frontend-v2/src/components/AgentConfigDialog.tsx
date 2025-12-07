'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, User } from 'lucide-react';
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
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export interface AgentProfile {
    id: string;
    name: string;
    model: string; // Keep simple string for now, could be dropdown later
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
        model: 'google/gemini-pro',
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
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState('');

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('llm_council_custom_agents');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAgents(parsed);
                if (parsed.length > 0) setSelectedAgentId(parsed[0].id);
            } catch (e) {
                console.error("Failed to parse agents", e);
                setAgents(DEFAULT_AGENTS);
            }
        } else {
            setAgents(DEFAULT_AGENTS);
            setSelectedAgentId(DEFAULT_AGENTS[0].id);
        }
    }, []);

    // Update parent when agents change
    useEffect(() => {
        if (agents.length > 0) {
            onAgentsChange(agents);
        }
    }, [agents, onAgentsChange]);

    // Handle selection change
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
    };

    const handleCreateNew = () => {
        const newAgent: AgentProfile = {
            id: Date.now().toString(),
            name: 'New Agent',
            model: 'openai/gpt-3.5-turbo',
            systemPrompt: 'You are a helpful assistant.',
            color: 'bg-slate-500'
        };
        const updated = [...agents, newAgent];
        saveAgents(updated);
        setSelectedAgentId(newAgent.id);
    };

    const handleDelete = (id: string) => {
        const updated = agents.filter(a => a.id !== id);
        saveAgents(updated);
        if (selectedAgentId === id) {
            setSelectedAgentId(updated.length > 0 ? updated[0].id : null);
        }
        toast.success("Agent deleted");
    };

    const saveAgents = (newAgents: AgentProfile[]) => {
        setAgents(newAgents);
        localStorage.setItem('llm_council_custom_agents', JSON.stringify(newAgents));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] h-full flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Configure Debate Agents</DialogTitle>
                    <DialogDescription>
                        Create and customize the AI personas that will participate in the debate.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar List */}
                    <div className="w-64 border-r bg-slate-50 flex flex-col">
                        <div className="p-4 border-b">
                            <Button className="w-full" variant="outline" onClick={handleCreateNew}>
                                <Plus className="w-4 h-4 mr-2" /> New Agent
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {agents.map(agent => (
                                    <div
                                        key={agent.id}
                                        onClick={() => setSelectedAgentId(agent.id)}
                                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${selectedAgentId === agent.id
                                                ? 'bg-white shadow-sm border border-slate-200'
                                                : 'hover:bg-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${agent.color}`} />
                                            <span className="text-sm font-medium truncate">{agent.name}</span>
                                        </div>
                                        {agents.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(agent.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Edit Area */}
                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                        {selectedAgentId ? (
                            <div className="space-y-6 max-w-2xl mx-auto">
                                <div className="space-y-2">
                                    <Label>Agent Name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Socrates"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Model</Label>
                                    <Input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="e.g. openai/gpt-4"
                                    />
                                    <p className="text-xs text-slate-500">Enter the OpenRouter model ID (e.g. 'anthropic/claude-3-opus')</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex justify-between">
                                        System Prompt
                                        <span className="text-xs text-slate-400 font-normal">Define the persona and behavior</span>
                                    </Label>
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="min-h-[200px] font-mono text-sm leading-relaxed"
                                        placeholder="You are logic bot..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSaveAgent} className="w-32">
                                        <Save className="w-4 h-4 mr-2" /> Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <User className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select an agent to edit</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t p-4">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
