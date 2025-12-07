'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Scale, ArrowRight, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Stage2Props {
    stage2: any[];
    labelToModel: any;
}

export default function Stage2({ stage2, labelToModel }: Stage2Props) {
    if (!stage2 || stage2.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No peer reviews available
            </div>
        );
    }

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
                <Scale className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Peer Reviews</h3>
                <span className="text-sm text-muted-foreground">
                    ({stage2.length} reviews)
                </span>
            </div>

            <div className="grid gap-4">
                {stage2.map((review, index) => {
                    const reviewerModel = labelToModel?.[review.reviewer] || review.reviewer;

                    return (
                        <motion.div
                            key={`${review.reviewer}-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className={cn('bg-gradient-to-br text-white text-xs', getModelColor(index))}>
                                                    <Bot className="w-4 h-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-sm font-medium">
                                                    {review.reviewer}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {reviewerModel}
                                                </p>
                                            </div>
                                        </div>

                                        {Array.isArray(review.ranking) && review.ranking.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className="text-xs text-muted-foreground mr-1">Ranking:</span>
                                                {review.ranking.map((label: string, i: number) => (
                                                    <div key={label} className="flex items-center">
                                                        <Badge
                                                            variant={i === 0 ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                        >
                                                            {i + 1}. {label}
                                                        </Badge>
                                                        {i < review.ranking.length - 1 && (
                                                            <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="markdown-content text-sm prose prose-slate max-w-none dark:prose-invert">
                                        <ReactMarkdown>{review.critique}</ReactMarkdown>
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
