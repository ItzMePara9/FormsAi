import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { GoogleProvider } from './context/GoogleContext.tsx';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { TopHeader } from './components/layout/TopHeader.tsx';

// Views
import { SetupView } from './views/SetupView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { DashboardOverview } from './views/DashboardOverview.tsx';
import { CreateWithAIView } from './views/CreateWithAIView.tsx';
import { MyFormsView } from './views/MyFormsView.tsx';
import { TemplatesView } from './views/TemplatesView.tsx';
import { AIModelsView } from './views/AIModelsView.tsx';
import { GoogleIntegrationView } from './views/GoogleIntegrationView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { FormEditorView } from './views/FormEditorView.tsx';
import { Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isSetupRequired, isLoading, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [createInitialPrompt, setCreateInitialPrompt] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080A10]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/30 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="font-mono text-xs text-purple-400">Loading FormGenius AI...</p>
        </div>
      </div>
    );
  }

  // First-time setup wizard redirect
  if (isSetupRequired) {
    return <SetupView />;
  }

  // Not logged in -> Show Login view
  if (!user) {
    return <LoginView />;
  }

  // When actively editing a form in the canvas / copilot
  if (editingFormId) {
    return (
      <FormEditorView
        formId={editingFormId}
        onBack={() => setEditingFormId(null)}
        onNavigate={(tab) => {
          setEditingFormId(null);
          setActiveTab(tab);
        }}
      />
    );
  }

  const handleStartCreateWithPrompt = (prompt: string) => {
    setCreateInitialPrompt(prompt);
    setActiveTab('create');
  };

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'overview':
        return { title: 'Dashboard Overview', subtitle: 'Real-time overview of AI models, forms, and Google connections' };
      case 'create':
        return { title: 'Create Form with AI', subtitle: 'Turn natural language prompts into complete, professional Google Forms' };
      case 'forms':
        return { title: 'My Forms', subtitle: 'Manage, edit, duplicate, and publish your generated forms' };
      case 'templates':
        return { title: 'Template Blueprints', subtitle: 'Pre-built forms ready to publish or customize with AI' };
      case 'models':
        return { title: 'AI Model Management', subtitle: 'Configure Google AI Studio (Gemini) and OpenAI-compatible providers' };
      case 'google':
        return { title: 'Google Integration', subtitle: 'Connect Google Forms and Google Drive via OAuth 2.0' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Application preferences, passwords, and self-hosted deployment guides' };
    }
  };

  const headerInfo = getPageTitle(activeTab);

  return (
    <div className="flex min-h-screen bg-[#080A10] text-slate-100 font-sans selection:bg-purple-600/30 selection:text-purple-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onQuickCreate={() => {
            setCreateInitialPrompt('');
            setActiveTab('create');
          }}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <DashboardOverview
              onNavigate={setActiveTab}
              onEditForm={(id) => setEditingFormId(id)}
              onStartCreateWithPrompt={handleStartCreateWithPrompt}
            />
          )}

          {activeTab === 'create' && (
            <CreateWithAIView
              initialPrompt={createInitialPrompt}
              onFormCreated={(id) => setEditingFormId(id)}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'forms' && (
            <MyFormsView
              onEditForm={(id) => setEditingFormId(id)}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesView
              onUseTemplate={(id) => setEditingFormId(id)}
              onCustomizeWithAI={handleStartCreateWithPrompt}
            />
          )}

          {activeTab === 'models' && <AIModelsView />}

          {activeTab === 'google' && <GoogleIntegrationView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GoogleProvider>
        <AppContent />
      </GoogleProvider>
    </AuthProvider>
  );
}
