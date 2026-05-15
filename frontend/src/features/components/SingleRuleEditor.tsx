import React from 'react';
import { template } from '../../../wailsjs/go/models';

interface Props {
  mapping: template.MappingInput; 
  onUpdate: (updates: any) => void;
}

export const SingleRuleEditor: React.FC<Props> = ({ mapping, onUpdate }) => {
  const rule = mapping.transformRules?.[0];

  // TransformRules[0] を更新するためのヘルパー
  const updateFirstRule = (type: string, params: any) => {
    onUpdate({
      transformRules: [{ type, params }]
    });
  };

  switch (mapping.type) {
    case 'const':
      return (
        <input
          type="text"
          placeholder="固定値を入力"
          value={mapping.constantValue || ''}
          onChange={(e) => onUpdate({ constantValue: e.target.value, transformRules: [] })}
          className="mt-2 border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-full"
        />
      );

    case 'join':
      return (
        <div>
          <label className="text-[10px] text-slate-500 font-bold">区切り文字</label>
          <input
            type="text"
            placeholder=", やスペースなど"
            value={rule?.params?.delimiter || ''}
            onChange={(e) => updateFirstRule('join', { delimiter: e.target.value })}
            className="border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-full"
          />
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="text-[10px] text-slate-500 font-bold">日付形式</label>
          <select
            value={rule?.params?.format || 'YYYY/MM/DD'}
            onChange={(e) => updateFirstRule('date', { format: e.target.value })}
            className="bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-full"
          >
            <option value="YYYY/MM/DD">YYYY/MM/DD</option>
            <option value="YYYYMMDD">YYYYMMDD</option>
          </select>
        </div>
      );

    case 'split':
      return (
        <div className="flex gap-2">
          <div className="flex-2">
            <label className="text-[10px] text-slate-500 font-bold">区切り文字</label>
            <input
              type="text"
              placeholder=", やスペースなど" 
              value={rule?.params?.delimiter || ''}
              onChange={(e) => updateFirstRule('split', { ...rule?.params, delimiter: e.target.value })}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-sm"
            />
          </div>

          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-bold">抽出位置</label>
            <input
              type="number"
              min="1"
              value={(rule?.params?.index ?? 0) + 1}
              onChange={(e) => updateFirstRule('split', { ...rule?.params, index: (parseInt(e.target.value) || 1) - 1 })}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-sm"
            />
          </div>
        </div>
      );

    case 'padding':
      return (
        <div className="flex items-center gap-1 mt-2">
          <input
            type="number"
            min="1"
            value={rule?.params?.length || ''}
            onChange={(e) => updateFirstRule('padding', { ...rule?.params, length: parseInt(e.target.value) || 0 })}
            className="w-20 border border-slate-300 rounded-lg p-1.5 text-sm"
          />
          <span className="text-xs text-slate-400">桁を</span>
          <input
            type="text"
            maxLength={1}
            value={rule?.params?.padChar ?? '0'}
            onChange={(e) => updateFirstRule('padding', { ...rule?.params, padChar: e.target.value })}
            className="w-20 border border-slate-300 rounded-lg p-1.5 text-sm"
          />
          <span className="text-xs text-slate-400">で埋める</span>
        </div>
      );

    case 'convert':
      return (
        <div>
          <label className="text-[10px] text-slate-500 font-bold">変換方向</label>
          <select
            value={rule?.params?.convertType || 'to_half'}
            onChange={(e) => {updateFirstRule('convert', { convertType: e.target.value })}}
            className="bg-white border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-full"
          >
            <option value="to_half">全角 → 半角</option>
            <option value="to_full">半角 → 全角</option>
          </select>
        </div>
      );

    case 'prefix':
      return (
        <div>
          <label className="text-[10px] text-slate-500 font-bold">追加する接頭辞</label>
          <input
            type="text"
            placeholder="例: PR-"
            value={rule?.params?.prefix ?? ''}
            onChange={(e) => { updateFirstRule('prefix', { prefix: e.target.value })}}
            className="border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm w-full"
          />
        </div>
      );

    case 'replace':
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-bold">置換前</label>
            <input
              type="text"
              value={rule?.params?.replaceOld ?? ''}
              onChange={(e) => updateFirstRule('replace', { ...rule?.params, replaceOld: e.target.value })}
              className="border border-slate-300 rounded-lg p-1.5 text-sm w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-bold">置換後</label>
            <input
              type="text"
              value={rule?.params?.replaceNew ?? ''}
              onChange={(e) => updateFirstRule('replace', { ...rule?.params, replaceNew: e.target.value })}
              className="border border-slate-300 rounded-lg p-1.5 text-sm w-full"
            />
          </div>
        </div>
      );

    case 'slice':
      return (
        <div className="flex items-end gap-3 w-full">
          <div className="flex-1 min-w-fit">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold">切出方向</label>
              <div className="flex items-center gap-2 h-8">
                <label className="flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer hover:text-blue-600 transition-colors">
                  <input
                    type="radio"
                    className="w-3 h-3 accent-blue-500"
                    checked={(rule?.params?.direction ?? 'forward') === 'forward'}
                    onChange={() => { updateFirstRule('slice', { ...rule?.params, direction: 'forward' })}}
                  />
                  前方
                </label>
                <label className="flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer hover:text-blue-600 transition-colors">
                  <input
                    type="radio"
                    className="w-3 h-3 accent-blue-500"
                    checked={rule?.params?.direction === 'backward'}
                    onChange={() => { updateFirstRule('slice', { ...rule?.params, direction: 'backward' })}}
                  />
                  後方
                </label>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-bold">開始(byte)</label>
            <input
              type="number"
              min="0"
              value={rule?.params?.index ?? ''}
              onChange={(e) => { updateFirstRule('slice', { ...rule?.params, index: parseInt(e.target.value) || 0 })}}
              className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-bold">長さ(byte)</label>
            <input
              type="number"
              min="0"
              value={rule?.params?.length ?? ''}
              onChange={(e) => { updateFirstRule('slice', { ...rule?.params, length: e.target.value ? parseInt(e.target.value) : undefined })}}
              className="w-full border border-slate-300 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
        </div>
      );

    default:
      // return <div className="text-slate-400 text-xs italic">No settings required</div>;
      return "";
  }
};