'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowRight, Play, Pause, RotateCcw, Settings2, RefreshCw, Save, History, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AgentConfigDialog, { AgentProfile } from './AgentConfigDialog';
import SavedDebatesDialog from './SavedDebatesDialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Types
interface Turn {
    id: string;
    agentName: string;
    content: string;
    timestamp: number;
    systemPrompt?: string;
    isLoading?: boolean;
    agentId?: string;
    model?: string;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

function HackerText() {
    const [text, setText] = useState('');

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const generate = () => {
            let str = '';
            const len = Math.floor(Math.random() * 30) + 20; // Random length between 20-50
            for (let i = 0; i < len; i++) {
                str += CHARS[Math.floor(Math.random() * CHARS.length)];
            }
            // Add some "code-like" structure occasionally
            if (Math.random() > 0.7) str = `function ${str}() { return; }`;
            else if (Math.random() > 0.7) str = `<${str} />`;

            setText(str);
        };

        generate(); // Initial
        interval = setInterval(generate, 80); // Fast update
        return () => clearInterval(interval);
    }, []);

    return <span className="font-mono text-green-500 break-all">{text}</span>;
}

export default function DebateView() {
    // State
    const [topic, setTopic] = useState('');
    const [isDebating, setIsDebating] = useState(false);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    // Agent Config State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [availableAgents, setAvailableAgents] = useState<AgentProfile[]>([]);

    // Selected Seats (3 slots for now)
    const [participants, setParticipants] = useState<string[]>(['', '', '']); // Array of Agent IDs

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial load handling
    useEffect(() => {
        // We rely on the callback from AgentConfigDialog to populate availableAgents
        // But we need to set initial participants once agents are loaded
        if (availableAgents.length > 0) {
            setParticipants(current => {
                if (current[0] === '') {
                    return [
                        availableAgents[0]?.id || '',
                        availableAgents[1]?.id || availableAgents[0]?.id || '',
                        availableAgents[2]?.id || availableAgents[0]?.id || ''
                    ];
                }
                return current;
            });
        }
    }, [availableAgents]);

    // Auto-scroll to end when turns change
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [turns]);

    const handleStartDebate = async () => {
        if (!topic.trim()) return;
        setIsDebating(true);
        // Initial "thinking" pause then format the first turn
        await generateTurn(0);
    };

    const generateTurn = async (seatIndex: number) => {
        setIsGenerating(true);

        // optimistically add a "loading" turn
        const tempId = Date.now().toString();
        const agentId = participants[seatIndex];
        const agent = availableAgents.find(a => a.id === agentId);
        const agentName = agent?.name || 'Unknown Agent';
        const agentModel = agent?.model || 'google/gemini-2.0-flash-exp';
        const systemPrompt = agent?.systemPrompt || '';

        const tempTurn: Turn = {
            id: tempId,
            agentName: agentName,
            content: '',
            timestamp: Date.now(),
            systemPrompt: systemPrompt,
            isLoading: true,
            agentId: agentId,
            model: agentModel
        };

        setTurns(prev => [...prev, tempTurn]);

        try {
            // Construct history for the backend
            // Backend expects: { role, response }
            const history = turns.map(t => ({
                role: t.agentName,
                response: t.content
            }));

            const response = await api.runDebateTurn({
                topic: topic,
                targetModel: agentModel,
                history: history,
                systemPrompt: systemPrompt
            });

            if (response.response === "Failed to generate response.") {
                throw new Error("Backend failed to generate response");
            }

            // Replace temp turn with real one
            setTurns(prev => prev.map(t => {
                if (t.id === tempId) {
                    return {
                        ...t,
                        content: response.response,
                        isLoading: false,
                        timestamp: Date.now(), // Update timestamp to actual completion
                        agentId: agentId,
                        model: agentModel
                    };
                }
                return t;
            }));

            setCurrentAgentIndex((prev) => (prev + 1) % participants.length);
        } catch (error) {
            console.error("Debate turn failed:", error);
            toast.error("Failed to generate response. Check API configuration.");
            // Remove temp turn on error
            setTurns(prev => prev.filter(t => t.id !== tempId));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNextTurn = () => {
        generateTurn(currentAgentIndex);
    };

    const handleRegenerate = async (turnIndex: number) => {
        if (isGenerating) return;

        setIsGenerating(true);

        // Get the turn to regenerate before modifying the turns array
        const turnToRegen = turns[turnIndex];

        // Truncate the turns list to just this one (and previous ones)
        // Effectively removing all "future" turns
        setTurns(prev => {
            const newTurns = prev.slice(0, turnIndex + 1);
            // Set the target turn to loading
            newTurns[turnIndex] = { ...newTurns[turnIndex], isLoading: true, content: '' };
            return newTurns;
        });

        // Reset the current agent index to be the one AFTER this turn
        setCurrentAgentIndex((turnIndex + 1) % participants.length);

        try {
            // History should be everything BEFORE this turn
            // Note: We use 'turns' from closure, but we know we just truncated state. 
            // The API call needs the stable previous history.
            const history = turns.slice(0, turnIndex).map(t => ({
                role: t.agentName,
                response: t.content
            }));

            const agentModel = turnToRegen.model || 'google/gemini-2.0-flash-exp';
            const systemPrompt = turnToRegen.systemPrompt || '';

            const response = await api.runDebateTurn({
                topic: topic,
                targetModel: agentModel,
                history: history,
                systemPrompt: systemPrompt
            });

            if (response.response === "Failed to generate response.") {
                throw new Error("Backend failed to generate response");
            }

            // Update with new content
            setTurns(prev => prev.map((t, i) => {
                if (i === turnIndex) {
                    return {
                        ...t,
                        content: response.response,
                        isLoading: false,
                        timestamp: Date.now()
                    };
                }
                return t;
            }));

        } catch (error) {
            console.error("Regeneration failed:", error);
            toast.error("Failed to regenerate response.");
            setTurns(prev => prev.map((t, i) =>
                i === turnIndex ? { ...t, isLoading: false } : t
            ));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setIsDebating(false);
        setTopic('');
        setTurns([]);
        setCurrentAgentIndex(0);
    };

    const handleSaveDebate = async () => {
        if (!turns.length) return;

        const toastId = toast.loading("Saving debate...");
        try {
            await api.saveDebate({
                topic: topic,
                turns: turns
            });
            toast.success("Debate saved successfully", { id: toastId });
        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Failed to save debate", { id: toastId });
        }
    };

    const handleLoadDebate = (debate: any) => {
        try {
            setTopic(debate.title || '');
            // debate.messages is the array of turns
            const loadedTurns = debate.messages || [];
            setTurns(loadedTurns);

            // Try to infer participants from the loaded turns
            // This ensures we can continue the debate with the original agents
            const usedAgentIds = Array.from(new Set(loadedTurns.map((t: any) => t.agentId).filter(Boolean))) as string[];
            if (usedAgentIds.length > 0) {
                // Pad with empty strings if < 3
                const newParticipants = [...usedAgentIds];
                while (newParticipants.length < 3) newParticipants.push('');
                setParticipants(newParticipants.slice(0, 3));
            }

            // Set index to next after last turn
            setCurrentAgentIndex(loadedTurns.length % 3); // simple modulo fallback

            // If turns exist, we are debating
            setIsDebating(true);

        } catch (error) {
            console.error("Error parsing loaded debate", error);
            toast.error("Error loading debate state");
        }
    };

    return (
        <div className="h-full w-full relative overflow-hidden bg-slate-50 flex flex-col">

            {/* Background Grid */}
            <div className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Header / Controls */}
            <div className="relative z-10 w-full p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {isDebating && (
                        <div className="text-sm text-slate-500 px-3 py-1 bg-slate-100 rounded-full">
                            Topic: <span className="font-medium text-slate-900">{topic}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
                        <History className="w-4 h-4 mr-2" />
                        History
                    </Button>
                    {isDebating && (
                        <Button variant="outline" size="sm" onClick={handleSaveDebate}>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)}>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configure Agents
                    </Button>
                    {isDebating && (
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            <AgentConfigDialog
                open={isConfigOpen}
                onOpenChange={setIsConfigOpen}
                onAgentsChange={setAvailableAgents}
            />

            <SavedDebatesDialog
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                onSelectDebate={handleLoadDebate}
            />

            {/* Main Content Area */}
            <div className="flex-1 relative z-10 flex items-center justify-center p-8 w-full">

                <AnimatePresence mode="wait">
                    {!isDebating ? (
                        // Initial Input State
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-xl"
                        >
                            <Card className="shadow-xl border-slate-200">
                                <CardHeader>
                                    <CardTitle>Start a Debate</CardTitle>
                                    <CardDescription>Enter a topic to kick off the discussion between agents.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2 mb-6">
                                        <Input
                                            placeholder="e.g. Is AI consciousness possible?"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleStartDebate()}
                                            className="text-lg"
                                        />
                                        <Button onClick={handleStartDebate} disabled={!topic.trim()}>
                                            Start <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Participant Selectors */}
                                    <div className="border-t pt-4">
                                        <Label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Debate Panelists (Turn Order)</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {participants.map((pId, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <span className="text-xs text-slate-400">Position {idx + 1}</span>
                                                    <Select
                                                        value={pId}
                                                        onValueChange={(val) => {
                                                            const newP = [...participants];
                                                            newP[idx] = val;
                                                            setParticipants(newP);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Agent" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableAgents.map(a => (
                                                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        // Timeline View
                        <div className="flex flex-col items-start w-full h-full overflow-hidden">

                            {/* Horizontal Scrolling Timeline */}
                            <div
                                ref={scrollContainerRef}
                                className="w-full flex-1 flex items-center overflow-x-auto px-10 py-10 scrollbar-hide snap-x"
                                style={{ scrollBehavior: 'smooth' }}
                            >
                                <div className="flex items-start gap-8 min-w-max px-20">
                                    {/* Start Node */}
                                    <div className="flex flex-col items-center gap-4 opacity-50">
                                        <div className="w-4 h-4 rounded-full bg-slate-300" />
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start</div>
                                    </div>

                                    {/* Turns */}
                                    <AnimatePresence>
                                        {turns.map((turn, index) => (
                                            <motion.div
                                                key={turn.id}
                                                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                className="flex flex-col items-center gap-4 relative group snap-center"
                                            >
                                                {/* Connecting Line (for previous) - pseudo element or simple div */}
                                                {index >= 0 && (
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '2rem' }}
                                                        className="absolute right-full top-2 h-0.5 bg-slate-200 -mr-4"
                                                        style={{ width: '2rem' }}
                                                    />
                                                )}

                                                {/* Timeline Dot */}
                                                <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100 transition-all group-hover:ring-blue-200" />

                                                {/* Card */}
                                                <Card className="w-[500px] shadow-md hover:shadow-xl transition-shadow border-slate-200 mt-4">
                                                    <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback>{turn.agentName[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <div className="font-semibold text-sm">{turn.agentName}</div>
                                                            <div className="text-xs text-slate-400">
                                                                {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="text-sm text-slate-600 leading-relaxed max-h-80 overflow-y-auto">
                                                        {turn.isLoading ? (
                                                            <div className="h-20 flex items-center justify-center">
                                                                <HackerText />
                                                            </div>
                                                        ) : (
                                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:text-sm prose-headings:font-semibold prose-ul:my-1 prose-li:my-0">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {turn.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </CardContent>

                                                    {/* Card Actions */}
                                                    {!turn.isLoading && !isGenerating && (
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                                onClick={() => handleRegenerate(index)}
                                                                title="Regenerate this response"
                                                            >
                                                                <RefreshCw className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </Card>

                                                <div className="text-xs text-slate-400 mt-2">
                                                    Turn {index + 1}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Loading / Next Indicator */}
                                    <div className="flex flex-col items-center gap-4 min-h-[300px] justify-start pt-[6px]">
                                        {/* Line connector */}
                                        {turns.length > 0 && <div className="absolute left-[-2rem] top-2 h-0.5 w-8 bg-slate-200" />}

                                        {isGenerating ? (
                                            <div className="flex flex-col items-center gap-2 animate-pulse">
                                                <div className="w-4 h-4 rounded-full bg-slate-300" />
                                                <div className="text-xs text-slate-400">Thinking...</div>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" className="h-auto p-2" onClick={handleNextTurn}>
                                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                                    <Play className="w-4 h-4 text-slate-400" />
                                                </div>
                                            </Button>
                                        )}
                                    </div>

                                </div>
                            </div>

                        </div>
                    )}
                </AnimatePresence>
            </div >

            {/* Footer Control Bar (Optional) */}
            {
                isDebating && !isGenerating && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                        <Button size="lg" className="shadow-lg rounded-full px-8" onClick={handleNextTurn}>
                            Next Agent Response <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                )
            }
        </div >
    );
}
