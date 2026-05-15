// src/utils/previewMapper.ts
import { template } from "../../../wailsjs/go/models";

/**
 * 特定の値をルールに基づいて変換する（純粋な変換ロジックのみ）
 */
export const transformValue = (
  sourceValues: string[], 
  mapping: template.MappingInput
): string => {
  // 固定値の場合は constantValue をそのまま返す
  if (mapping.type === 'const') {
    return mapping.constantValue || "";
  }

  const currentValues = [...sourceValues];
  const rules = mapping.transformRules || [];

  const finalValues = rules.reduce((acc: string[], rule) => {
    const r = rule.params;
    if (!r) return acc;

    // 配列の最初の要素だけを変換対象とする（複数ある場合は最初の要素にルールを適用し、他はそのまま）
    // ========= memo =========
    // Reactは「配列の中身が変わったか」ではなく「配列そのものが新しくなったか」で画面を更新するか判断ため
    // acc[0]を直接変更するのではなく、mapで新しい配列を作る形にする必要がある
    switch (rule.type) {
      case 'split':  // 分割
        return acc.map((v, i) => i === 0 ? (v.split(r?.delimiter || "")[r?.index ?? 0] || "") : v);

      case 'join':  // 結合
        console.log("結合文字", acc)
        return [acc.join(r?.delimiter || "")];

      case 'date':  // 日付変換
        console.log("変換フォーマット:", r.format);
        return acc.map((v, i) => i === 0 ? formatPreviewDate(v, r?.format) : v);

      case 'padding':  // 文字埋め
        return acc.map((v, i) => i === 0 ? String(v).padStart(r.length || 0, r.padChar || '0') : v);

      case 'convert':  // 文字変換（全角⇔半角）
        return acc.map((v, i) => {
          if (i !== 0 || !v) return v || "";
          const type = r?.convertType || 'to_half';
          
          if (type === 'to_half') {
            return v
            .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
            .replace(/　/g, " ")
            .replace(REG_KANA_TO_HALF, s => TO_HALF_MAP[s]);
          } else {
            return v
            .replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0))
            .replace(/ /g, "　")
            .replace(REG_KANA_TO_FULL, s => TO_FULL_MAP[s]);
          }
        });

      case 'prefix':  // 文字列の先頭に追加
        return acc.map((v, i) => i === 0 ? (r.prefix ?? '') + v : v);
        
      case 'replace': // 置換
        return acc.map((v, i) => {
          if (i !== 0 || !v || !r.replaceOld) return v || "";

          // JavaScriptの .replace() は最初の1つしか置換しないため、
          // すべて置換するには正規表現を使うか、最新のブラウザなら .replaceAll() を使います
          // ここではより確実な方法をとります
          return v.split(r.replaceOld).join(r.replaceNew || "");
        })

      case 'slice': // 文字列の一部を切り出す
        return acc.map((v, i) => i === 0 ? applySliceLogic(v, r) : v);

      default:
        return acc;
    }
  }, currentValues);

  return finalValues[0] || "";
};


/**
 * 日付変換の内部ロジック
 */
const formatPreviewDate = (val: string, format?: string) => {
  if (!val) return "";
  let targetDate: Date;

  if (!isNaN(Number(val)) && val.length <= 5) {
    targetDate = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
  } else if (/^\d{8}$/.test(val)) {
    targetDate = new Date(`${val.substring(0, 4)}/${val.substring(4, 6)}/${val.substring(6, 8)}`);
  } else {
    targetDate = new Date(val.replace(/-/g, '/'));
  }

  if (isNaN(targetDate.getTime())) return val;

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');

  return format === 'YYYYMMDD' ? `${y}${m}${d}` : `${y}/${m}/${d}`;
};

/**
 * Sliceロジックを分離（acc.map の中で使いやすくするため）
 */
const applySliceLogic = (v: string, r: any): string => {
  if (!v) return "";
  const totalW = getDisplayWidth(v);
  const dir = r.direction || 'forward';
  const sliceLen = r.length ?? totalW;
  
  let start = 0;
  let end = totalW;

  if (dir === 'forward') {
    start = r.index || 0;
    end = start + sliceLen;
  } else {
    end = totalW - (r.index || 0);
    start = end - sliceLen;
    if (start < 0) start = 0;
    if (end < 0) end = 0;
  }
  
  let res = "";
  let curW = 0;
  for (const char of v) {
    const charW = getDisplayWidth(char);
    const nextW = curW + charW;
    if (curW >= start && nextW <= end) {
      res += char;
    }
    curW = nextW;
  }
  return res;
};

// sliceの表示幅計算
const getDisplayWidth = (s: string): number => {
  let width = 0;
  for (const char of s) {
    const code = char.charCodeAt(0);
    // ASCII または 半角カタカナ (U+FF61 - U+FF9F)
    if (code <= 127 || (code >= 0xff61 && code <= 0xff9f)) {
      width += 1;
    } else {
      width += 2;
    }
  }
  return width;
};

// 全角カタカナと半角カタカナのマッピング
const TO_HALF_MAP: Record<string, string> = {
  "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ",
  "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ",
  "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ",
  "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ",
  "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ",
  "ヴ": "ｳﾞ", "ヷ": "ﾜﾞ", "ヺ": "ｦﾞ",
  "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ",
  "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ",
  "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ",
  "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ",
  "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ",
  "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ",
  "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ",
  "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ",
  "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ",
  "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ",
  "ァ": "ｧ", "ィ": "ｨ", "ゥ": "ｩ", "ェ": "ｪ", "ォ": "ｫ",
  "ッ": "ｯ", "ャ": "ｬ", "ュ": "ｭ", "ョ": "ｮ",
  "ー": "ｰ", "゛": "ﾞ", "゜": "ﾟ", "「": "｢", "」": "｣", "、": "､", "。": "｡", "・": "･"
};

const TO_FULL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TO_HALF_MAP).map(([k, v]) => [v, k])
);

// 2. 正規表現の生成（記号が含まれるのでメタ文字をエスケープ）
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const REG_KANA_TO_HALF = new RegExp(`(${Object.keys(TO_HALF_MAP).map(escapeRegExp).join('|')})`, 'g');
const REG_KANA_TO_FULL = new RegExp(`(${Object.keys(TO_FULL_MAP).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'g');