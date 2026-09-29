import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { autoWriteGuideContent, testAiConnection, AI_PROVIDER_DEFAULTS, StepUpdateItem } from '@/services/aiHarness';
import { AiProvider } from '@/types';
import {
  Bot,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Key,
  Sparkles,
  ArrowRight,
  Settings,
  RefreshCw,
} from 'lucide-react';

interface AiHarnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const AiHarnessModal: React.FC<AiHarnessModalProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const { activeProject, steps, aiConfig, setAiConfig, applyAiWrittenContent } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<{
    projectTitle?: string;
    steps: StepUpdateItem[];
    supplementedCount?: number;
  } | null>(null);

  const [progressStatus, setProgressStatus] = useState<{ current: number; total: number; message: string } | null>(null);

  // Quick inline API Key state if empty
  const [inlineKey, setInlineKey] = useState(aiConfig.apiKey);
  const [inlineProvider, setInlineProvider] = useState<AiProvider>(aiConfig.provider);

  if (!isOpen || !activeProject) return null;

  const currentProviderInfo = AI_PROVIDER_DEFAULTS[inlineProvider] || AI_PROVIDER_DEFAULTS.openai;
  const hasKey = Boolean(aiConfig.apiKey.trim() || inlineKey.trim());

  const handleSaveInlineCredentials = () => {
    setAiConfig({
      provider: inlineProvider,
      apiKey: inlineKey.trim(),
      model: aiConfig.model || currentProviderInfo.defaultModel,
    });
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setGeneratedResults(null);
    setProgressStatus({
      current: 0,
      total: steps.length,
      message: `Analyzing ${steps.length} recorded steps...`,
    });

    // Save inline key if changed
    if (inlineKey.trim() !== aiConfig.apiKey) {
      handleSaveInlineCredentials();
    }

    const effectiveConfig = {
      ...aiConfig,
      provider: inlineProvider,
      apiKey: inlineKey.trim() || aiConfig.apiKey,
      model: aiConfig.model || currentProviderInfo.defaultModel,
    };

    try {
      const results = await autoWriteGuideContent(
        steps,
        effectiveConfig,
        {
          title: activeProject.title,
          description: activeProject.description,
        },
        (current, total, message) => {
          setProgressStatus({ current, total, message });
        }
      );

      if (!results.steps || results.steps.length === 0) {
        throw new Error('AI did not return any step instructions.');
      }

      setGeneratedResults(results);
    } catch (err: any) {
      console.error('AI Generation error:', err);
      setErrorMsg(err.message || 'Failed to generate content with AI.');
    } finally {
      setIsLoading(false);
      setProgressStatus(null);
    }
  };

  const handleApply = async () => {
    if (!generatedResults) return;
    await applyAiWrittenContent(generatedResults.steps, generatedResults.projectTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Content Harness Agent</h3>
              <p className="text-[11px] text-muted-foreground">
                Auto-generate professional procedural SOP titles and rich instructions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key & Provider Status */}
          {!hasKey ? (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                <Key className="w-4 h-4" />
                BYOK (Bring Your Own Key) Required
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your AI provider API key below. Keys are stored safely in local storage and never transmitted except directly to the AI provider.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Provider</label>
                  <select
                    value={inlineProvider}
                    onChange={(e) => {
                      const p = e.target.value as AiProvider;
                      setInlineProvider(p);
                      setAiConfig({ provider: p, model: AI_PROVIDER_DEFAULTS[p].defaultModel });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs mt-1"
                  >
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                    <option value="anthropic">Anthropic Claude (Haiku / Sonnet)</option>
                    <option value="custom">Custom / Ollama / OpenRouter</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={inlineKey}
                    onChange={(e) => setInlineKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs mt-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {currentProviderInfo.name}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                      {aiConfig.model || currentProviderInfo.defaultModel}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Ready to process {steps.length} captured steps
                  </div>
                </div>
              </div>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Live Progress Bar when generating */}
          {isLoading && progressStatus && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progressStatus.message}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {Math.round((progressStatus.current / (progressStatus.total || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.max(8, Math.min(100, Math.round((progressStatus.current / (progressStatus.total || 1)) * 100)))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Preview */}
          {generatedResults && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Generated Content for {generatedResults.steps.length} Steps
                </span>
                <div className="flex items-center gap-2">
                  {generatedResults.supplementedCount && generatedResults.supplementedCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                      {generatedResults.supplementedCount} from metadata
                    </span>
                  )}
                  {generatedResults.projectTitle && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                      New Title: <strong>{generatedResults.projectTitle}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {generatedResults.steps.map((item, idx) => {
                  const originalStep = steps.find((s) => s.id === item.id) || steps[idx];
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-card/60 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span>Step {idx + 1}</span>
                        <span className="line-through truncate max-w-[200px]">{originalStep?.title}</span>
                      </div>
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                        {item.title}
                      </div>
                      <div
                        className="text-[11px] text-muted-foreground pl-4 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.richInstructions }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {generatedResults ? (
              <>
                <button
                  disabled={isLoading}
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Apply to Guide
                </button>
              </>
            ) : (
              <button
                disabled={isLoading || !hasKey}
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Writing Procedural Content...
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    Auto-Write Guide Content
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
