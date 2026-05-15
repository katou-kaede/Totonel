package export

import (
	"Totonel/internal/template"
	"strconv"
	"strings"
	"time"
	"github.com/xuri/excelize/v2"
)

// 全行をマッピングに従って変換する
func Transform(rows [][]string, mappings []template.MappingInput, config template.FromConfig) [][]string {
	var output [][]string
	headerMap := make(map[string]int)
	headerRowIdx := config.HeaderRow - 1

	if headerRowIdx < 0 || headerRowIdx >= len(rows) {
		return nil
	}
	for i, h := range rows[headerRowIdx] {
		headerMap[h] = i
	}

	// ヘッダー追加
	var outHeader []string
	for _, m := range mappings {
		outHeader = append(outHeader, m.ToField.Name)
	}
	output = append(output, outHeader)

	// データ行変換
	for i := config.HeaderRow; i < len(rows); i++ {
		fromRow := rows[i]
		var outRow []string
		for _, mapping := range mappings {
			var vals []string
			for _, field := range mapping.FromFields {
				idx := field.Index

				if idx >= 0 && idx < len(fromRow) {
					vals = append(vals, fromRow[idx])
				} else {
					vals = append(vals, "")
				}
			}
			outRow = append(outRow, applyTransform(mapping, vals))
		}
		output = append(output, outRow)
	}
	return output
}

func applyTransform(mapping template.MappingInput, fromVals []string) string {
	// 固定値の場合は固定値をそのまま返す
	if mapping.Type == "const" { return mapping.ConstantValue }

	// ループ内で破壊的に書き換えないよう、新しいスライスを作成
	acc := make([]string, len(fromVals))
	copy(acc, fromVals)

	for _, rule := range mapping.TransformRules {
		p := rule.Params

		// 配列の最初の要素だけを変換対象とする
		switch rule.Type {
		case "split":
			// 指定した区切り文字で分割し、指定したインデックスの値を返す
			// Delimiter と Index が両方とも存在しない場合は変換せず元の値を返す
			if len(acc) > 0 && p.Delimiter != nil && p.Index != nil {
				v := acc[0]
				parts := strings.Split(v, *p.Delimiter)
				if *p.Index >= 0 && *p.Index < len(parts) {
					acc[0] = parts[*p.Index]
				} else {
					acc[0] = ""
				}
			}

		case "join":
			// 指定した区切り文字で複数の値を結合して返す
			delimiter := ""
			if p.Delimiter != nil {
				delimiter = *p.Delimiter
			}
			acc = []string{strings.Join(acc, delimiter)}

		case "date":
			if len(acc) > 0 {
				v := acc[0]
				var t time.Time
				var err error
				// Excelシリアル値か、文字列の日付かを自動判定
				if f, pErr := strconv.ParseFloat(v, 64); pErr == nil {
					t, err = excelize.ExcelDateToTime(f, false)
				} else {
					cleanVal := strings.ReplaceAll(v, "-", "/")
					t, err = time.Parse("2006/1/2", cleanVal)
			
					// スラッシュ形式で失敗した場合、区切りなし形式 (YYYYMMDD) で再試行
					if err != nil {
						t, err = time.Parse("20060102", cleanVal)
					}
				}
				if err == nil && !t.IsZero() {  // 変換失敗時は元の値をそのまま返す
					// フォーマット指定に基づいて出力
					if p.Format != nil && *p.Format == "YYYYMMDD" {
						acc[0] = t.Format("20060102")
					} else {
						acc[0] = t.Format("2006/01/02")
					}
				}
			}

		case "padding":
			if len(acc) > 0 {
				// 指定した長さになるように、指定した文字で埋める
				// 長さが指定されていなければ、元の値をそのまま返す
				v := acc[0]
				if p.Length == nil || *p.Length <= 0 { continue }
				
				padChar := "0" // デフォルトは "0"
				if p.PadChar != nil && *p.PadChar != "" {
					// runeに変換して、確実に「最初の1文字」だけを取り出す
					r := []rune(*p.PadChar)
					padChar = string(r[0])
				}

				// 必要な長さまで埋める
				// runeをつかうと、全角半角問わず文字数を正確にカウントできる
				currentLen := len([]rune(v))
				if currentLen < *p.Length {
					acc[0] = strings.Repeat(padChar, *p.Length - currentLen) + v
				}
			}

		case "convert":
			if len(acc) > 0 {
				// 半角⇔全角変換
				// ConvertType のポインタチェック
				v := acc[0]
				if p.ConvertType == nil { continue }

				// 1文字ずつ走査して変換
				var result string
				if *p.ConvertType == "to_half" {
					// 1. まずカタカナとスペースを一括置換
					result = fullToHalfReplacer.Replace(v)
					// 2. 残りの英数字・記号を rune ループで処理
					runes := []rune(result)
					for j, r := range runes {
						if r >= 0xFF01 && r <= 0xFF5E {
							runes[j] = r - 0xFEE0
						}
					}
					acc[0] = string(runes)
				} else {
					// 1. まずカタカナとスペースを一括置換（"ｶﾞ" など2文字セットを優先的に拾ってくれる）
					result = halfToFullReplacer.Replace(v)
					// 2. 残りの英数字・記号を rune ループで処理
					runes := []rune(result)
					for j, r := range runes {
						if r >= 0x0021 && r <= 0x007E {
							runes[j] = r + 0xFEE0
						}
					}
					acc[0] = string(runes)
				}
			}

		case "prefix":
			// 指定した文字列を先頭に追加
			// 住所（ポインタ）があるか、かつ中身が空でないかチェック
			if len(acc) > 0 {
				prefix := ""
				if p.Prefix != nil {
					prefix = *p.Prefix
				}
			
				acc[0] = prefix + acc[0]
			}

		case "replace":
			// ReplaceOld が nil または空文字なら、置換のしようがないのでそのまま返す
			if len(acc) > 0  {
				if p.ReplaceOld != nil && *p.ReplaceOld != "" {
					newVal := ""
					if p.ReplaceNew != nil {
						newVal = *p.ReplaceNew
					}
					acc[0] = strings.ReplaceAll(acc[0], *p.ReplaceOld, newVal)
				}
			}

		case "slice":
			if len(acc) > 0  {
				v := acc[0]
				totalW := getDisplayWidth(v)
				direction := "forward"
				if p.Direction != nil {
					direction = *p.Direction
				}

				start := 0
				end := totalW

				if direction == "forward" {
					// 前方から：Indexを開始位置にする
					if p.Index != nil {
						start = *p.Index
					}
					// 長さの指定
					if p.Length != nil {
						end = start + *p.Length
					}
				} else {
					// 後方から：(全幅 - Index) を終了位置(右端)にする
					rightEdge := totalW
					if p.Index != nil {
						rightEdge = totalW - *p.Index
					}
					
					// そこから Length 分左に戻った場所を開始位置にする
					sliceLen := totalW
					if p.Length != nil {
						sliceLen = *p.Length
					}
					
					start = rightEdge - sliceLen
					end = rightEdge
				}

				// 範囲の安全策
				if start < 0 { start = 0 }
				if end > totalW { end = totalW }
				
				// sliceByDisplayWidth 自体も「はみ出し禁止」で実装しているはずなので、
				// 第3引数は (終了位置 - 開始位置) = 長さ を渡す
				actualLength := end - start
				if actualLength < 0 { actualLength = 0 }

				acc[0] = sliceByDisplayWidth(v, start, actualLength)
			}
		}
	}
	if len(acc) > 0 {
		return acc[0]
	}
	return ""
}

