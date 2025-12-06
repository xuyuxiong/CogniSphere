
import React from 'react';
import { Settings, ChevronDown, Check, Download, Upload, Trash2 } from 'lucide-react';
import { AppSettings, PromptTemplate, AIProvider } from '../types';
import { StorageService } from '../services/storageService';

interface SettingsModalProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  settingsTab: 'general' | 'prompts' | 'data';
  setSettingsTab: (tab: 'general' | 'prompts' | 'data') => void;
  templates: PromptTemplate[];
  setTemplates: (templates: PromptTemplate[]) => void;
  handleExportData: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  PROVIDERS: { id: AIProvider; name: string; defaultBaseUrl?: string; defaultModel: string }[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settingsOpen, setSettingsOpen, settings, setSettings, settingsTab, setSettingsTab,
  templates, setTemplates, handleExportData, handleImportData, PROVIDERS
}) => {
  if (!settingsOpen) return null;
    
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
         <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
           <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
             <Settings size={20} className="text-brand-600" /> 系统设置
           </h3>
           <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">✕</button>
         </div>
         
         <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => setSettingsTab('general')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'general' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>常规 & AI</button>
            <button onClick={() => setSettingsTab('prompts')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'prompts' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>提示词管理</button>
            <button onClick={() => setSettingsTab('data')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'data' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>数据备份</button>
         </div>

         <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
           
           {settingsTab === 'general' && (
             <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">用户名称</label>
                  <input 
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    value={settings.userName}
                    onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                  />
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700"></div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    AI 模型配置
                  </h4>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">服务提供商</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                        value={settings.aiConfig.provider}
                        onChange={(e) => {
                          const newProvider = e.target.value as AIProvider;
                          const providerDefaults = PROVIDERS.find(p => p.id === newProvider);
                          setSettings({
                            ...settings,
                            aiConfig: {
                              ...settings.aiConfig,
                              provider: newProvider,
                              baseUrl: providerDefaults?.defaultBaseUrl || '',
                              modelName: providerDefaults?.defaultModel || ''
                            }
                          });
                        }}
                      >
                        {PROVIDERS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        API Key <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="password"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                        value={settings.aiConfig.apiKey}
                        onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, apiKey: e.target.value } })}
                        placeholder="sk-..."
                      />
                    </div>

                    {settings.aiConfig.provider !== 'google' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Base URL</label>
                        <input 
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                          value={settings.aiConfig.baseUrl}
                          onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, baseUrl: e.target.value } })}
                          placeholder="https://api.example.com/v1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">模型名称</label>
                      <input 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-900 dark:text-white font-mono text-sm focus:border-brand-500 outline-none"
                        value={settings.aiConfig.modelName}
                        onChange={(e) => setSettings({ ...settings, aiConfig: { ...settings.aiConfig, modelName: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">启用语义搜索 & RAG</span>
                      <span className="text-xs text-gray-500">使用 Embedding 向量增强搜索和对话</span>
                    </div>
                    <button 
                        onClick={() => setSettings({ ...settings, useSemanticSearch: !settings.useSemanticSearch })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${settings.useSemanticSearch ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.useSemanticSearch ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
             </div>
           )}

           {settingsTab === 'prompts' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">自定义 AI 指令</h4>
                  <button 
                    onClick={() => {
                      const newId = Date.now().toString();
                      const newTemplate = { id: newId, name: '新指令', template: '{{content}}', description: '自定义' };
                      setTemplates([...templates, newTemplate]);
                      StorageService.saveTemplate(newTemplate);
                    }}
                    className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded hover:bg-brand-100"
                  >
                    + 添加指令
                  </button>
                </div>
                <div className="space-y-3">
                   {templates.map((t, idx) => (
                     <div key={t.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800/30">
                        <div className="flex gap-2 mb-2">
                          <input 
                            className="flex-1 p-1 text-sm font-bold bg-white dark:bg-slate-800 border rounded border-gray-300 dark:border-gray-600"
                            value={t.name}
                            onChange={(e) => {
                              const newT = { ...t, name: e.target.value };
                              const list = [...templates]; list[idx] = newT;
                              setTemplates(list);
                            }}
                          />
                          <button onClick={async () => {
                             const list = templates.filter(item => item.id !== t.id);
                             setTemplates(list);
                          }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                        </div>
                        <textarea 
                           className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-800 border rounded border-gray-300 dark:border-gray-600"
                           rows={3}
                           value={t.template}
                           onChange={(e) => {
                              const newT = { ...t, template: e.target.value };
                              const list = [...templates]; list[idx] = newT;
                              setTemplates(list);
                            }}
                        />
                        <div className="text-[10px] text-gray-400 mt-1">使用 {"{{content}}"} 作为当前笔记内容的占位符。</div>
                     </div>
                   ))}
                   <button onClick={() => {
                      templates.forEach(t => StorageService.saveTemplate(t));
                      alert("模板已保存");
                   }} className="w-full py-2 bg-brand-600 text-white rounded text-sm mt-2">保存所有模板更改</button>
                </div>
              </div>
           )}

           {settingsTab === 'data' && (
              <div className="space-y-6">
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2"><Download size={16}/> 数据导出 (备份)</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">将所有笔记、设置和模板导出为 JSON 文件。建议定期备份。</p>
                    <button onClick={handleExportData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">导出数据</button>
                 </div>
                 
                 <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2"><Upload size={16}/> 数据导入 (恢复)</h4>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">从 JSON 备份文件中恢复数据。注意：这将合并或覆盖现有数据。</p>
                    <label className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors cursor-pointer inline-block">
                      选择备份文件
                      <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                    </label>
                 </div>
              </div>
           )}

         </div>

         <div className="p-4 bg-gray-50 dark:bg-slate-800 flex justify-end border-t border-gray-200 dark:border-gray-700 shrink-0">
           <button 
             onClick={async () => {
               await StorageService.saveSettings(settings);
               setSettingsOpen(false);
             }}
             className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
           >
             <Check size={16} /> 保存并关闭
           </button>
         </div>
      </div>
    </div>
  );
};
