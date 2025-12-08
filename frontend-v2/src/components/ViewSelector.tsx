'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, MessageSquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import AnimatedLogo from './AnimatedLogo';

interface ViewSelectorProps {
    onSelectView: (viewId: string) => void;
}

const VIEW_OPTIONS = [
    {
        id: 'agentCouncil',
        label: 'Agent Council',
        icon: Sparkles,
        description: 'Run the three-stage council flow, review every model, and read the final chairman synthesis.',
        cta: 'Enter Agent Council',
    },
    {
        id: 'debate',
        label: 'Debate Mode',
        icon: MessageSquareDashed,
        description: 'Start a topic and watch agents debate it in a horizontal timeline view.',
        cta: 'Enter Debate',
    },

];

export default function ViewSelector({ onSelectView }: ViewSelectorProps) {
    return (
        <div className="h-full flex items-center justify-center p-8 bg-slate-50">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center"
                    >
                        <AnimatedLogo size={32} />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-semibold text-slate-900 mb-2"
                    >
                        Welcome to LLM Council
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-500"
                    >
                        Choose how you want to interact with multiple AI models
                    </motion.p>
                </div>

                {/* Two Panes */}
                <div className="grid md:grid-cols-2 gap-6">
                    {VIEW_OPTIONS.map((view, index) => {
                        const Icon = view.icon;
                        return (
                            <motion.div
                                key={view.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                            >
                                <Card
                                    className={cn(
                                        "cursor-pointer transition-all duration-200 h-full",
                                        "hover:shadow-lg hover:border-slate-300",
                                        "border border-slate-200 bg-white"
                                    )}
                                    onClick={() => onSelectView(view.id)}
                                >
                                    <CardHeader className="pb-4">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                                            <Icon className="w-6 h-6 text-slate-700" />
                                        </div>
                                        <CardTitle className="text-xl text-slate-900">{view.label}</CardTitle>
                                        <CardDescription className="text-slate-500 leading-relaxed">
                                            {view.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                            {view.cta}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