// 文字列の表示幅（全角2、半角1）を計算します
func getDisplayWidth(s string) int {
	width := 0
	for _, r := range s {
		// 1. ASCII範囲内 (0-127)
		// 2. 半角カタカナ範囲 (U+FF61 - U+FF9F)
		// これらは「半角(1幅)」としてカウント
		if r <= 127 || (r >= 0xff61 && r <= 0xff9f) {
			width += 1
		} else {
			width += 2
		}
	}
	return width
}

// 表示幅を基準に文字列を切り出します。
// start: 開始位置（表示幅カウント）
// length: 切り出す幅（表示幅カウント）
func sliceByDisplayWidth(s string, start int, length int) string {
	runes := []rune(s)
	currentWidth := 0
	end := start + length
	
	resRunes := []rune{}

	for _, r := range runes {
		charWidth := 2
		// 1. ASCII範囲内 (0-127)
		// 2. 半角カタカナ範囲 (U+FF61 - U+FF9F)
		if r <= 127 || (r >= 0xff61 && r <= 0xff9f) {
			charWidth = 1
		}

		nextWidth := currentWidth + charWidth

		// 判定条件の統一
        // 1. 文字の左端(currentWidth)が開始位置以降であること
        // 2. 文字の右端(nextWidth)が終了制限(endLimit)を超えないこと
        if currentWidth >= start && nextWidth <= end {
            resRunes = append(resRunes, r)
        }

		// 既に制限を超えていたら早めに抜ける（効率化のため）
        if nextWidth > end {
            break
        }

        currentWidth = nextWidth
	}

	return string(resRunes)
}


