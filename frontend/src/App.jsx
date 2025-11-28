import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DebateView from './components/DebateView';
import { api, setAuthToken as setApiAuthToken } from './api';
import LoginPage from './components/LoginPage';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { TooltipProvider } from './components/ui/tooltip';
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  parseHashTokens,
} from './auth';
import { cn } from './lib/utils';

const VIEW_OPTIONS = [
  {
    id: 'agentCouncil',
    label: 'Agent Council',
    icon: Sparkles,
    description: 'Run the three-stage council flow, review every model, and read the final chairman synthesis.',
    cta: 'Enter Agent Council',
    enabled: true,
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'debate',
    label: 'Debate Mode',
    icon: Users,
    description: 'Place a topic in the center and let each model take turns speaking around the table.',
    cta: 'Enter Debate',
    enabled: true,
    gradient: 'from-purple-500 to-pink-500',
  },
];

const VIEW_PATHS = {
  agentCouncil: '/agentcouncil',
  debate: '/debate',
};

const getInitialView = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const matching = Object.entries(VIEW_PATHS).find(([, p]) => p === path);
  return matching ? matching[0] : null;
};

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [debateTurns, setDebateTurns] = useState([]);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState('');
  const [authTokens, setAuthTokens] = useState(getStoredTokens());
  const [selectedView, setSelectedView] = useState(getInitialView());
  const [panelModels, setPanelModels] = useState(['', '', '']);
  const [storedPanelModels, setStoredPanelModels] = useState(['', '', '']);

  // Load auth from hash or storage, then bootstrap data when tokens exist
  useEffect(() => {
    const tokensFromHash = parseHashTokens(window.location.hash);
    if (tokensFromHash) {
      storeTokens(tokensFromHash);
      setAuthTokens(tokensFromHash);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (authTokens) {
      setApiAuthToken(authTokens.idToken);
      loadConversations();
      loadModels();
      loadDebatePanel();
    }
  }, [authTokens]);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const matching = Object.entries(VIEW_PATHS).find(([, p]) => p === path);
      setSelectedView(matching ? matching[0] : null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targetPath = selectedView ? VIEW_PATHS[selectedView] : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [selectedView]);

  useEffect(() => {
    if (selectedView !== 'debate') {
      setDebateTurns([]);
      setDebateTopic('');
      setDebateError('');
    }
  }, [selectedView]);

  useEffect(() => {
    if (!availableModels.length) return;
    setPanelModels((prev) => {
      if (prev.some(Boolean)) {
        return prev;
      }
      const defaults = availableModels.slice(0, 3);
      return Array.from({ length: 3 }, (_, idx) => defaults[idx] || '');
    });
    setSelectedModels((prev) => {
      if (prev.length > 0) return prev;
      return availableModels.slice(0, 3);
    });
  }, [availableModels]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const loadModels = async () => {
    try {
      const res = await api.listModels();
      setAvailableModels(res.available_models || res.default_council_models || []);
      setSelectedModels(res.default_council_models || res.available_models || []);
      setChairmanModel(res.default_chairman_model || '');
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels([]);
      setSelectedModels([]);
      setChairmanModel('');
    }
  };

  const loadDebatePanel = async () => {
    try {
      const res = await api.getDebatePanel();
      const panelModels = res.panel_models || ['', '', ''];
      setStoredPanelModels(panelModels);
      setPanelModels(panelModels);
    } catch (error) {
      console.error('Failed to load debate panel:', error);
      setStoredPanelModels(['', '', '']);
      setPanelModels(['', '', '']);
    }
  };

  const saveDebatePanel = async (panelModels) => {
    try {
      await api.saveDebatePanel(panelModels);
      setStoredPanelModels(panelModels);
    } catch (error) {
      console.error('Failed to save debate panel:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversation(null);
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;
    const modelsToUse =
      selectedModels && selectedModels.length > 0
        ? selectedModels
        : availableModels;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(
        currentConversationId,
        content,
        (eventType, event) => {
          switch (eventType) {
            case 'stage1_start':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage1 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage1_complete':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage1 = event.data;
                lastMsg.loading.stage1 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage2_start':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage2 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage2_complete':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage2 = event.data;
                lastMsg.metadata = event.metadata;
                lastMsg.loading.stage2 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage3_start':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage3 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage3_complete':
              setCurrentConversation((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage3 = event.data;
                lastMsg.loading.stage3 = false;
                return { ...prev, messages };
              });
              break;

            case 'title_complete':
              // Reload conversations to get updated title
              loadConversations();
              break;

            case 'complete':
              // Stream complete, reload conversations list
              loadConversations();
              setIsLoading(false);
              break;

            case 'error':
              console.error('Stream error:', event.message);
              setIsLoading(false);
              break;

            default:
              console.log('Unknown event type:', eventType);
          }
        },
        {
          models: modelsToUse,
          chairmanModel,
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  const handlePanelModelChange = async (index, model) => {
    const newPanelModels = [...panelModels];
    newPanelModels[index] = model;
    setPanelModels(newPanelModels);
    setDebateTurns([]);

    // Save to backend
    await saveDebatePanel(newPanelModels);
  };

  const handleDebateTopicSubmit = async (topic) => {
    // Check if we have stored panel models configured
    if (!storedPanelModels.some(Boolean)) {
      setDebateError('Please configure your debate panel models first.');
      return;
    }

    setDebateLoading(true);
    setDebateError('');
    try {
      const result = await api.startDebate(topic || debateTopic);
      setDebateTurns(result.turns || []);
      setDebateTopic(result.topic || topic || debateTopic);
    } catch (err) {
      setDebateError(err.message || 'Failed to run debate');
    } finally {
      setDebateLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    setAuthTokens(null);
    setApiAuthToken(null);
    setSelectedView(null);
  };

  if (!authTokens) {
    return (
      <TooltipProvider>
        <LoginPage
          onLogin={(tokens) => {
            storeTokens(tokens);
            setAuthTokens(tokens);
            setApiAuthToken(tokens.idToken);
          }}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        {/* Sign out button */}
        <div className="fixed top-4 right-4 z-50">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {selectedView === 'agentCouncil' ? (
            <motion.div
              key="council"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full"
            >
              <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                availableModels={availableModels}
                selectedModels={selectedModels}
                onToggleModel={(model) => {
                  setSelectedModels((prev) =>
                    prev.includes(model)
                      ? prev.filter((m) => m !== model)
                      : [...prev, model]
                  );
                }}
                chairmanModel={chairmanModel}
                onChairmanChange={setChairmanModel}
              />
              <ChatInterface
                conversation={currentConversation}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                canSend={(selectedModels && selectedModels.length > 0) || availableModels.length > 0}
              />
            </motion.div>
          ) : selectedView === 'debate' ? (
            <motion.div
              key="debate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <DebateView
                panelModels={panelModels}
                availableModels={availableModels}
                onPanelModelChange={handlePanelModelChange}
                debateTurns={debateTurns}
                debateTopic={debateTopic}
                onDebateTopicChange={setDebateTopic}
                onStartDebate={() => handleDebateTopicSubmit(debateTopic)}
                debateLoading={debateLoading}
                debateError={debateError}
                onReturn={() => setSelectedView(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50"
            >
              <div className="w-full max-w-4xl">
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/25"
                  >
                    <Sparkles className="w-10 h-10 text-white" />
                  </motion.div>
                  <h1 className="text-4xl font-bold text-foreground mb-3">
                    Welcome to LLM Council
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Choose how you want to interact with multiple AI models
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {VIEW_OPTIONS.map((view, index) => {
                    const Icon = view.icon;
                    return (
                      <motion.div
                        key={view.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <Card
                          className={cn(
                            "cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary/50",
                            !view.enabled && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => view.enabled && setSelectedView(view.id)}
                        >
                          <CardHeader>
                            <div className={cn(
                              "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                              view.gradient
                            )}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle className="text-xl">{view.label}</CardTitle>
                            <CardDescription className="text-base">
                              {view.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              className={cn(
                                "w-full bg-gradient-to-r shadow-md",
                                view.gradient
                              )}
                              disabled={!view.enabled}
                            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

export default App;
