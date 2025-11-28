import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  MessageCircle,
  Mic,
  Bot,
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '../lib/utils';

export default function DebateView({
  availableModels = [],
  panelModels = ['', '', ''],
  onPanelModelChange,
  debateTurns = [],
  debateTopic = '',
  onDebateTopicChange,
  onStartDebate,
  debateLoading = false,
  debateError = '',
  onReturn,
}) {
  const hasValidPanel = panelModels.some(Boolean);

  const getModelColor = (index) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-emerald-500 to-teal-500',
    ];
    return colors[index % colors.length];
  };

  const getPositionClass = (index) => {
    const positions = ['top', 'left', 'right'];
    return positions[index] || 'top';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-cyan-50">
      {/* Header */}
      <div className="border-b border-border bg-white/80 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onReturn}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h1 className="text-xl font-bold text-foreground">Debate Mode</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Round-table discussion among AI models
              </p>
            </div>
          </div>
          {debateTopic && debateTurns.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              <MessageCircle className="w-3 h-3 mr-1" />
              {debateTurns.length} turns
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Panel Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Configure Panelists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <div className={cn(
                        'w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
                        getModelColor(index)
                      )}>
                        {index + 1}
                      </div>
                      Panelist {index + 1}
                    </label>
                    <Select
                      value={panelModels[index] || ''}
                      onValueChange={(value) =>
                        onPanelModelChange && onPanelModelChange(index, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Topic Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Debate Topic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={debateTopic}
                onChange={(e) =>
                  onDebateTopicChange && onDebateTopicChange(e.target.value)
                }
                placeholder="Enter a topic for the panelists to discuss..."
                className="min-h-[120px]"
                disabled={debateLoading}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Each panelist will take turns responding to the topic
                </p>
                <Button
                  onClick={onStartDebate}
                  disabled={!debateTopic.trim() || !hasValidPanel || debateLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {debateLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Debating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Start Debate
                    </>
                  )}
                </Button>
              </div>
              {debateError && (
                <p className="text-sm text-destructive">{debateError}</p>
              )}
            </CardContent>
          </Card>

          {/* Debate Results */}
          {debateTurns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Debate Transcript
              </h2>

              {/* Topic Card */}
              <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Topic
                  </p>
                  <p className="text-xl font-medium">{debateTopic}</p>
                </CardContent>
              </Card>

              {/* Speaker Cards */}
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {debateTurns.map((turn, index) => (
                    <motion.div
                      key={`${turn.model}-${index}`}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback
                                  className={cn(
                                    'bg-gradient-to-br text-white',
                                    getModelColor(index)
                                  )}
                                >
                                  <Bot className="w-5 h-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-sm font-medium">
                                  {turn.role}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {turn.model}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              Turn {index + 1}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="markdown-content">
                            <ReactMarkdown>{turn.response}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