var (
	fullToHalfReplacer = strings.NewReplacer(
		"ガ", "ｶﾞ", "ギ", "ｷﾞ", "グ", "ｸﾞ", "ゲ", "ｹﾞ", "ゴ", "ｺﾞ",
		"ザ", "ｻﾞ", "ジ", "ｼﾞ", "ズ", "ｽﾞ", "ゼ", "ｾﾞ", "ゾ", "ｿﾞ",
		"ダ", "ﾀﾞ", "ヂ", "ﾁﾞ", "ヅ", "ﾂﾞ", "デ", "ﾃﾞ", "ド", "ﾄﾞ",
		"バ", "ﾊﾞ", "ビ", "ﾋﾞ", "ブ", "ﾌﾞ", "ベ", "ﾍﾞ", "ボ", "ﾎﾞ",
		"パ", "ﾊﾟ", "ピ", "ﾋﾟ", "プ", "ﾌﾟ", "ペ", "ﾍﾟ", "ポ", "ﾎﾟ",
		"ヴ", "ｳﾞ", "ヷ", "ﾜﾞ", "ヺ", "ｦﾞ",
		"ア", "ｱ", "イ", "ｲ", "ウ", "ｳ", "エ", "ｴ", "オ", "ｵ",
		"カ", "ｶ", "キ", "ｷ", "ク", "ｸ", "ケ", "ｹ", "コ", "ｺ",
		"サ", "ｻ", "シ", "ｼ", "ス", "ｽ", "セ", "ｾ", "ソ", "ｿ",
		"タ", "ﾀ", "チ", "ﾁ", "ツ", "ﾂ", "テ", "ﾃ", "ト", "ﾄ",
		"ナ", "ﾅ", "ニ", "ﾆ", "ヌ", "ﾇ", "ネ", "ﾈ", "ノ", "ﾉ",
		"ハ", "ﾊ", "ヒ", "ﾋ", "フ", "ﾌ", "ヘ", "ﾍ", "ホ", "ﾎ",
		"マ", "ﾏ", "ミ", "ﾐ", "ム", "ﾑ", "メ", "ﾒ", "モ", "ﾓ",
		"ヤ", "ﾔ", "ユ", "ﾕ", "ヨ", "ﾖ",
		"ラ", "ﾗ", "リ", "ﾘ", "ル", "ﾙ", "レ", "ﾚ", "ロ", "ﾛ",
		"ワ", "ﾜ", "ヲ", "ｦ", "ン", "ﾝ",
		"ァ", "ｧ", "ィ", "ｨ", "ゥ", "ｩ", "ェ", "ｪ", "ォ", "ｫ",
		"ッ", "ｯ", "ャ", "ｬ", "ュ", "ｭ", "ョ", "ｮ",
		"ー", "ｰ", "゛", "ﾞ", "゜", "ﾟ", "「", "｢", "」", "｣", "、", "､", "。", "｡", "・", "･",
		"　", " ",
	)

	// 半角→全角用（逆方向に作成）
	halfToFullReplacer = strings.NewReplacer(
		"ｶﾞ", "ガ", "ｷﾞ", "ギ", "ｸﾞ", "グ", "ｹﾞ", "ゲ", "ｺﾞ", "ゴ",
		"ｻﾞ", "ザ", "ｼﾞ", "ジ", "ｽﾞ", "ズ", "ｾﾞ", "ゼ", "ｿﾞ", "ゾ",
		"ﾀﾞ", "ダ", "ﾁﾞ", "ヂ", "ﾂﾞ", "ヅ", "ﾃﾞ", "デ", "ﾄﾞ", "ド",
		"ﾊﾞ", "バ", "ﾋﾞ", "ビ", "ﾌﾞ", "ブ", "ﾍﾞ", "ベ", "ﾎﾞ", "ボ",
		"ﾊﾟ", "パ", "ﾋﾟ", "ピ", "ﾌﾟ", "プ", "ﾍﾟ", "ペ", "ﾎﾟ", "ポ",
		"ｳﾞ", "ヴ", "ﾜﾞ", "ヷ", "ｦﾞ", "ヺ",
		"ｱ", "ア", "ｲ", "イ", "ｳ", "ウ", "ｴ", "エ", "ｵ", "オ",
		"ｶ", "カ", "ｷ", "キ", "ｸ", "ク", "ｹ", "ケ", "ｺ", "コ",
		"ｻ", "サ", "ｼ", "シ", "ｽ", "ス", "ｾ", "セ", "ｿ", "ソ",
		"ﾀ", "タ", "ﾁ", "チ", "ﾂ", "ツ", "ﾃ", "テ", "ﾄ", "ト",
		"ﾅ", "ナ", "ﾆ", "ニ", "ﾇ", "ヌ", "ﾈ", "ネ", "ﾉ", "ノ",
		"ﾊ", "ハ", "ﾋ", "ヒ", "ﾌ", "フ", "ﾍ", "ヘ", "ﾎ", "ホ",
		"ﾏ", "マ", "ﾐ", "ミ", "ﾑ", "ム", "ﾒ", "メ", "ﾓ", "モ",
		"ﾔ", "ヤ", "ﾕ", "ユ", "ﾖ", "ヨ",
		"ﾗ", "ラ", "ﾘ", "リ", "ﾙ", "ル", "ﾚ", "レ", "ﾛ", "ロ",
		"ﾜ", "ワ", "ｦ", "ヲ", "ﾝ", "ン",
		"ｧ", "ァ", "ｨ", "ィ", "ｩ", "ゥ", "ｪ", "エ", "ｫ", "ォ",
		"ｯ", "ッ", "ｬ", "ャ", "ｭ", "ュ", "ｮ", "ョ",
		"ｰ", "ー", "ﾞ", "゛", "ﾟ", "゜", "｢", "「", "｣", "」", "､", "、", "｡", "。", "･", "・",
		" ", "　",
	)
)