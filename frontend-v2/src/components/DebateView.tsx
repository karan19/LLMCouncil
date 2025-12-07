'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ArrowLeft,
    Settings,
    Mic,
    Bot,
    Play,
    RotateCcw,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getModelColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

interface DebateTurn {
    model: string;
    role: string;
    response: string;
    timestamp: string;
}

interface SpeakerConfig {
    model: string;
    systemPrompt: string;
}

interface DebateViewProps {
    availableModels: string[];
    panelModels: string[];
    onPanelModelChange: (index: number, model: string) => void;
    // We'll manage turns locally for now or lift state up later if needed
    // debateTurns: DebateTurn[]; 
    // debateTopic: string;
    // onDebateTopicChange: (topic: string) => void;
    // onStartDebate: () => void;
    // debateLoading: boolean;
    onReturn: () => void;
    // New props for the manual flow (we'll adapt the parent later)
    debateTurns: any[];
    debateTopic: string;
    onDebateTopicChange: (t: string) => void;

}


// Import the new 3D scene
import DebateScene3D from './DebateScene3D';

// ... (existing helper components like SpeakerSeat can be removed or kept if I reuse logic, 
// but since I moved 3D logic to DebateScene3D, I will remove the unused SpeakerSeat component and only keep relevant UI overlays)

