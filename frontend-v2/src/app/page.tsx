'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import LoginPage from '@/components/LoginPage';
import ViewSelector from '@/components/ViewSelector';
import DebateView from '@/components/DebateView';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';

import {
  getStoredTokens,
  storeTokens,
  clearTokens,
} from '@/lib/auth';
import { api, setAuthToken as setApiAuthToken } from '@/lib/api';

export default function Home() {
  // Auth state
  const [authTokens, setAuthTokens] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);

  // Agent Council state
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [chairmanModel, setChairmanModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);



  // Check for stored tokens on client mount
  useEffect(() => {
    const storedTokens = getStoredTokens();
    if (storedTokens) {
      setAuthTokens(storedTokens);
      setApiAuthToken(storedTokens.idToken);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (authTokens) {
      loadModels();
      loadConversations();
      loadModels();
      loadConversations();
      loadSavedPreferences();

    }
  }, [authTokens]);

  // Load conversation when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  // Initialize selected models when available models load
  useEffect(() => {
    if (availableModels.length > 0 && selectedModels.length === 0) {
      setSelectedModels(availableModels.slice(0, 3));
    }
  }, [availableModels, selectedModels.length]);

  const loadModels = async () => {
    try {
      const res = await api.listModels();
      setAvailableModels(res.available_models || res.default_council_models || []);
      setChairmanModel(res.default_chairman_model || '');
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load models');
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
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
      toast.error('Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversation(null);
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const loadSavedPreferences = async () => {
    try {
      const res = await api.getSavedCouncilModels();
      if (res.models && Array.isArray(res.models) && res.models.length > 0) {
        setSelectedModels(res.models);
      }
    } catch (error) {
      console.error('Failed to load saved preferences:', error);
    }
  };



  const handleToggleModel = (model: string) => {
    let newModels;
    if (selectedModels.includes(model)) {
      newModels = selectedModels.filter((m) => m !== model);
    } else {
      if (selectedModels.length >= 5) {
        toast.error("limit of 5 models reached");
        return;
      }
      newModels = [...selectedModels, model];
    }

    setSelectedModels(newModels);

    // Save to backend
    api.saveCouncilModels(newModels).catch(err => {
      console.error("Failed to save models preference", err);
    });
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversationId) return;
    const modelsToUse =
      selectedModels && selectedModels.length > 0
        ? selectedModels
        : availableModels;

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev: any) => ({
        ...prev,
        messages: [...(prev?.messages || []), userMessage],
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
      setCurrentConversation((prev: any) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(
        currentConversationId,
        content,
        (eventType: string, event: any) => {
          switch (eventType) {
            case 'stage1_start':
              setCurrentConversation((prev: any) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage1 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage1_complete':
              setCurrentConversation((prev: any) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage1 = event.data;
                lastMsg.loading.stage1 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage2_start':
              setCurrentConversation((prev: any) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage2 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage2_complete':
              setCurrentConversation((prev: any) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage2 = event.data;
                lastMsg.metadata = event.metadata;
                lastMsg.loading.stage2 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage3_start':
              setCurrentConversation((prev: any) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage3 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage3_complete':
              setCurrentConversation((prev: any) => {
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
              // Stream complete, reload conversations list to update message counts etc
              loadConversations();
              setIsLoading(false);
              break;

            case 'error':
              console.error('Stream error:', event.message);
              toast.error(`Error: ${event.message}`);
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
      toast.error('Failed to send message');
      // Remove optimistic messages on error
      setCurrentConversation((prev: any) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  const handleLogin = (tokens: any) => {
    storeTokens(tokens);
    setAuthTokens(tokens);
    setApiAuthToken(tokens.idToken);
  };

  const handleLogout = () => {
    clearTokens();
    setAuthTokens(null);
    setApiAuthToken(null);
    setSelectedView(null);
    setConversations([]);
    setCurrentConversation(null);
    setCurrentConversationId(null);
  };

  // Not authenticated - show login page
  if (!authTokens) {
    return (
      <TooltipProvider>
        <LoginPage onLogin={handleLogin} />
      </TooltipProvider>
    );
  }

  // Authenticated - show view selector or selected view
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        {/* Global Header */}
        <Header
          onLogout={handleLogout}
          onBack={selectedView ? () => setSelectedView(null) : undefined}
          showBackButton={!!selectedView}
          title={selectedView === 'agentCouncil' ? 'Agent Council' : undefined}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {selectedView === 'agentCouncil' ? (
            <div className="flex h-full">
              <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={setCurrentConversationId}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                availableModels={availableModels}
                selectedModels={selectedModels}
                onToggleModel={handleToggleModel}
                chairmanModel={chairmanModel}
                onChairmanChange={setChairmanModel}
              />
              <ChatInterface
                conversation={currentConversation}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                canSend={(selectedModels && selectedModels.length > 0) || availableModels.length > 0}
              />
            </div>

          ) : selectedView === 'debate' ? ( // Handle Debate View
            <DebateView />
          ) : (
            <ViewSelector onSelectView={setSelectedView} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
