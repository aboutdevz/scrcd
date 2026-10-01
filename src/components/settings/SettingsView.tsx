import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { testAiConnection, AI_PROVIDER_DEFAULTS } from '@/services/aiHarness';
import { AiProvider } from '@/types';
import {
  Palette,
  ShieldCheck,
  HardDrive,
  Check,
  Bot,
  Key,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { branding, updateBranding, aiConfig, setAiConfig, categories, addCategory, deleteCategory } = useStore();

  const [companyName, setCompanyName] = useState(branding.companyName);
  const [author, setAuthor] = useState(branding.author);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [footerText, setFooterText] = useState(branding.footerText);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [saved, setSaved] = useState(false);

  // Category management
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  const handleAddCategory = async () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatError('Category already exists');
      return;
    }
    setCatError(null);
    await addCategory(trimmed);
    setNewCatInput('');
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (categories.length <= 1) {
      setCatError('At least one category is required');
      return;
    }
    setCatError(null);
    await deleteCategory(catToDelete);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Quality settings
  const [webpQuality, setWebpQuality] = useState(85);
  const [losslessPng, setLosslessPng] = useState(false);

  // AI BYOK settings
  const [aiProvider, setAiProvider] = useState<AiProvider>(aiConfig.provider);
  const [aiApiKey, setAiApiKey] = useState(aiConfig.apiKey);
  const [aiModel, setAiModel] = useState(aiConfig.model || AI_PROVIDER_DEFAULTS[aiConfig.provider].defaultModel);
  const [aiCustomBaseUrl, setAiCustomBaseUrl] = useState(aiConfig.customBaseUrl || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleProviderChange = (p: AiProvider) => {
    setAiProvider(p);
    const defaults = AI_PROVIDER_DEFAULTS[p];
    setAiModel(defaults.defaultModel);
    if (p === 'custom' && !aiCustomBaseUrl) {
      setAiCustomBaseUrl('http://localhost:11434/v1');
    }
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    setTestResult(null);

    const result = await testAiConnection({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel.trim(),
      customBaseUrl: aiCustomBaseUrl.trim() || undefined,
    });

    setTestResult(result);
    setIsTestingAi(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      companyName,
      author,
      accentColor,
      footerText,
      logoUrl: logoUrl.trim() || undefined,
    });

    setAiConfig({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel.trim(),
      customBaseUrl: aiCustomBaseUrl.trim() || undefined,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Application Settings</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure global document branding, AI content harness agent (BYOK), and screenshot storage options.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: AI Harness Agent (BYOK) */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">AI Harness Agent (BYOK)</h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Bring Your Own Key
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Provide your API credentials to enable on-demand automatic generation of step titles, descriptions, and rich instructions. Keys are stored locally on your device and are never shared.
            </p>

            <div className="space-y-4">
              {/* Provider Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">AI Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['openai', 'gemini', 'anthropic', 'custom'] as AiProvider[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => handleProviderChange(prov)}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                        aiProvider === prov
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                          : 'border-border bg-secondary/40 hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      {AI_PROVIDER_DEFAULTS[prov].name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">API Key</label>
                  <span className="text-[11px] text-muted-foreground">
                    {aiProvider === 'custom' ? 'Optional for local models' : 'Required'}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={
                      aiProvider === 'openai'
                        ? 'sk-...'
                        : aiProvider === 'gemini'
                        ? 'AIzaSy...'
                        : aiProvider === 'anthropic'
                        ? 'sk-ant-...'
                        : 'API Key (leave blank for local Ollama)'
                    }
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground"
                    title={showApiKey ? 'Hide Key' : 'Show Key'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Model & Custom URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Model Identifier</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={AI_PROVIDER_DEFAULTS[aiProvider].defaultModel}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Base URL {aiProvider !== 'custom' && '(Optional Override)'}
                  </label>
                  <input
                    type="text"
                    value={aiCustomBaseUrl}
                    onChange={(e) => setAiCustomBaseUrl(e.target.value)}
                    placeholder={AI_PROVIDER_DEFAULTS[aiProvider].endpoint}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Test Connection Row */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isTestingAi}
                  onClick={handleTestAi}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                >
                  {isTestingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing Endpoint...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      Test Connection
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`text-xs flex items-center gap-1.5 animate-in fade-in ${
                      testResult.success ? 'text-emerald-500 font-semibold' : 'text-red-500'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Global Branding */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Global Documentation Branding</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Default Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Company / Organization</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{accentColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Footer Disclaimer</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Logo Configuration */}
            <div className="space-y-2 pt-3 border-t border-border">
              <label className="text-xs font-semibold text-muted-foreground">Brand Logo</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Brand Logo Preview"
                      className="h-12 w-auto max-w-[140px] object-contain rounded border border-border p-1 bg-secondary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                      title="Remove Logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 w-24 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground bg-secondary/20">
                    No Logo
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Or enter logo URL (https://... or data:...)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Category Management */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Guide Categories</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Define the categories available when organizing and filtering your standard operating procedures.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => {
                  setNewCatInput(e.target.value);
                  if (catError) setCatError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="New category name..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatInput.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            {catError && <p className="text-xs text-red-500 font-medium">{catError}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/70 border border-border text-xs font-medium text-foreground"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-0.5 rounded text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors"
                    title={`Delete category ${cat}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Capture Quality */}
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HardDrive className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Screenshot Quality & Optimization</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">WebP Compression Quality</span>
                  <span className="font-mono text-muted-foreground">{webpQuality}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={webpQuality}
                  onChange={(e) => setWebpQuality(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-xs font-semibold">Use Lossless PNG Format</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Saves uncompressed PNG files at the expense of larger disk usage
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={losslessPng}
                  onChange={(e) => setLosslessPng(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Privacy & Environment */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Local Environment</h3>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between py-1">
                <span>Database Engine:</span>
                <span className="font-mono text-foreground">SQLite / Local Storage</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span>Runtime:</span>
                <span className="text-foreground">Desktop Application (SCRCD)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {saved && (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  Settings Saved Successfully
                </span>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
