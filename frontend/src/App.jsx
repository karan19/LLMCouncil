import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DebateView from './components/DebateView';
import { api, setAuthToken as setApiAuthToken } from './api';
import LoginPage from './components/LoginPage';
import {
  getStoredTokens,
  storeTokens,
  clearTokens,
  parseHashTokens,
} from './auth';
import './App.css';

const VIEW_OPTIONS = [
  {
    id: 'agentCouncil',
    label: 'Agent Council',
    description: 'Run the three-stage council flow, review every model, and read the final chairman synthesis.',
    cta: 'Enter Agent Council',
    enabled: true,
  },
  {
    id: 'debate',
    label: 'Debate',
    description: 'Place a topic in the center and let each model take turns speaking around the table.',
    cta: 'Enter Debate',
    enabled: true,
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
  const [selectedView, setSelectedView] = useState(getInitialView);
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
      const result = await api.startDebate(topic);
      setDebateTurns(result.turns || []);
      setDebateTopic(result.topic || topic);
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
      <LoginPage
        onLogin={(tokens) => {
          storeTokens(tokens);
          setAuthTokens(tokens);
          setApiAuthToken(tokens.idToken);
        }}
      />
    );
  }

  return (
    <div className="app">
      <div className="auth-bar">
        <button className="auth-button" onClick={handleLogout}>
          Sign out
        </button>
      </div>
      {selectedView === 'agentCouncil' ? (
        <>
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
          <div className="main-content">
            <ChatInterface
              conversation={currentConversation}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              canSend={(selectedModels && selectedModels.length > 0) || availableModels.length > 0}
            />
          </div>
        </>
      ) : selectedView === 'debate' ? (
        <DebateView
          conversation={currentConversation}
          panelModels={panelModels}
          availableModels={availableModels}
          onPanelModelChange={handlePanelModelChange}
          onSubmitTopic={handleDebateTopicSubmit}
          onBackToSelection={() => setSelectedView(null)}
          debateTurns={debateTurns}
          debateLoading={debateLoading}
          debateError={debateError}
          debateTopic={debateTopic}
        />
      ) : (
        <div className="view-selection">
          <div className="view-selection-inner">
            {VIEW_OPTIONS.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`view-pane ${view.enabled ? '' : 'disabled'}`}
                onClick={() => view.enabled && setSelectedView(view.id)}
                aria-disabled={!view.enabled}
                disabled={!view.enabled}
              >
                <div className="view-pane-header">
                  <span className="view-pane-label">{view.label}</span>
                </div>
                <p className="view-pane-description">{view.description}</p>
                <span className="view-pane-cta">{view.cta}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
