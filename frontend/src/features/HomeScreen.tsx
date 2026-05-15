import { ScreenState } from '../App';
import { useState, useEffect, useMemo } from 'react';
import { GetTemplates } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

interface Props {
  onNavigate: (screen: ScreenState, data?: { templateId?: number; templateName?: string }) => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  const [templates, setTemplates] = useState<models.Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    GetTemplates().then(data => {
      setTemplates(data);
    }).catch(err => {
      console.error("Failed to fetch templates:", err);
      const errorMessage = err.message || err.toString();
      alert(`テンプレートの取得に失敗しました:\n${errorMessage}`);
    });
  }, []);

  const handleStart = () => {
    if (selectedId) {
      const selectedTemplate = templates.find(t => t.id === Number(selectedId));
      onNavigate('setup', { 
        templateId: Number(selectedId),
        templateName: selectedTemplate?.name 
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ステップ1: テンプレートの選択</h2>
            <p className="text-slate-500 text-sm">既存のテンプレートを選択、または新規テンプレートを作成してください</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-200 space-y-8">
        {/* テンプレート選択エリア */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-600 ml-1">
            テンプレートを選択
          </label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all appearance-none cursor-pointer text-lg"
            >
              <option value="" disabled>--- テンプレートを選択してください ---</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {/* カスタム矢印アイコン */}
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-1 gap-4 pt-4">
          <button
            disabled={!selectedId}
            onClick={handleStart}
            className={`py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                (selectedId)
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 cursor-pointer"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
          >
            変換を開始する
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-slate-400 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <button
            onClick={() => onNavigate('setup')}
            className="py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
          >
            + 新規テンプレートを作成
          </button>
        </div>
      </div>
    </div>
  );
}