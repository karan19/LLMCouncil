'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, User, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content?: string;
    stage1?: any[];
    stage2?: any[];
    stage3?: any;
    label_to_model?: any;
    aggregate_rankings?: any[];
}

interface Conversation {
    messages: Message[];
}

interface ChatInterfaceProps {
    conversation: Conversation | null;
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    canSend?: boolean;
}

export default function ChatInterface({
    conversation,
    onSendMessage,
    isLoading,
    canSend = true,
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading && canSend) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Welcome to LLM Council
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Start a new conversation to consult with multiple AI models
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <AnimatePresence mode="popLayout">
                        {conversation.messages.map((message, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {message.role === 'user' ? (
                                    <UserMessage content={message.content || ''} />
                                ) : (
                                    <AssistantMessage message={message} />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-3 p-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                <span>Consulting the council</span>
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white p-4">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    <div className="flex gap-3">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                canSend
                                    ? "Ask your question... (Shift+Enter for new line)"
                                    : "Select at least one model to continue"
                            }
                            disabled={isLoading || !canSend}
                            className="min-h-[60px] max-h-[200px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            rows={2}
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading || !canSend}
                            className="h-auto px-6 bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                    {!canSend && (
                        <p className="text-xs text-red-500 mt-2 text-center">
                            Select at least one council model from the sidebar
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}

function UserMessage({ content }: { content: string }) {
    return (
        <div className="flex gap-3 justify-end group">
            <div className="max-w-[80%] space-y-1">
                <div className="flex justify-end pr-1">
                    <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">You</span>
                </div>
                <Card className="p-4 bg-slate-900 text-white border-0 shadow-md">
                    <div className="markdown-content text-white prose prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </Card>
            </div>
            <Avatar className="w-8 h-8 shrink-0 mt-1">
                <AvatarFallback className="bg-slate-200">
                    <User className="w-4 h-4 text-slate-600" />
                </AvatarFallback>
            </Avatar>
        </div>
    );
}

function AssistantMessage({ message }: { message: Message }) {
    const { stage1, stage2, stage3, label_to_model, aggregate_rankings } = message;

    return (
        <div className="flex gap-3">
            <Avatar className="w-8 h-8 shrink-0 mt-1">
                <AvatarFallback className="bg-white border border-slate-200">
                    <Bot className="w-4 h-4 text-slate-600" />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <span className="text-xs text-slate-400 pl-1">Council</span>
                <Card className="flex-1 p-0 overflow-hidden shadow-sm border-slate-200/60 bg-white">
                    <Tabs defaultValue="synthesis" className="w-full">
                        <div className="border-b border-slate-100 bg-slate-50/50 px-4 pt-4">
                            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-6">
                                <TabsTrigger
                                    value="synthesis"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 px-0 pb-3 font-medium transition-colors hover:text-slate-700"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                                    Synthesis
                                </TabsTrigger>
                                <TabsTrigger
                                    value="opinions"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 px-0 pb-3 font-medium transition-colors hover:text-slate-700"
                                >
                                    Stage 1: Opinions
                                    <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 hover:bg-slate-300 h-5 px-1.5 min-w-[1.25rem] justify-center">
                                        {stage1?.length || 0}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="review"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 px-0 pb-3 font-medium transition-colors hover:text-slate-700"
                                >
                                    Stage 2: Review
                                    <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 hover:bg-slate-300 h-5 px-1.5 min-w-[1.25rem] justify-center">
                                        {stage2?.length || 0}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-4 bg-slate-50/30 min-h-[100px]">
                            <TabsContent value="synthesis" className="m-0 focus-visible:outline-none">
                                <Stage3 stage3={stage3} />
                            </TabsContent>
                            <TabsContent value="opinions" className="m-0 focus-visible:outline-none">
                                <Stage1
                                    stage1={stage1}
                                    labelToModel={label_to_model}
                                    aggregateRankings={aggregate_rankings || []}
                                />
                            </TabsContent>
                            <TabsContent value="review" className="m-0 focus-visible:outline-none">
                                <Stage2 stage2={stage2} labelToModel={label_to_model} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
