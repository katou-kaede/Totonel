// 変換タイプごとの初期設定を定義
export const DEFAULT_PARAMS: Record<string, any> = {
  // equal:   {},
  join:    { delimiter: '' },
  split:   { index: 0, delimiter: '' },
  padding: { length: 0, padChar: '0' },
  date:    { format: 'YYYY/MM/DD' },
  convert: { convertType: 'to_half' },
  prefix:  { prefix: '' },
  replace: { replaceOld: '', replaceNew: '' },
  slice:   { direction: 'forward', index: 0, length: 0 },
};

// 表示用ラベル
export const RULE_TYPE_LABELS: Record<string, string> = {
  equal: 'そのまま',
  const: '固定値',
  join: '結合',
  split: '分割',
  padding: '文字埋め',
  date: '日付変換',
  convert: '半角⇔全角',
  prefix: '接頭辞',
  replace: '置換',
  slice: '切り出し',
};