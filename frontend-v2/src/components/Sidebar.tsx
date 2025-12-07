'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    MessageSquare,
    Trash2,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Crown,
    Users,
    Bot,
    ArrowLeft,
    PanelLeftClose,
    PanelLeft,
    GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Conversation {
    id: string;
    title?: string;
    message_count: number;
    created_at?: string;
}

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    availableModels?: string[];
    selectedModels?: string[];
    onToggleModel?: (model: string) => void;
    chairmanModel?: string;
    onChairmanChange?: (model: string) => void;
    onReturn?: () => void;
}

export default function Sidebar({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    availableModels = [],
    selectedModels = [],
    onToggleModel,
    chairmanModel,
    onChairmanChange,
    onReturn,
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [width, setWidth] = useState(288); // 72 * 4 = 288px (w-72)
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [modelsExpanded, setModelsExpanded] = useState(true);
    const [chairExpanded, setChairExpanded] = useState(true);
    const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

    const minWidth = 64; // Collapsed width
    const maxWidth = 400;
    const defaultWidth = 288;

    // Handle mouse move for resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setWidth(newWidth);
                setIsCollapsed(newWidth < 150);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Group models by provider
    const groupedModels = availableModels.reduce<Record<string, string[]>>((acc, model) => {
        const [provider] = model.split('/');
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(model);
        return acc;
    }, {});

    const sortedProviders = Object.keys(groupedModels).sort();

    const toggleProvider = (provider: string) => {
        setExpandedProviders((prev) => ({
            ...prev,
            [provider]: !prev[provider],
        }));
    };

    const handleCollapseToggle = () => {
        if (isCollapsed) {
            setWidth(defaultWidth);
            setIsCollapsed(false);
        } else {
            setWidth(minWidth);
            setIsCollapsed(true);
        }
    };

    return (
        <div
            ref={sidebarRef}
            className="h-full bg-white border-r border-slate-200 flex flex-col relative"
            style={{ width: isCollapsed ? minWidth : width }}
        >
            {/* Header */}
            <div className={cn("p-4 border-b border-slate-200", isCollapsed && "p-2")}>
                <div className={cn("flex items-center gap-3 mb-4", isCollapsed && "flex-col gap-2 mb-2")}>
                    {onReturn && !isCollapsed && (
                        <Button variant="ghost" size="icon" onClick={onReturn} className="h-8 w-8">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center cursor-pointer" onClick={isCollapsed ? handleCollapseToggle : undefined}>
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1">
                            <h1 className="font-semibold text-slate-900">Agent Council</h1>
                            <p className="text-xs text-slate-500">AI Deliberation</p>
                        </div>
                    )}
                </div>

                {isCollapsed ? (
                    <Button
                        onClick={onNewConversation}
                        size="icon"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={onNewConversation}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Conversation
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {!isCollapsed && (
                    <div className="min-h-0">
                        {/* Model Selection Panel */}
                        <div className="p-3 border-b border-slate-100">
                            <Collapsible open={modelsExpanded} onOpenChange={setModelsExpanded}>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-medium text-slate-700">Council Models</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                            {selectedModels.length}
                                        </span>
                                    </div>
                                    {modelsExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    {selectedModels.length > 0 && (
                                        <div className="px-2 pt-2 pb-1">
                                            <div className="text-[10px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Active Council ({selectedModels.length}/5)</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedModels.map(m => (
                                                    <div key={m} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-700">
                                                        <span>{m.split('/').pop()}</span>
                                                        <div
                                                            className="cursor-pointer hover:text-red-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onToggleModel(m);
                                                            }}
                                                        >
                                                            ×
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2 space-y-1">
                                        {availableModels.length === 0 ? (
                                            <p className="text-xs text-slate-400 p-2">Loading models...</p>
                                        ) : (
                                            sortedProviders.map((provider) => {
                                                const models = groupedModels[provider].slice().sort();
                                                const isExpanded = expandedProviders[provider];
                                                const selectedCount = models.filter((m) =>
                                                    selectedModels.includes(m)
                                                ).length;

                                                return (
                                                    <Collapsible
                                                        key={provider}
                                                        open={isExpanded}
                                                        onOpenChange={() => toggleProvider(provider)}
                                                    >
                                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                                                            <span className="font-medium text-slate-600 capitalize">
                                                                {provider}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {selectedCount > 0 && (
                                                                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                                                                        {selectedCount}
                                                                    </span>
                                                                )}
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                                ) : (
                                                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                                                )}
                                                            </div>
                                                        </CollapsibleTrigger>

                                                        <CollapsibleContent>
                                                            <div className="ml-2 mt-1 space-y-0.5">
                                                                {models.map((model) => {
                                                                    const modelName = model.split('/')[1];
                                                                    return (
                                                                        <label
                                                                            key={model}
                                                                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                                                                        >
                                                                            <Checkbox
                                                                                checked={selectedModels.includes(model)}
                                                                                onCheckedChange={() =>
                                                                                    onToggleModel && onToggleModel(model)
                                                                                }
                                                                            />
                                                                            <span className="text-xs text-slate-600 truncate">
                                                                                {modelName}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            })
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Chairman Selection */}
                        <div className="p-3 border-b border-slate-100">
                            <Collapsible open={chairExpanded} onOpenChange={setChairExpanded}>
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-medium text-slate-700">Chairman Model</span>
                                    </div>
                                    {chairExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="mt-2">
                                        <Select
                                            value={chairmanModel || ''}
                                            onValueChange={(value) => onChairmanChange && onChairmanChange(value)}
                                        >
                                            <SelectTrigger className="w-full text-xs bg-white">
                                                <SelectValue placeholder="Select chairman" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white" style={{ width: 'var(--radix-select-trigger-width)' }}>
                                                {(availableModels.length ? availableModels : [chairmanModel])
                                                    .filter(Boolean)
                                                    .map((model) => (
                                                        <SelectItem key={model} value={model!} className="text-xs">
                                                            <span className="truncate block max-w-full">{model}</span>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Conversations List */}
                        <div className="p-3">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                                Conversations
                            </h3>

                            {conversations.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    No conversations yet
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    <AnimatePresence>
                                        {conversations.map((conv) => (
                                            <motion.div
                                                key={conv.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className={cn(
                                                    "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                                                    currentConversationId === conv.id
                                                        ? "bg-slate-100 text-slate-900"
                                                        : "hover:bg-slate-50 text-slate-600"
                                                )}
                                                onClick={() => onSelectConversation(conv.id)}
                                            >
                                                <MessageSquare className="w-4 h-4 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {conv.title || 'New Conversation'}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {conv.message_count} messages
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteConversation && onDeleteConversation(conv.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Collapsed state - show icons only */}
                {isCollapsed && (
                    <div className="p-2 space-y-2">
                        <Button variant="ghost" size="icon" className="w-full">
                            <Users className="w-4 h-4 text-slate-500" />
                        </Button>

                        <Button variant="ghost" size="icon" className="w-full">
                            <Crown className="w-4 h-4 text-amber-500" />
                        </Button>

                        <div className="border-t border-slate-100 pt-2 mt-2">
                            {conversations.slice(0, 5).map((conv) => (
                                <Button
                                    key={conv.id}
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "w-full mb-1",
                                        currentConversationId === conv.id && "bg-slate-100"
                                    )}
                                    onClick={() => onSelectConversation(conv.id)}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>



            {/* Floating collapse toggle on sidebar edge */}
            <Button
                variant="outline"
                size="icon"
                onClick={handleCollapseToggle}
                className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-slate-50"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronLeft className="h-3 w-3" />
                )}
            </Button>
        </div>
    );
}
