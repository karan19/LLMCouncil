'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Bot, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Stage1Props {
    stage1: any[];
    labelToModel: any;
    aggregateRankings: any[];
}

export default function Stage1({ stage1, labelToModel, aggregateRankings }: Stage1Props) {
    if (!stage1 || stage1.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No opinions available
            </div>
        );
    }

    const getRankBadge = (label: string) => {
        if (!aggregateRankings) return null;
        const ranking = aggregateRankings.find((r) => r.label === label);
        if (!ranking) return null;

        const position = aggregateRankings.indexOf(ranking) + 1;
        const variants: Record<number, { className: string; icon: string }> = {
            1: { className: 'bg-amber-500 text-white', icon: '🥇' },
            2: { className: 'bg-slate-400 text-white', icon: '🥈' },
            3: { className: 'bg-amber-700 text-white', icon: '🥉' },
        };

        const variant = variants[position] || { className: 'bg-slate-200 text-slate-700', icon: `#${position}` };

        return (
            <Badge className={cn('gap-1', variant.className)}>
                <span>{variant.icon}</span>
                <span className="text-xs">Avg: {ranking.avg_rank.toFixed(2)}</span>
            </Badge>
        );
    };

    const getModelColor = (index: number) => {
        const colors = [
            'from-blue-500 to-cyan-500',
            'from-purple-500 to-pink-500',
            'from-orange-500 to-red-500',
            'from-green-500 to-emerald-500',
            'from-indigo-500 to-violet-500',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">First Opinions</h3>
                <span className="text-sm text-muted-foreground">
                    ({stage1.length} models responded)
                </span>
            </div>

            <div className="grid gap-4">
                {stage1.map((opinion, index) => {
                    const modelName = labelToModel?.[opinion.label] || opinion.label;

                    return (
                        <motion.div
                            key={opinion.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getModelColor(index))}>
                                                    <Bot className="w-4 h-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-sm font-medium">
                                                    {opinion.label}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {modelName}
                                                </p>
                                            </div>
                                        </div>
                                        {getRankBadge(opinion.label)}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="markdown-content text-sm prose prose-slate max-w-none dark:prose-invert">
                                        <ReactMarkdown>{opinion.content}</ReactMarkdown>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
