import React, { useState, useEffect, useRef } from 'react';
import { ScreenState } from '../App';
import { SaveTemplate, UpdateTemplate, DeleteTemplate, ExportFile } from '../../wailsjs/go/main/App';
import { template } from '../../wailsjs/go/models';
import { transformValue } from "./utils/previewMapper";
import { MappingRuleEditor } from './components/MappingRuleEditor';
import { SingleRuleEditor } from './components/SingleRuleEditor';
import { DEFAULT_PARAMS, RULE_TYPE_LABELS } from './constants/rules';


interface Props {
  // 既存実行のときだけ渡される
  templateId?: number;
  savedTemplateName?: string;
  savedMappings?: template.MappingInput[];
  
  fromConfig: template.FromConfig;
  toHeaders: template.ColumnInfo[];
  onNavigate: (screen: ScreenState, data?: any) => void;
}

export default function MappingScreen({ fromConfig, toHeaders, templateId, savedTemplateName, savedMappings, onNavigate }: Props) {
  if (!fromConfig) {
    return <div>設定が完了していません。セットアップ画面に戻ってください。</div>;
  }
  // マッピングの状態管理
  const [mappings, setMappings] = useState<template.MappingInput[]>(() => {
    if (savedMappings && savedMappings.length > 0) {
      console.log("Loaded saved mappings:", savedMappings);
      return savedMappings;
    }

    // 新規作成の場合は空の枠を作る
    return toHeaders.map(h => { 
      const m = new template.MappingInput();
      m.toField = h; 
      m.fromFields = []; 
      m.type = 'equal';
      m.constantValue = '';
      m.transformRules = [];
      return m;
    })
  });

  // ドラッグ中の項目を保持
  const [draggingItem, setDraggingItem] = useState<template.ColumnInfo | null>(null);

  // 欠落フィールドを保持
  const [missingFields, setMissingFields] = useState<Set<string>>(new Set());

  // 初期化時に欠落フィールドを検出
  useEffect(() => {
    if (savedMappings && savedMappings.length > 0) {
      const missing = new Set<string>();
      // 不可視文字（BOMなど）を消すための正規表現
      const clean = (str: string) => str.replace(/^\ufeff/, '').trim();

      savedMappings.forEach(mapping => {
        mapping.fromFields.forEach(field => {
          // 名前とインデックスの両方が一致するものが fromConfig.headers にあるかチェック
          const exists = fromConfig.headers.some(
            header => clean(header.name) === clean(field.name) && header.index === field.index
          );

          if (!exists) {
            missing.add(`${field.index + 1}列目: ${field.name}`);
          }
        });
      });
      setMissingFields(missing);
    }
  }, []);

  // ドロワーの状態管理
  const [drawerState, setDrawerState] = useState<{ isOpen: boolean; mappingIndex: number | null }>({ isOpen: false, mappingIndex: null });

  // マッピングの更新
  const updateMapping = (
    index: number, 
    updates: Partial<Omit<template.MappingInput, 'transformRules'>> & { transformRules?: any[] }  // 一度transformRulesを抜いて、any[]で受ける
  ) => {
    setMappings(prev => {
      const newMappings = [...prev];
      const target = newMappings[index];
      
      // 新しいインスタンスを生成するのではなく、既存のインスタンスに値をコピーする
      // これにより、convertValues などのメソッドを保持したまま値を更新できる
      Object.assign(target, updates);
      console.log(`マッピング情報：`, target);
      
      return newMappings;
    });
  };

  // ドロワーを開く
  const openDrawer = (index: number) => {
    setDrawerState({ isOpen: true, mappingIndex: index });
  };

  // ドロワーを閉じる
  const closeDrawer = () => {
    setDrawerState({ isOpen: false, mappingIndex: null });
  };

  // ドロップ時の処理
  const handleDrop = (index: number) => {
    if (draggingItem) {
      // 重複チェック: 名前とインデックスの両方が一致するものが既にないか確認
      const isAlreadyAdded = mappings[index].fromFields.some(
        f => f.name === draggingItem.name && f.index === draggingItem.index
      );

      if (!isAlreadyAdded) {
        const newFields = [...mappings[index].fromFields, draggingItem];
        updateMapping(index, { fromFields: newFields });
      }
    }
    setDraggingItem(null);
  };

  // チップの削除
  const removeField = (mappingIndex: number, targetField: template.ColumnInfo) => {
    // インデックスまで含めて一致しないものを残す（＝一致するものだけを消す）
    const newFields = mappings[mappingIndex].fromFields.filter(
      f => !(f.name === targetField.name && f.index === targetField.index)
    );
    updateMapping(mappingIndex, { fromFields: newFields });
  };

  // テンプレート名の状態管理
  const [templateName, setTemplateName] = useState<string>(savedTemplateName || '');

  // テンプレート保存の処理
  // テンプレート名が未入力、または欠落フィールド（赤いチップ）が残っている場合は保存不可
  const isSaveDisabled = !templateName.trim() || missingFields.size > 0;
  const isExportDisabled = missingFields.size > 0;

  const handleSaveTemplate = async () => {
    if (isSaveDisabled) return;
    if (!templateName.trim()) {
      alert('テンプレート名を入力してください');
      return;
    }
    console.log('保存するテンプレート:', { name: templateName, mappings });
    
    try {
      if (templateId) {
        await UpdateTemplate(templateId, templateName, fromConfig, mappings);
        alert('テンプレートを更新しました');
      } else {
        await SaveTemplate(templateName, fromConfig , mappings);
        alert('テンプレートが保存されました');
      }
    } catch (error: any) {
      console.error('テンプレートの保存に失敗:', error);
      const errorMessage = error.message || String(error);
      alert(`テンプレートの保存に失敗しました:\n ${errorMessage}`);
    }
  }

  // テンプレートを削除
  const handleDeleteTemplate = async () => {
    if (!templateId) return;

    // 誤操作防止の確認
    const ok = window.confirm(`テンプレート「${templateName}」を削除してもよろしいですか？\nこの操作は取り消せません。`);
    if (!ok) return;

    try {
      await DeleteTemplate(templateId);
      alert('テンプレートを削除しました');
      onNavigate('home'); // 削除後はホームに戻る
    } catch (error: any) {
      alert(`削除に失敗しました: ${error}`);
    }
  };

  // プレビューの値を取得する関数
  const getPreviewValue = (rawRow: string[], mapping: template.MappingInput) => {
    try {
      // 1. ソースとなる値を抽出
      // field は { name: string, index: number } のオブジェクト
      const sourceValues = mapping.fromFields.map(field => {
        const colIdx = field.index;

        // インデックスが範囲内にあるか念のためチェック
        if (colIdx >= 0 && colIdx < rawRow.length) {
          return rawRow[colIdx];
        }
        return "";
      });

      // 2. 外部関数で変換
      return transformValue(sourceValues, mapping);
      
    } catch (e) {
      console.error("Preview Error:", e);
      return "Error";
    }
  };


  // メニューの開閉状態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // メニュー全体を指し示すための参照（外側クリック判定用）
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // menuRef（ボタン＋メニュー全体）の外側をクリックしたか判定
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // イベントリスナーを登録
    document.addEventListener('mousedown', handleClickOutside);
    
    // コンポーネントが消える時にリスナーも削除（メモリリーク防止）
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 出力
  const handleExport = async (format: 'excel' | 'csv') => {
    if (isExportDisabled) return;
    setIsMenuOpen(false);

    try {
      await ExportFile(format, fromConfig, mappings);
      // alert('ファイルの出力が完了しました');
    } catch (error: any) {
      console.error('ファイルの出力に失敗:', error);
      const errorMessage = error.message || String(error);
      alert(`ファイルの出力に失敗しました:\n ${errorMessage}`);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500">
      {/* WARNING BANNER */}
      {missingFields.size > 0 && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3">
          <span className="text-rose-600 text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-rose-800 font-semibold text-sm">
              {missingFields.size}個のフィールドが現在のファイルに見つかりません
            </p>
            <p className="text-rose-700 text-xs mt-1">
              以下のフィールドはテンプレートの構成に含まれていますが、今回読み込んだファイルには存在しません: <span className="font-mono">{Array.from(missingFields).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-wrap justify-between gap-6 pb-6">
        <div className="flex-1 min-w-75">
          <h2 className="text-2xl font-bold text-slate-800">ステップ3: 項目マッピング</h2>
          <p className="text-slate-500 text-sm">左の項目をテーブルのドロップゾーンにドラッグしてください</p>
        </div>

        <button 
          onClick={() => onNavigate('setup', { templateId: templateId })} 
          className="px-4 py-2 text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer">
            戻る
        </button>

        <div className="flex flex-wrap gap-6 ml-auto">
          <div className="flex items-center gap-2 mb-1">

            {templateId && (
              <button 
                onClick={handleDeleteTemplate}
                className="px-3 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
                テンプレートを削除
              </button>
              // <button 
              //   onClick={handleDeleteTemplate}
              //   className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-all text-sm font-medium group"
              // >
              //   {/* ゴミ箱アイコン（SVG） */}
              //   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              //   </svg>
              //   <span>テンプレートを削除</span>
              // </button>
            )}
          
          <div className="flex flex-col w-44">
            <input 
              type="text" 
              placeholder="テンプレート名を入力" 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className={`border-b outline-none px-2 py-1 text-sm transition-colors bg-transparent ${
                isSaveDisabled && templateName.length === 0 ? "border-rose-300" : "border-slate-300 focus:border-blue-500"
              }`}
            />
            <span className="text-[10px] text-slate-400 mt-1">保存すると次回から設定を呼び出せます</span>
          </div>

          <div className="flex items-center gap-3">
              <button 
                onClick={handleSaveTemplate}
                disabled={isSaveDisabled}
                className={`h-10 px-6 py-2 font-bold rounded-lg shadow-md transition-all whitespace-nowrap ${
                  isSaveDisabled 
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                }`}
              >
                  {templateId ? "上書き保存" :"テンプレートとして保存"}
              </button>
              
              <div className="h-10 relative inline-flex shadow-md rounded-lg" ref={menuRef}>
                <button 
                  onClick={() => {handleExport('csv')}}
                  disabled={isExportDisabled}
                  className={`px-8 py-2 font-bold rounded-l-lg shadow-md transition-all border-r border-white/20 whitespace-nowrap ${
                    isExportDisabled 
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                  }`}
                >
                  出力
                </button>

                {/* プルダウン矢印ボタン */}
                <button
                  onClick={() => !isExportDisabled && setIsMenuOpen(!isMenuOpen)}
                  disabled={isExportDisabled}
                  className={`px-3 py-2 rounded-r-lg transition-all ${
                    isExportDisabled 
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
                  }`}
                >
                  <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ドロップダウンメニュー：クリック時に直接引数を渡して実行 */}
                {isMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 w-44 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-widest border-b border-slate-100">
                      形式を選択
                    </div>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100"
                    >
                      Excel形式 (.xlsx)
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      CSV形式 (.csv)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        {/* SIDEBAR: From Items */}
        <div className="w-64 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">利用可能なFrom項目</h4>
          <div className="space-y-2">
            {fromConfig.headers.map((header) => (
              <div
                key={`${header.name}-${header.index}`}
                draggable
                onDragStart={() => setDraggingItem(header)}
                className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl cursor-grab active:cursor-grabbing hover:bg-blue-100 transition-colors text-sm font-medium shadow-sm"
              >
                {header.name}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN: Mapping Table */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  <th className="p-3 text-sm font-bold text-slate-600 w-[25%]">出力項目 (To)</th>
                  <th className="p-3 text-sm font-bold text-slate-600 w-[35%]">マッピング項目(From)</th>
                  <th className="p-3 text-sm font-bold text-slate-600 w-[40%]">変換設定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((m, idx) => (
                  <tr key={`${m.toField.name}-${m.toField.index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-700 text-sm">{m.toField.name}</td>
                    <td className="p-3">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(idx)}
                        className={`min-h-12 p-2 border-2 border-dashed rounded-xl flex flex-wrap gap-2 items-center transition-all ${
                          draggingItem ? "border-blue-400 bg-blue-50/50 scale-[1.01]" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        {m.fromFields.length === 0 && !draggingItem && <span className="text-slate-400 text-xs ml-2">項目をドロップ</span>}
                        {m.fromFields.map(field => (
                          <div 
                            key={`${field.name}-${field.index}`}
                            className={`text-white px-3 py-1 rounded-full text-xs flex items-center shadow-sm ${
                              missingFields.has(`${field.index + 1}列目: ${field.name}`) 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            {field.name}
                            <button onClick={() => removeField(idx, field)} className="ml-2 hover:text-white font-bold">×</button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm align-top">
                      {/* 単一ステップのときはセレクトボックス+設定フィールド、複数ステップのときはドロワー */}
                      {(!m.transformRules || m.transformRules.length <= 1) && m.type !== 'pipeline' ? (
                        <div className="flex">
                          <div className="flex flex-col w-full">
                            <div className="relative w-full flex items-stretch">
                              <select 
                                value={m.type || 'equal'}
                                onChange={(e) => {
                                  const nextType = e.target.value;
                                  const initialParams = DEFAULT_PARAMS[nextType] ? { ...DEFAULT_PARAMS[nextType] } : {};
                                  
                                  updateMapping(idx, { 
                                    type: nextType as any, 
                                    transformRules: nextType === 'equal' ? [] : [{
                                      type: nextType,
                                      params: initialParams
                                    }],
                                    constantValue: nextType === 'const' ? m.constantValue : ''
                                  });
                                }}
                                className="flex-1 bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm cursor-pointer"
                              >
                                <option value="equal"> </option>
                                <option value="const">固定値</option>
                                <option value="join">結合</option>
                                <option value="split">分割</option>
                                <option value="padding">文字埋め</option>
                                <option value="date">日付変換</option>
                                <option value="convert">半角⇔全角</option>
                                <option value="prefix">接頭辞</option>
                                <option value="replace">置換</option>
                                <option value="slice">切り出し</option>
                              </select>
                            </div>

                            {/* 単一ステップの設定フィールド  */}
                            <div className="w-full">
                              <SingleRuleEditor
                                mapping={m}
                                onUpdate={(updates) => updateMapping(idx, updates)}
                              />
                            </div>
                          </div>
                          <div className="flex items-center w-1/7">
                            <button 
                              onClick={() => openDrawer(idx)}
                              className="px-3 flex items-center justify-centerborder text-slate-500 shrink-0 group cursor-pointer"
                              title="複数ステップの設定"
                            >
                              <span className="text-blue-500 font-bold mr-1">+</span>
                              <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600">追加</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 複数ステップのときはドロワー開くボタン
                        <button 
                          onClick={() => openDrawer(idx)}
                          className="flex items-center w-full min-h-12 gap-2 px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all cursor-pointer group"
                        >
                          <div className="flex gap-1 items-center justify-between w-full">
                            {m.transformRules && m.transformRules.length > 1 ? (
                              <>
                                <div className="flex gap-1 items-center flex-wrap">
                                {m.transformRules.map((rule, rIdx) => (
                                  <React.Fragment key={rIdx}>
                                    {/* ステップのタイプを表示 */}
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-semibold">
                                      {RULE_TYPE_LABELS[rule.type] || rule.type}
                                    </span>

                                     {/* 最後の要素以外に矢印を表示 */}
                                    {rIdx < m.transformRules.length - 1 && (
                                      <span className="text-slate-300 text-xs">›</span>
                                    )}
                                  </React.Fragment>
                                ))}
                                </div>
                                
                                <span className="text-blue-500 text-xs font-bold whitespace-nowrap">設定変更</span>
                              </>
                            ) : (
                              <span className="text-slate-400 text-sm">設定を追加</span>
                            )}
                          </div>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ドロワーのオーバーレイ */}
      {drawerState.isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {/* 変換設定ドロワー */}
      {drawerState.mappingIndex !== null && (
        <MappingRuleEditor 
          mapping={mappings[drawerState.mappingIndex]} 
          onUpdate={(updates) => updateMapping(drawerState.mappingIndex!, updates)}
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
        />
      )}

      {/* PREVIEW AREA */}
      <div className="min-h-35 max-h-50 bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800 mt-5">
        <div className="px-4 py-1 bg-slate-800 flex justify-between items-center">
          <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">変換プレビュー (先頭3行)</h4>
          <span className="text-[10px] text-slate-300 italic">設定変更がリアルタイムに反映されます</span>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-800 shadow-sm">
              <tr>
                {mappings.map(m => (
                  <th key={`${m.toField.name}-${m.toField.index}`} className="p-1 text-[11px] font-bold text-slate-300 border-r border-slate-700 min-w-30">
                    {m.toField.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {fromConfig.previewRows?.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-600/50 transition-colors">
                  {mappings.map((m, colIdx) => (
                    <td 
                      key={`${m.toField.name}-${m.toField.index}-${rowIdx}`} 
                      className="h-7.5 p-1 text-sm text-blue-300 border-b border-r border-b-slate-500 border-r-slate-700 font-mono"
                    >
                      {getPreviewValue(row, m)}
                    </td>
                  ))}
                </tr>
              ))}
              {(!fromConfig.previewRows || fromConfig.previewRows.length === 0) && (
                  <tr>
                    <td colSpan={mappings.length} className="p-10 text-center text-slate-500 text-sm">
                      プレビューデータがありません。ファイルを再読み込みしてください。
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}