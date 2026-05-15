import { useState, useEffect } from 'react';
import { ScreenState } from '../App';
import { SelectFile, GetFileHeaders, GetTemplateByID } from "../../wailsjs/go/main/App";
import { template } from '../../wailsjs/go/models';
import { preview } from 'vite';

type FileInfo = {
  fromConfig: template.FromConfig;
  toHeaders: template.ColumnInfo[];
  initialMappings?: template.MappingInput[];
};

// To側で「解析」のために管理が必要な最小限のセット
type ToInitialState = {
  path: string;       // ファイルを読み込むために必要
  headerRow: number;  // 何行目を読むか指定するために必要
  headers: template.ColumnInfo[];  // 解析結果を表示するために必要
  delimiter: string;
  encoding: string;
};

interface Props {
  onNavigate: (screen: ScreenState, data?: FileInfo) => void;
  templateId?: number;
}


export default function SetupScreen({ onNavigate, templateId }: Props) {
  const isNewMode = !templateId;  // 新規作成はTrue、 既存続行はFalse

  const [fromConfig, setFromConfig] = useState<template.FromConfig>(
    new template.FromConfig({ 
      path: '', 
      headerRow: 1, 
      headers: [], 
      fileType: '',
      // sheetName: '' ,
      delimiter: ',',
      encoding: 'UTF-8',
      previewRows: [],
    })
  );
  // fromConfigを更新するための共通関数
  // (構造体が入れ子になっているものをGoから復元するとConvertValueが必要といわれてしまうため、
  // 　createFromを使って一旦オブジェクトに変換してからFromConfigクラスのインスタンスを作る)
  const updateFromConfig = (updates: Partial<template.FromConfig>) => {
    setFromConfig(prev => template.FromConfig.createFrom({ ...prev, ...updates }));
  };

  const [toConfig, setToConfig] = useState<ToInitialState>({ 
    path: '', 
    headerRow: 1, 
    headers: [], 
    delimiter: ',',
    encoding: 'UTF-8',
  });
  // テンプレートが期待するFrom列のリスト（比較用）
  const [expectedFromHeaders, setExpectedFromHeaders] = useState<template.ColumnInfo[]>([]);

  const [savedMappings, setSavedMappings] = useState<template.MappingInput[]>([]);

  // 既存モード時のデータ復元
  useEffect(() => {
    if (!isNewMode && templateId) {
      GetTemplateByID(templateId).then(tmpl => {
        // Fromの設定を復元（パス以外）
        updateFromConfig({
          fileType: tmpl.template_config.file_type,
          headerRow: tmpl.template_config.header_row_index,
          delimiter: tmpl.template_config.delimiter,
          encoding: tmpl.template_config.encoding,
        });

        // テンプレートが期待するFromのヘッダーはDBのMapping情報から復元
        const froms = tmpl.mappings.flatMap(m =>   // 配列を一次元にするためflatMapを使用
          m.sources.map(s => ({
            name: s.from_column_name,
            index: s.from_column_index
          }))
        );
        // 名前とインデックスの両方が一致するものだけをユニークにする
        const uniqueExpected = froms.filter((v, i, a) => 
          a.findIndex(t => t.index === v.index && t.name === v.name) === i
        );
        setExpectedFromHeaders(uniqueExpected); // 重複を削除してセット
        
        // ToのヘッダーはDBのMapping情報から復元
        const savedToHeaders = tmpl.mappings.map((m, index) => ({
          name: m.to_column_name,
          index: index
        }));
        setToConfig({
          path: 'DATABASE_TEMPLATE', // バリデーション回避用のダミー
          headerRow: 1,
          headers: savedToHeaders,
          delimiter: '',
          encoding: ''
        });

        // DBの Mapping モデルを MappingInput 形式に変換
        const initialMappings = tmpl.mappings.map(m => {
          const input = new template.MappingInput();
          input.toField = { name: m.to_column_name, index: m.to_column_index };
          input.fromFields = m.sources.map(s => ({name: s.from_column_name, index: s.from_column_index}));
          input.type = m.mapping_type;
          input.constantValue = m.constant_value;
          // 文字列として保存されているJSONをオブジェクトに変換
          try {
            if (m.transform_rules) {
              // Go側で `json:"transform_rule"` が string になっているため、
              // ここでパースしてオブジェクトにする
              const parsed = JSON.parse(m.transform_rules);
              // 配列になるように変換
              input.transformRules = Array.isArray(parsed) ? parsed : [parsed];
            } else {
              input.transformRules = [];
            }
          } catch (e) {
            console.error("TransformRuleのパースに失敗:", e);
            input.transformRules = [];
          }
          return input;
        })
        setSavedMappings(initialMappings);

      }).catch(err => {
        console.error("テンプレートの読み込みに失敗:", err);
        alert("テンプレートの読み込みに失敗しました");
        onNavigate('home');
      });
    }
  }, [templateId]);

  // 名前とインデックスのペアが一致しないカラムを特定する
  const getMissingColumns = () => {
    if (isNewMode || fromConfig.headers.length === 0) return [];
    // 不可視文字（BOMなど）を消すための正規表現
    const clean = (str: string) => str.replace(/^\ufeff/, '').trim();

    // DBに保存されている「あるべき列」をベースにループを回す
    return expectedFromHeaders.filter(expected => {
      //  読み込んだデータの「同じインデックス」にある列を探す
      const actual = fromConfig.headers.find(a => a.index === expected.index);

      // 実際の列が存在しない、または名前が一致しない場合は「エラー」として残す
      if (!actual) {
        return true; // 列そのものが存在しない
      }
      if (clean(actual.name) !== clean(expected.name)) {
        return true; // 列はあるけど名前が違う
      }

      return false; // 一致していればエラーリストには入れない
    }).sort((a, b) => a.index - b.index); // インデックス順に並べる
  };
  const missingCols = getMissingColumns();

  // ヘッダー解析
  const refreshHeaders = async (type: 'from' | 'to', configOverride?: any) => {
    const config = configOverride || (type === 'from' ? fromConfig : toConfig);
    if (!config.path) return;

    try {
      const result = await GetFileHeaders(
        config.path, 
        config.headerRow,
        config.delimiter,
        config.encoding,
      );
      if (type === 'from') {
        updateFromConfig({
          headers: result.headers,
          // sheetName: result.sheetName,
          delimiter: result.delimiter,
          encoding: result.encoding,
          previewRows: result.previewRows,
        });
      } else {
        setToConfig(prev => ({ 
          ...prev, 
          headers: result.headers,
          delimiter: result.delimiter,
          encoding: result.encoding,
        }));
      }
    } catch (err) {
      console.error(`${type}解析エラー:`, err);

      // 1. ColumnInfo 型に合わせたエラー用オブジェクトを作成
      const errorHeader = [{
        name: `エラー: ${err || '読み込みに失敗しました'}`,
        index: -1 // エラーであることの目印
      }];

      // エラーメッセージをPREVIEWに表示
      if (type === 'from') {
        updateFromConfig({
          headers: errorHeader,
          previewRows: [] // プレビューもクリア
        });
      } else {
        setToConfig(prev => ({ ...prev, headers: errorHeader }));
      }
    }
  };

  // ファイルパスか開始行が変わるたびに再読み込み
  useEffect(() => { refreshHeaders('from'); }, [fromConfig.path, fromConfig.headerRow, fromConfig.delimiter, fromConfig.encoding]);
  useEffect(() => { 
    // 既存モードの時はTo側の解析不要
    if (!isNewMode) return;

    refreshHeaders('to');
  }, [toConfig.path, toConfig.headerRow, toConfig.delimiter, toConfig.encoding]);

  // ファイル選択ダイアログを開く
  const handleSelectFile = async (type: 'from' | 'to') => {
    try {
      // 2. Go の関数を呼び出す
      const title = type === 'from' ? '取込元ファイルを選択' : '出力先ファイルを選択';

      let filter = "*.xlsx;*.csv";
      if (!isNewMode && type === 'from' && fromConfig.fileType) {
        // DBから復元した fileType を使う
        filter = fromConfig.fileType.toLowerCase() === "csv" ? "*.csv" : "*.xlsx;*.xls";
      }

      const result = await SelectFile(title, filter);

      if (result) {
        // 拡張子からファイルタイプを判定
        const lowerPath = result.toLowerCase();
        const detectedType = lowerPath.endsWith(".csv") ? "csv" : "excel";

        // ファイルタイプに応じた設定を決定
        let newDelimiter: string;
        let newEncoding: string;
        
        if (detectedType === 'csv') {
          // CSV用の設定を使用（ユーザー設定）
          newDelimiter = type === 'from' ? fromConfig.delimiter : toConfig.delimiter;
          newEncoding = type === 'from' ? fromConfig.encoding : toConfig.encoding;
        } else {
          // Excel用の設定を使用（Go側で決定される値なので、初期値を渡す）
          newDelimiter = '';
          newEncoding = 'Shift-JIS';
        }

        // パスが取得できたら反映
        const newConfig = {
          path: result,
          fileType: detectedType,
          headerRow: type === 'from' ? fromConfig.headerRow : toConfig.headerRow,
          delimiter: newDelimiter,
          encoding: newEncoding,
          headers: [{name: "(解析中...)", index: -1}],
        };

        if (type === 'from') {
          updateFromConfig({ ...newConfig, previewRows: [] }); // プレビューもリセット
          refreshHeaders('from', newConfig); // 新しい設定で即座に解析
        } else {
          setToConfig(prev => ({ ...prev, ...newConfig }));
          refreshHeaders('to', newConfig); // 新しい設定で即座に解析
        }
      }
    } catch (err) {
      console.error("ファイル選択エラー:", err);
    }
  };

  // プレビューの結果を判定するロジック
  const isConsistent = expectedFromHeaders.every(expected =>
      fromConfig.headers.some(actual =>
        actual.name === expected.name && actual.index === expected.index
      )
    );

  // プレビューの枠線を赤くする条件をわかりやすく変数に切り出す
  const isHeaderMismatch = !isNewMode && 
    fromConfig.path && 
    fromConfig.headers.length > 0 && 
    !expectedFromHeaders.every(expected =>
      fromConfig.headers.some(actual =>
        actual.name === expected.name && actual.index === expected.index
      )
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* HEADER AREA */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ステップ2: ヘッダー構造の定義</h2>
          {isNewMode ? (
            <p className="text-slate-500 text-sm">取込元(From)と出力先(To)のサンプルファイルを指定してください</p>
          ) : (
            <p className="text-slate-500 text-sm">取込元(From)のサンプルファイルを指定してください</p>
          )}
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
        >
          戻る
        </button>
      </div>

      {/* SETUP GRID */}
      <div className={`grid gap-8 ${
        isNewMode 
          ? "grid-cols-1 lg:grid-cols-2" // 新規：2列
          : "grid-cols-1 max-w-2xl mx-auto" // 既存：1列で中央寄せ
      }`}>

        {/* FROM CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
            <h3 className="text-lg font-bold text-slate-700">From (取込元サンプル)</h3>
          </div>

          {/* ファイル選択 */}
          <button 
            onClick={() => handleSelectFile('from')}
            className={`w-full group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
              fromConfig.path 
                ? "border-blue-500 bg-blue-50/30" 
                : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-2 rounded-lg ${fromConfig.path ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left overflow-hidden">
                <p className={`text-sm font-bold ${fromConfig.path ? "text-blue-700" : "text-slate-600"}`}>
                  {fromConfig.path ? "ファイルを変更する" : "ファイルを選択"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {fromConfig.path 
                    ? fromConfig.path 
                    : isNewMode 
                      ? "クリックしてExcelまたはCSVを開く" 
                      : fromConfig.fileType?.toLowerCase() === 'csv'
                        ? "クリックしてCSVファイルを選択（テンプレート形式: CSV）"
                        : "クリックしてExcelファイルを選択（テンプレート形式: Excel）"
                  }
                </p>
              </div>
            </div>
            <div className={`ml-2 transition-transform group-hover:translate-x-1 ${fromConfig.path ? "text-blue-500" : "text-slate-300"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* オプション設定 */}
          <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span>ヘッダー開始行:</span>
              <input
                type="number"
                min="1"
                value={fromConfig.headerRow}
                onChange={(e) => updateFromConfig({ headerRow: parseInt(e.target.value) || 1 })}
                className="w-16 p-1 border border-slate-300 rounded text-center bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {(fromConfig.fileType?.toLowerCase() === 'csv' || isNewMode) && (
              <>
              <div className="flex items-center gap-2">
                <span>文字コード:</span>
                <select
                  value={fromConfig.encoding}
                  onChange={(e) => updateFromConfig({ encoding: e.target.value })}
                  className="p-1 border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="UTF-8">UTF-8</option>
                  <option value="Shift-JIS">Shift-JIS</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>区切り:</span>
                <select
                  value={fromConfig.delimiter}
                  onChange={(e) => updateFromConfig({ delimiter: e.target.value })}
                  className="p-1 border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value=""></option>
                  <option value=",">カンマ ( , )</option>
                  <option value="\t">タブ ( TSV )</option>
                  <option value=";">セミコロン ( ; )</option>
                </select>
              </div>
              </>
            )}
          </div>

          {/* プレビューエリア */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</span>
              {/* 既存モードかつファイル読み込み済みの時だけチェック結果を表示 */}
              {!isNewMode && fromConfig.path && fromConfig.headers.length > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isConsistent ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                }`}>
                  {isConsistent ? "✓ 整合性OK" : "⚠ 項目不足"}
                </span>
              )}
            </div>

            {/* プレビュー本体 */}
            <div className={`bg-slate-900 rounded-lg p-4 h-24 overflow-x-auto border-2 transition-colors ${
              isHeaderMismatch ? "border-rose-500/50" : "border-transparent"
            }`}>
              <code className="text-green-400 text-xs whitespace-nowrap">
                {fromConfig.headers?.length > 0
                  ? fromConfig.headers.map(h => h.name).join(" | ")
                  : "ファイルを読み込んでください..."}
              </code>
            </div>

            {/* エラー詳細メッセージ */}
            {!isNewMode && fromConfig.path && missingCols.length > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-100 animate-in fade-in slide-in-from-top-1">
                <p className="text-xs text-rose-600 font-bold mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  以下の列が見つかりません：
                </p>
                <div className="flex flex-wrap gap-1">
                  {missingCols.map((col, i) => (
                    <span 
                      key={i} 
                      className="text-[10px] bg-white border border-rose-200 text-rose-500 px-1.5 py-0.5 rounded shadow-sm"
                    >
                      {col.index + 1}列目: {col.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TO CARD */}
        {isNewMode && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">2</div>
            <h3 className="text-lg font-bold text-slate-700">To (出力先サンプル)</h3>
          </div>

          <button 
            onClick={() => handleSelectFile('to')}
            className={`w-full group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
              toConfig.path 
                ? "border-emerald-500 bg-emerald-50/30" 
                : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`p-2 rounded-lg ${toConfig.path ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left overflow-hidden">
                <p className={`text-sm font-bold ${toConfig.path ? "text-emerald-700" : "text-slate-600"}`}>
                  {toConfig.path ? "ファイルを変更する" : "ファイルを選択"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {toConfig.path ? toConfig.path : "クリックしてExcelまたはCSVを開く"}
                </p>
              </div>
            </div>
            <div className={`ml-2 transition-transform group-hover:translate-x-1 ${toConfig.path ? "text-emerald-500" : "text-slate-300"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span>ヘッダー開始行:</span>
              <input
                type="number"
                min="1"
                value={toConfig.headerRow}
                onChange={(e) => setToConfig({ ...toConfig, headerRow: parseInt(e.target.value) })}
                className="w-16 p-1 border border-slate-300 rounded text-center bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>文字コード:</span>
              <select
                value={toConfig.encoding}
                onChange={(e) => setToConfig({ ...toConfig, encoding: e.target.value })}
                className="p-1 border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="UTF-8">UTF-8</option>
                <option value="Shift-JIS">Shift-JIS</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>区切り:</span>
              <select
                value={toConfig.delimiter}
                onChange={(e) => setToConfig({ ...toConfig, delimiter: e.target.value })}
                className="p-1 border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value=""></option>
                <option value=",">カンマ ( , )</option>
                <option value="\t">タブ ( TSV )</option>
                <option value=";">セミコロン ( ; )</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</span>
            <div className="bg-slate-900 rounded-lg p-4 h-24 overflow-x-auto">
              <code className="text-emerald-400 text-xs whitespace-nowrap">
                {toConfig.headers?.length > 0
                  ? toConfig.headers.map(h => h.name).join(" | ")
                  : "ファイルを読み込んでください..."}
              </code>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* FOOTER ACTION */}
      <div className="flex justify-center pt-8">
        <button
          onClick={() => onNavigate('mapping', { 
            fromConfig: fromConfig, 
            toHeaders: toConfig.headers ,
            initialMappings: !isNewMode ? savedMappings : []
          })}
          disabled={!fromConfig.path || !toConfig.path}
          className={`px-12 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${(fromConfig.path && toConfig.path)
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 cursor-pointer"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
        >
          次へ：マッピング設定
        </button>
      </div>
    </div>
  );
}