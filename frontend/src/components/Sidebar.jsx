import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Crown,
  Users,
  Bot,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '../lib/utils';

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
}) {
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [chairExpanded, setChairExpanded] = useState(true);
  const [expandedProviders, setExpandedProviders] = useState({});

  const groupedModels = availableModels.reduce((acc, model) => {
    const [provider] = model.split('/');
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const sortedProviders = Object.keys(groupedModels).sort();

  const toggleProvider = (provider) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  return (
    <div className="w-72 h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">LLM Council</h1>
            <p className="text-xs text-muted-foreground">AI Deliberation</p>
          </div>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Model Selection Panel */}
        <div className="p-3 border-b border-border">
          <Collapsible open={modelsExpanded} onOpenChange={setModelsExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Council Models</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {selectedModels.length}
                </span>
              </div>
              {modelsExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {availableModels.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">
                    Loading models...
                  </p>
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
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                          <span className="font-medium capitalize">
                            {provider}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedCount > 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                {selectedCount}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
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
                                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                >
                                  <Checkbox
                                    checked={selectedModels.includes(model)}
                                    onCheckedChange={() =>
                                      onToggleModel && onToggleModel(model)
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground truncate">
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
        <div className="p-3 border-b border-border">
          <Collapsible open={chairExpanded} onOpenChange={setChairExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Chairman Model</span>
              </div>
              {chairExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-2">
                <Select
                  value={chairmanModel || ''}
                  onValueChange={(value) =>
                    onChairmanChange && onChairmanChange(value)
                  }
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select chairman" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableModels.length ? availableModels : [chairmanModel])
                      .filter(Boolean)
                      .map((model) => (
                        <SelectItem key={model} value={model} className="text-xs">
                          {model}
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Conversations
          </h3>

          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
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
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title || 'New Conversation'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.message_count} messages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
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
      </ScrollArea>
    </div>
  );
}