export default function DebateView({
    // ... props ...
    availableModels,
    panelModels,
    onPanelModelChange,
    debateTurns: propTurns,
    debateTopic,
    onDebateTopicChange,
    onReturn,
}: DebateViewProps) {
    // Local state for the new interactive flow
    const [turns, setTurns] = useState<DebateTurn[]>([]);
    const [isStarted, setIsStarted] = useState(false);
    const [activeSpeakerIndex, setActiveSpeakerIndex] = useState<number | null>(null);

    // Per-speaker configuration (system prompts)
    const [speakerConfigs, setSpeakerConfigs] = useState<SpeakerConfig[]>([
        { model: panelModels[0] || '', systemPrompt: 'You are a pragmatic realist. Analyze the topic with a focus on practical implications and feasibility.' },
        { model: panelModels[1] || '', systemPrompt: 'You are a visionary idealist. Explore the topic\'s potential for positive future impact and moral good.' },
        { model: panelModels[2] || '', systemPrompt: 'You are a critical skeptic. Question assumptions, highlight risks, and play devil\'s advocate.' },
    ]);

    // Sync panel models from props to local config if they change logic (omitted for brevity, assume simple sync)

    const handleUpdateSystemPrompt = (index: number, prompt: string) => {
        const newConfigs = [...speakerConfigs];
        newConfigs[index] = { ...newConfigs[index], systemPrompt: prompt };
        setSpeakerConfigs(newConfigs);
    };

    const handleSpeakerSelect = (index: number, model: string) => {
        onPanelModelChange(index, model);
        const newConfigs = [...speakerConfigs];
        newConfigs[index] = { ...newConfigs[index], model };
        setSpeakerConfigs(newConfigs);
    };

    const handleStartDebate = () => {
        if (!debateTopic.trim()) return;
        setIsStarted(true);
    };

    const handleTriggerSpeaker = async (index: number) => {
        if (!panelModels[index]) return;
        setActiveSpeakerIndex(index);

        try {
            const response = await api.runDebateTurn(
                debateTopic,
                turns.map(t => ({
                    role: t.role,
                    model: t.model,
                    response: t.response
                })),
                panelModels[index],
                speakerConfigs[index]?.systemPrompt
            );

            const newTurn: DebateTurn = {
                model: panelModels[index],
                role: `Panelist ${index + 1}`,
                response: response.response,
                timestamp: new Date().toLocaleTimeString(),
            };

            setTurns(prev => [...prev, newTurn]);
        } catch (error) {
            console.error('Failed to run debate turn:', error);
            // Optional: Add toast error here
        } finally {
            setActiveSpeakerIndex(null);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* Dramatic Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur border-b border-slate-800 z-10">
                <Button variant="ghost" onClick={onReturn} className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Exit Chamber
                </Button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-bold tracking-wider text-amber-100">THE COUNCIL CHAMBER</span>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    {isStarted && <span className="text-xs text-slate-500 max-w-[300px] truncate text-center">{debateTopic}</span>}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setIsStarted(false); setTurns([]); }} className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                </Button>
            </div>

            <div className="flex-1 relative flex">
                {/* Main Stage (Table Area) */}
                <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

                    {/* The Round Table */}
                    <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                        {/* Table Surface */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute inset-0 rounded-full border-4 border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl flex items-center justify-center"
                        >
                            <div className="absolute inset-4 rounded-full border border-slate-800/50" />

                            {/* Center Content: Topic or Start Prompt */}
                            <div className="w-3/4 text-center z-10">
                                {!isStarted ? (
                                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                                        <h2 className="text-2xl font-light text-slate-300">Proposed Topic</h2>
                                        <Textarea
                                            className="bg-slate-950/50 border-slate-800 text-slate-200 resize-none text-center text-lg min-h-[120px] focus:ring-amber-500/20"
                                            placeholder="Enter the subject for deliberation..."
                                            value={debateTopic}
                                            onChange={(e) => onDebateTopicChange(e.target.value)}
                                        />
                                        <Button
                                            onClick={handleStartDebate}
                                            disabled={!debateTopic.trim()}
                                            className="bg-amber-600 hover:bg-amber-700 text-white w-full py-6 text-lg tracking-widest uppercase shadow-lg shadow-amber-900/20"
                                        >
                                            Commence Session
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Current Topic</h2>
                                        <div className="text-xl md:text-2xl font-serif text-slate-200 leading-relaxed">
                                            "{debateTopic}"
                                        </div>
                                        <div className="flex justify-center pt-8">
                                            <Badge variant="outline" className="border-amber-500/30 text-amber-500 animate-pulse bg-amber-500/5 px-4 py-1">
                                                SESSION ACTIVE
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-500 pt-4">Select a council member to hear their perspective.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Chairs / Speakers */}
                        {/* Position 1: Top Center */}
                        <SpeakerSeat
                            index={0}
                            position="top"
                            model={panelModels[0]}
                            systemPrompt={speakerConfigs[0]?.systemPrompt}
                            availableModels={availableModels}
                            isActive={activeSpeakerIndex === 0}
                            isSessionActive={isStarted}
                            onSelectModel={(m) => handleSpeakerSelect(0, m)}
                            onUpdatePrompt={(p) => handleUpdateSystemPrompt(0, p)}
                            onTrigger={() => handleTriggerSpeaker(0)}
                            className="absolute -top-16 left-1/2 -translate-x-1/2"
                        />

                        {/* Position 2: Bottom Right */}
                        <SpeakerSeat
                            index={1}
                            position="bottom-right"
                            model={panelModels[1]}
                            systemPrompt={speakerConfigs[1]?.systemPrompt}
                            availableModels={availableModels}
                            isActive={activeSpeakerIndex === 1}
                            isSessionActive={isStarted}
                            onSelectModel={(m) => handleSpeakerSelect(1, m)}
                            onUpdatePrompt={(p) => handleUpdateSystemPrompt(1, p)}
                            onTrigger={() => handleTriggerSpeaker(1)}
                            className="absolute -bottom-4 -right-12"
                        />

                        {/* Position 3: Bottom Left */}
                        <SpeakerSeat
                            index={2}
                            position="bottom-left"
                            model={panelModels[2]}
                            systemPrompt={speakerConfigs[2]?.systemPrompt}
                            availableModels={availableModels}
                            isActive={activeSpeakerIndex === 2}
                            isSessionActive={isStarted}
                            onSelectModel={(m) => handleSpeakerSelect(2, m)}
                            onUpdatePrompt={(p) => handleUpdateSystemPrompt(2, p)}
                            onTrigger={() => handleTriggerSpeaker(2)}
                            className="absolute -bottom-4 -left-12"
                        />
                    </div>

                </div>

                {/* Right Sidebar: Transcript */}
                <div className="w-[400px] border-l border-slate-800 bg-slate-900 flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur">
                        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Transcript
                        </h3>
                        <span className="text-xs text-slate-500">{turns.length} entries</span>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
                            {turns.length === 0 ? (
                                <div className="text-center py-20 text-slate-600">
                                    <p>No testimony recorded yet.</p>
                                    <p className="text-sm mt-2">Trigger a speaker to begin.</p>
                                </div>
                            ) : (
                                turns.map((turn, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                                                {turn.timestamp}
                                            </Badge>
                                            <span className={cn("text-xs font-bold uppercase", getTextColor(turn.role))}>
                                                {turn.model.split('/').pop()}
                                            </span>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300 border border-slate-700/50">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">
                                                {turn.response}
                                            </ReactMarkdown>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            {/* Ghost element for scrolling to bottom */}
                            <div className="h-4" />
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

// Helper Components

function SpeakerSeat({
    index,
    position,
    model,
    systemPrompt,
    availableModels,
    isActive,
    isSessionActive,
    onSelectModel,
    onUpdatePrompt,
    onTrigger,
    className
}: any) {

    return (
        <div className={cn("flex flex-col items-center gap-3 w-64 transition-all duration-500", isActive ? "scale-110 z-50" : "scale-100 z-10", className)}>
            {/* The 'Seat' Visual */}
            <div className="relative group">
                {/* Glow Effect when Active */}
                {isActive && (
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                )}

                {/* Avatar Circle */}
                <div className={cn(
                    "w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-950 transition-colors duration-300",
                    isActive ? "border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]" : "border-slate-800 group-hover:border-slate-600"
                )}>
                    {model ? (
                        <Avatar className="w-20 h-20">
                            <AvatarFallback className={cn("text-2xl font-bold text-white bg-gradient-to-br", getModelColor(index))}>
                                P{index + 1}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <Users className="w-8 h-8 text-slate-600" />
                    )}

                    {/* Status Indicator */}
                    {model && (
                        <div className={cn(
                            "absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center",
                            isActive ? "bg-amber-500" : "bg-slate-700"
                        )}>
                            {isActive && <Mic className="w-3 h-3 text-black animate-pulse" />}
                        </div>
                    )}
                </div>

                {/* Controls (Only visible when session started or hovered) */}
                {isSessionActive && model && !isActive && (
                    <Button
                        size="sm"
                        onClick={onTrigger}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-100 hover:bg-white text-slate-900 shadow-lg px-6 py-1 h-8 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Speak
                    </Button>
                )}
            </div>

            {/* Info Card */}
            <div className="flex flex-col items-center gap-1 w-full">
                {isSessionActive ? (
                    <div className="text-center">
                        <div className="font-bold text-slate-200 text-sm truncate max-w-[200px]">
                            {model ? model.split('/').pop() : 'Empty Seat'}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Panelist {index + 1}
                        </div>
                    </div>
                ) : (
                    // Configuration Mode
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg w-full space-y-2 backdrop-blur-sm">
                        <Select value={model || '__none__'} onValueChange={(v) => onSelectModel(v === '__none__' ? '' : v)}>
                            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800">
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="dark bg-slate-900 border-slate-800">
                                <SelectItem value="__none__">None</SelectItem>
                                {availableModels.map((m: string) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-slate-700 hover:bg-slate-800 text-slate-400">
                                    <Settings className="w-3 h-3 mr-1" />
                                    Configure Persona
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-950 border-slate-800 text-slate-200">
                                <DialogHeader>
                                    <DialogTitle>Configure Panelist {index + 1}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">System Prompt / Persona</label>
                                        <Textarea
                                            className="bg-slate-900 border-slate-800 min-h-[150px]"
                                            placeholder="Example: You are a skeptic who questions everything..."
                                            value={systemPrompt}
                                            onChange={(e) => onUpdatePrompt(e.target.value)}
                                        />
                                        <p className="text-xs text-slate-500">
                                            Define how this model should behave during the debate.
                                        </p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>
        </div>
    );
}

function getTextColor(role: string) {
    if (role.includes('1')) return 'text-blue-400';
    if (role.includes('2')) return 'text-purple-400';
    return 'text-emerald-400';
}
