import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, User, Bot, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { cn } from '../lib/utils';

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  canSend = true,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && canSend) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/20">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to LLM Council
          </h2>
          <p className="text-muted-foreground max-w-md">
            Start a new conversation to consult with multiple AI models
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
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
                  <UserMessage content={message.content} />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Consulting the council</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
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
              className="min-h-[60px] max-h-[200px] resize-none"
              rows={2}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading || !canSend}
              className="h-auto px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          {!canSend && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Select at least one council model from the sidebar
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function UserMessage({ content }) {
  return (
    <div className="flex gap-3 justify-end">
      <Card className="max-w-[80%] p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-500/20">
        <div className="markdown-content text-white">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </Card>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarFallback className="bg-slate-200">
          <User className="w-5 h-5 text-slate-600" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function AssistantMessage({ message }) {
  const { stage1, stage2, stage3, label_to_model, aggregate_rankings } = message;

  return (
    <div className="flex gap-3">
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
          <Bot className="w-5 h-5 text-white" />
        </AvatarFallback>
      </Avatar>
      <Card className="flex-1 p-0 overflow-hidden shadow-lg">
        <Tabs defaultValue="synthesis" className="w-full">
          <div className="border-b border-border bg-muted/50 px-4 pt-4">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-2">
              <TabsTrigger
                value="synthesis"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Synthesis
              </TabsTrigger>
              <TabsTrigger
                value="opinions"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Stage 1: Opinions
                <Badge variant="secondary" className="ml-2">
                  {stage1?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                Stage 2: Review
                <Badge variant="secondary" className="ml-2">
                  {stage2?.length || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="synthesis" className="m-0">
              <Stage3 stage3={stage3} />
            </TabsContent>
            <TabsContent value="opinions" className="m-0">
              <Stage1
                stage1={stage1}
                labelToModel={label_to_model}
                aggregateRankings={aggregate_rankings}
              />
            </TabsContent>
            <TabsContent value="review" className="m-0">
              <Stage2 stage2={stage2} labelToModel={label_to_model} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
