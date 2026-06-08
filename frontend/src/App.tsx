import { useState, useEffect } from 'react';
import HomeScreen from './features/HomeScreen';
import SetupScreen from './features/SetupScreen';
import MappingScreen from './features/MappingScreen';
import { template } from '../wailsjs/go/models';
import { GetVersion } from '../wailsjs/go/main/App';

// 画面名の型定義
export type ScreenState = 'home' | 'setup' | 'mapping';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('home');
  const [templateId, setTemplateId] = useState<number>();
  const [templateName, setTemplateName] = useState<string>();
  const [fromConfig, setFromConfig] = useState<template.FromConfig>();
  const [toHeaders, setToHeaders] = useState<template.ColumnInfo[]>([]);
  const [savedMappings, setSavedMappings] = useState<template.MappingInput[]>([]);
  const [version, setVersion] = useState('');

  useEffect(() => {
    GetVersion().then((v: string) => setVersion(v));
  }, []);

  const handleNavigate = (screen: ScreenState, data?: any) => {
    if (data) {
      // 送られてきたデータがあればステートを更新
      if (data.templateId !== undefined) setTemplateId(data.templateId);
      if (data.templateName !== undefined) setTemplateName(data.templateName);
      if (data.fromConfig) setFromConfig(data.fromConfig);
      if (data.toHeaders) setToHeaders(data.toHeaders);
      if (data.initialMappings !== undefined) setSavedMappings(data.initialMappings);
    } else if (screen === 'home' || (screen === 'setup' && !templateId)) {
      // 新規作成時やホームに戻る時はリセット
      setTemplateId(undefined);
      setSavedMappings([]);
      setTemplateName("");
    }
    setCurrentScreen(screen);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-[#1e293b] text-white px-8 py-4 flex justify-betweenitems-center shadow-lg border-b border-slate-700/50">
        <button
          onClick={() => setCurrentScreen('home')}
          className="group flex items-center gap-2 outline-none cursor-pointer"
        >
          <span className="text-2xl font-black tracking-tighter transition-transform group-hover:scale-105">
            <span className="text-sky-400 group-hover:text-sky-300">Toto</span>
            <span className="text-emerald-400 group-hover:text-emerald-300">nel</span>
          </span>
          {/* 控えめなドット装飾でマッピング感をプラス */}
          <div className="flex gap-1 ml-1 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          </div>
        </button>

        <span className="text-sm flex items-end font-medium px-1.5 py-0.5 mx-3 bg-slate-800 text-slate-400 rounded group-hover:text-slate-300 group-hover:border-slate-600 transition-colors">
          v{version}
        </span>
        {/* <div className="px-3 py-1 bg-slate-700/50 rounded-full text-sm uppercase tracking-wider">
          {currentScreen}
          </div> */}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {currentScreen === 'home' && (
          <HomeScreen onNavigate={handleNavigate} />
        )}
        {currentScreen === 'setup' && (
          <SetupScreen
            templateId={templateId}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'mapping' && (
          <MappingScreen
            templateId={templateId}
            savedTemplateName={templateName}
            fromConfig={fromConfig!}
            toHeaders={toHeaders}
            savedMappings={savedMappings}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}

export default App;