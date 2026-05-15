import { template } from '../../../wailsjs/go/models';
import { useState } from 'react';
import { DEFAULT_PARAMS } from '../constants/rules';


// ステップ内の設定コンポーネント
const StepEditor = ({ 
  stepIndex, 
  type, 
  params, 
  onTypeChange, 
  onRuleChange,
  onRemove
}: {
  stepIndex: number;
  type: string;
  params: any;
  onTypeChange: (newType: string) => void;
  onRuleChange: (newParams: any) => void;
  onRemove: () => void;
}) => {
  return (
    <div className="relative pl-12 mb-6 last:mb-0">
      {/* ステップ番号 */}
      <div className="absolute left-0 top-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">
        {stepIndex + 1}
      </div>

      {/* ステップボックス */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase">処理タイプ</label>
          {stepIndex > 0 && (
            <button 
              onClick={onRemove}
              className="text-slate-300 hover:text-red-400 text-lg font-bold transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <select 
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 mb-2"
        >
          {/* <option value="equal">なし</option> */}
          {/* <option value="const">固定値</option> */}
          <option value="join">結合</option>
          <option value="split">分割</option>
          <option value="padding">文字埋め</option>
          <option value="date">日付変換</option>
          <option value="convert">半角⇔全角</option>
          <option value="prefix">接頭辞</option>
          <option value="replace">置換</option>
          <option value="slice">切り出し</option>
        </select>

        {/* 各タイプの設定フィールド */}
        {/* {type === 'const' && (
          <div>
            <input
              type="text"
              placeholder="固定値を入力"
              value={params?.constantValue || ''}
              onChange={(e) => onRuleChange({ ...params, constantValue: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
        )} */}

        {type === 'join' && (
          <div>
            <label className="text-[10px] text-slate-500 font-bold">区切り文字</label>
            <input 
              type="text" 
              placeholder=", やスペースなど" 
              value={params?.delimiter || ''}
              onChange={(e) => onRuleChange({ ...params, delimiter: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
        )}

        {type === 'date' && (
          <div>
            <label className="text-[10px] text-slate-500 font-bold">日付形式</label>
            <select
              value={params?.format || 'YYYY/MM/DD'}
              onChange={(e) => onRuleChange({ ...params, format: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            >
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="YYYYMMDD">YYYYMMDD</option>
            </select>
          </div>
        )}

        {type === 'split' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500 font-bold">区切り文字</label>
              <input 
                type="text" 
                placeholder=", やスペースなど" 
                value={params?.delimiter || ''}
                onChange={(e) => onRuleChange({ ...params, delimiter: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold">抽出位置</label>
              <input 
                type="number" 
                placeholder="1" 
                min="1"
                value={(params?.index ?? 0) + 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    onRuleChange({ ...params, index: val - 1 });
                  }
                }}
                className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>
          </div>
        )}

        {type === 'padding' && (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="1"
              placeholder="桁数"
              value={params?.length || ''}
              onChange={(e) => onRuleChange({ ...params, length: parseInt(e.target.value) || 0 })}
              className="w-16 border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
            <span className="text-xs text-slate-400">桁を</span>
            <input 
              type="text" 
              maxLength={1}
              placeholder="0"
              value={params?.padChar ?? '0'}
              onChange={(e) => onRuleChange({ ...params, padChar: e.target.value })}
              className="w-10 border border-slate-300 rounded-lg p-1.5 text-center outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
            <span className="text-xs text-slate-400">で埋める</span>
          </div>
        )}

        {type === 'convert' && (
          <div>
            <label className="text-[10px] text-slate-500 font-bold">変換方向</label>
            <select 
              value={params?.convertType || 'to_half'}
              onChange={(e) => onRuleChange({ ...params, convertType: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            >
              <option value="to_half">全角 → 半角</option>
              <option value="to_full">半角 → 全角</option>
            </select>
          </div>
        )}

        {type === 'prefix' && (
          <div>
            <label className="text-[10px] text-slate-500 font-bold">追加する接頭辞</label>
            <input 
              type="text" 
              placeholder="例: PR-"
              value={params?.prefix ?? ''}
              onChange={(e) => onRuleChange({ ...params, prefix: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
        )}

        {type === 'replace' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500 font-bold">置換前</label>
              <input 
                type="text" 
                value={params?.replaceOld ?? ''}
                onChange={(e) => onRuleChange({ ...params, replaceOld: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold">置換後</label>
              <input 
                type="text" 
                value={params?.replaceNew ?? ''}
                onChange={(e) => onRuleChange({ ...params, replaceNew: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
            </div>
          </div>
        )}

        {type === 'slice' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <label className="text-[10px] text-slate-500 font-bold">切出方向</label>
              <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                <input 
                  type="radio" 
                  checked={(params?.direction ?? 'forward') === 'forward'}
                  onChange={() => onRuleChange({ ...params, direction: 'forward' })}
                  className="w-3 h-3"
                />
                前方
              </label>
              <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                <input 
                  type="radio" 
                  checked={params?.direction === 'backward'}
                  onChange={() => onRuleChange({ ...params, direction: 'backward' })}
                  className="w-3 h-3"
                />
                後方
              </label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-bold">開始(byte)</label>
                <input 
                  type="number"
                  min="0"
                  value={params?.index ?? ''}
                  onChange={(e) => onRuleChange({ ...params, index: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-bold">長さ(byte)</label>
                <input 
                  type="number"
                  min="0"
                  value={params?.length ?? ''}
                  onChange={(e) => onRuleChange({ ...params, length: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ドロワーコンポーネント
export const MappingRuleEditor = ({ 
  mapping, 
  onUpdate, 
  isOpen,
  onClose
}: {
  mapping: template.MappingInput,
  onUpdate: (updates: Partial<template.MappingInput>) => void,
  isOpen: boolean,
  onClose: () => void
}) => {
  // transformRules は配列型。複数ステップをサポート
  const [steps, setSteps] = useState<template.TransformRule[]>(() => {
    // PropsをコピーしてStateを初期化（参照を切るためにスプレッド演算子を使用）
    return mapping.transformRules ? [...mapping.transformRules] : [];
  });

  // ステップを追加
  const addStep = () => {
    const newRule = {
      type: 'join',
      params: { ...DEFAULT_PARAMS['join'] }
    } as template.TransformRule;
    setSteps([...steps, newRule]);
  };

  // ステップを更新
  const updateStep = (index: number, updatedRule: template.TransformRule) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = updatedRule;
    setSteps(updatedSteps);
  };

  // ステップを削除
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // 確定処理
  const handleConfirm = () => {
    // transformRules は配列型で保存
    if (steps.length === 0) {
      onUpdate({ 
        type: 'equal', 
        transformRules: [] ,
        constantValue: ''
      });
    } else if (steps.length === 1) {
      onUpdate({ 
        type: steps[0].type, 
        transformRules: [steps[0]],
        constantValue: ''
      });
    } else {
      // 複数ステップはパイプラインとして保存
      onUpdate({ 
        type: 'pipeline',
        transformRules: [...steps],
        constantValue: ''
      });
    }
    onClose();
  };

  return (
    <>
      {/* ドロワー */}
      <div 
        className={`fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* ヘッダー */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">変換ステップ設定</h2>

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* リセット（ゴミ箱）ボタン */}
            <button 
              onClick={() => {
                // 確認なしで即座にリセットする場合
                onUpdate({ 
                  type: 'equal', 
                  transformRules: [] ,
                  constantValue: ''
                });
                onClose();
              }}
              className="group flex gap-1.5 px-2 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              title="設定をすべてクリアして単一ステップに戻す"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="group-hover:scale-110 transition-transform"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                {/* <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/> */}
              </svg>
              <span className="text-[10px] font-bold">リセット</span>
            </button>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 縦線の装飾用 */}
          {steps.length > 0 && (
            <div className="relative">
              {steps.map((step, idx) => (
                <StepEditor 
                  key={idx}
                  stepIndex={idx}
                  type={step.type}
                  params={step.params}
                  onTypeChange={(newType) => {
                    const newRule = {
                      type: newType,
                      params: DEFAULT_PARAMS[newType] || {}
                    } as template.TransformRule;
                    updateStep(idx, newRule);
                  }}
                  onRuleChange={(newParams) => {
                    const newRule = {
                      ...step,
                      params: newParams
                    } as template.TransformRule;
                    updateStep(idx, newRule);
                  }}
                  onRemove={() => removeStep(idx)}
                />
              ))}
            </div>
          )}

          {/* ステップ追加ボタン */}
          <button 
            onClick={addStep}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            + 処理ステップを追加
          </button>
        </div>

        {/* フッター */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button 
            onClick={handleConfirm}
            className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-slate-700 transition-all active:scale-95"
          >
            設定を確定する
          </button>
        </div>
      </div>
    </>
  );
};