import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SavedDebatesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectDebate: (debate: any) => void;
}

export default function SavedDebatesDialog({ open, onOpenChange, onSelectDebate }: SavedDebatesDialogProps) {
    const [debates, setDebates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadDebates();
        }
    }, [open]);

    const loadDebates = async () => {
        setIsLoading(true);
        try {
            const data = await api.getDebateHistory();
            setDebates(data.debates || []);
        } catch (error) {
            console.error("Failed to load history:", error);
            toast.error("Failed to load saved debates.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = async (debateId: string) => {
        try {
            const debate = await api.getDebate(debateId);
            onSelectDebate(debate);
            onOpenChange(false);
            toast.success("Debate loaded successfully.");
        } catch (error) {
            console.error("Failed to load debate:", error);
            toast.error("Failed to load the selected debate.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Debate History</DialogTitle>
                    <DialogDescription>
                        Resume or review previous debate sessions.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Loading history...
                        </div>
                    ) : debates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                            <p>No saved debates found.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="divide-y divide-slate-100">
                                {debates.map((debate) => (
                                    <div
                                        key={debate.id}
                                        className="p-4 hover:bg-white hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between"
                                        onClick={() => handleSelect(debate.id)}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="font-medium text-slate-900 truncate">
                                                {debate.title || "Untitled Debate"}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(debate.created_at).toLocaleDateString()} {new Date(debate.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span>
                                                    {debate.message_count} Turns
                                                </span>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            Open <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
