package export

import (
	"Totonel/internal/template"
	"reflect"
	"testing"
)

// ヘルパー関数
func ptr(s string) *string { return &s }
func iptr(i int) *int       { return &i }

func TestTransform(t *testing.T) {
	rows := [][]string{
		{"顧客名", "生年月日", "コード"},
		{"山田　太郎", "1990/01/01", "123"},
	}

	config := template.FromConfig{
		HeaderRow: 1,
	}

	mappings := []template.MappingInput{
		{
			Type: "source",
			ToField: template.ColumnInfo{Name: "名前（半角）"},
			FromFields: []template.ColumnInfo{
				{Index: 0, Name: "顧客名"},
			},
			TransformRules: []template.TransformRule{
				{Type: "convert", Params: template.RuleParams{ConvertType: ptr("to_half")}},
				{Type: "prefix", Params: template.RuleParams{Prefix: ptr(" ")}},
			},
		},
		{
			Type: "source",
			ToField: template.ColumnInfo{Name: "日付"},
			FromFields: []template.ColumnInfo{
				{Index: 1, Name: "生年月日"},
			},
			TransformRules: []template.TransformRule{
				{Type: "date", Params: template.RuleParams{Format: ptr("YYYYMMDD")}},
			},
		},
	}

	actual := Transform(rows, mappings, config)

	// 検証用データ
	expectedHeader := []string{"名前（半角）", "日付"}
	
	if len(actual) == 0 {
		t.Fatal("結果が空です")
	}

	// ヘッダーの検証
	if !reflect.DeepEqual(actual[0], expectedHeader) {
		t.Errorf("ヘッダーが一致しません。\n期待: %v\n実際: %v", expectedHeader, actual[0])
	}
    
    // データ行の検証
    expectedData := []string{" 山田 太郎", "19900101"}

	if len(actual) < 2 {
		t.Fatal("データ行が生成されていません")
	}

	// 実際のデータ行を取得
	actualData := actual[1]

	// 各列の値を検証
	for i, val := range actualData {
		if val != expectedData[i] {
			t.Errorf("データ行の %d 列目が一致しません。\n期待: %s\n実際: %s", i, val, expectedData[i])
		}
	}
}


func TestApplyTransform_AllRules(t *testing.T) {
	tests := []struct {
		name     string
		ruleType string
		input    []string
		params   template.RuleParams
		expected string
	}{
		// ==========================================
		//  正常系テスト
		// ==========================================
		{
			name:     "分割(split): カンマ区切りの2番目を取得",
			ruleType: "split",
			input:    []string{"東京都,渋谷区,道玄坂"},
			params:   template.RuleParams{Delimiter: ptr(","), Index: iptr(1)},
			expected: "渋谷区",
		},
		{
			name:     "結合(join): 名字と名前をスペースで結合",
			ruleType: "join",
			input:    []string{"田中", "太郎"},
			params:   template.RuleParams{Delimiter: ptr(" ")},
			expected: "田中 太郎",
		},
		{
			name:     "結合(join): 3つ以上の要素をカンマで結合",
			ruleType: "join",
			input:    []string{"りんご", "みかん", "ばなな"},
			params:   template.RuleParams{Delimiter: ptr(",")},
			expected: "りんご,みかん,ばなな",
		},
		{
			name:     "切り出し(slice): 前方から2文字",
			ruleType: "slice",
			input:    []string{"ABCDEFG"},
			params:   template.RuleParams{Direction: ptr("forward"), Index: iptr(0), Length: iptr(2)},
			expected: "AB",
		},
		{
			name:     "切り出し(slice): 後方から指定幅を取得",
			ruleType: "slice",
			input:    []string{"東京都渋谷区道玄坂"}, // 全幅18
			params:   template.RuleParams{Direction: ptr("backward"), Index: iptr(0), Length: iptr(6)}, // 末尾から6幅分
			expected: "道玄坂",
		},
		{
			name:     "切り出し(slice): 全角半角混在時の表示幅指定",
			ruleType: "slice",
			input:    []string{"No.123田中"}, // 半角6 + 全角4 = 幅10
			params:   template.RuleParams{Direction: ptr("forward"), Index: iptr(6), Length: iptr(4)}, // 5幅目から4幅分
			expected: "田中",
		},
		{
			name:     "パディング(padding): 3桁に0埋め",
			ruleType: "padding",
			input:    []string{"7"},
			params:   template.RuleParams{Length: iptr(3), PadChar: ptr("0")},
			expected: "007",
		},
		{
			name:     "置換(replace): 会社名を削除",
			ruleType: "replace",
			input:    []string{"株式会社テスト"},
			params:   template.RuleParams{ReplaceOld: ptr("株式会社"), ReplaceNew: ptr("")},
			expected: "テスト",
		},
		{
			name:     "置換(replace): 複数の同一文字をすべて置換",
			ruleType: "replace",
			input:    []string{"090-1234-5678"},
			params:   template.RuleParams{ReplaceOld: ptr("-"), ReplaceNew: ptr("")},
			expected: "09012345678",
		},
		{
			name:     "変換(convert): 半角から全角への逆変換（カタカナ）",
			ruleType: "convert",
			input:    []string{"ｶﾞﾝﾀﾞﾑ"},
			params:   template.RuleParams{ConvertType: ptr("to_full")},
			expected: "ガンダム",
		},
		{
            name:     "変換(convert): 全角英数字から半角への変換",
            ruleType: "convert",
            input:    []string{"ガンダム"},
            params:   template.RuleParams{ConvertType: ptr("to_half")},
            expected: "ｶﾞﾝﾀﾞﾑ",
        },
        {
            name:     "日付: スラッシュ形式",
            ruleType: "date",
            input:    []string{"1990/01/01"},
            params:   template.RuleParams{Format: ptr("YYYYMMDD")},
            expected: "19900101",
        },
		{
			name:     "日付(date): ハイフン区切り(YYYY-MM-DD)のパース",
			ruleType: "date",
			input:    []string{"2026-05-15"},
			params:   template.RuleParams{Format: ptr("YYYYMMDD")},
			expected: "20260515",
		},
		{
			name:     "日付(date): Excelシリアル値からの変換",
			ruleType: "date",
			input:    []string{"45427"}, // 2024/05/15 に相当
			params:   template.RuleParams{Format: ptr("YYYY/MM/DD")},
			expected: "2024/05/15",
		},
        {
            name:     "Prefix: スペース付与",
            ruleType: "prefix",
            input:    []string{"山田"},
            params:   template.RuleParams{Prefix: ptr(" ")},
            expected: " 山田",
        },

		// ==========================================
		// 異常系テスト
		// ==========================================
		{
			name:     "異常系(split): 存在しないインデックスを指定された場合",
			ruleType: "split",
			input:    []string{"東京-渋谷"},
			params:   template.RuleParams{Delimiter: ptr("-"), Index: iptr(5)}, // 2つしかないのに5番目を要求
			expected: "", // 安全に空文字が返るか
		},
		{
			name:     "異常系(split): 設定パラメータ(Delimiter, Index)がnilの場合",
			ruleType: "split",
			input:    []string{"東京-渋谷"},
			params:   template.RuleParams{Delimiter: nil, Index: nil}, // パラメータ欠損
			expected: "東京-渋谷", // 変換されず元の値がそのまま返るか
		},
		{
			name:     "異常系(join): 入力配列が空（要素ゼロ）の場合",
			ruleType: "join",
			input:    []string{}, // 空のスライス
			params:   template.RuleParams{Delimiter: ptr("-")},
			expected: "", // パニックを起こさずに空文字が返るか
		},
		{
			name:     "異常系(slice): 文字数（全幅）を超える開始位置(Index)を指定された場合",
			ruleType: "slice",
			input:    []string{"あいう"}, // 全幅6
			params:   template.RuleParams{Direction: ptr("forward"), Index: iptr(10), Length: iptr(2)}, // 開始位置10
			expected: "", // 範囲外アクセスで落ちずに空文字が返るか
		},
		{
			name:     "異常系(slice): 後方切り出しで計算上の開始位置がマイナスになる場合",
			ruleType: "slice",
			input:    []string{"あいう"}, // 全幅6
			params:   template.RuleParams{Direction: ptr("backward"), Index: iptr(1), Length: iptr(10)}, // 6 - 1 - 10 = -5
			expected: "あい", // start<0 の安全策(start=0)が働き、取れる最大幅が返るか
		},
		{
			name:     "異常系(padding): すでに指定された長さ（Length）を超えている場合",
			ruleType: "padding",
			input:    []string{"12345"}, // 5文字
			params:   template.RuleParams{Length: iptr(3), PadChar: ptr("0")}, // 3桁にしたい
			expected: "12345", // 削られずに元の値が維持されるか
		},
		{
			name:     "異常系(padding): 埋める文字（PadChar）が空文字の場合",
			ruleType: "padding",
			input:    []string{"7"},
			params:   template.RuleParams{Length: iptr(3), PadChar: ptr("")}, // 埋める文字が空
			expected: "007", // デフォルトの "0" が採用されてパニックを回避できるか
		},
		{
			name:     "異常系(replace): 置換対象（ReplaceOld）が空文字の場合",
			ruleType: "replace",
			input:    []string{"株式会社テスト"},
			params:   template.RuleParams{ReplaceOld: ptr(""), ReplaceNew: ptr("単体テスト")}, // 無限ループやエラーの防止
			expected: "株式会社テスト", // そのまま返るか
		},
		{
			name:     "異常系(convert): 設定パラメータ(ConvertType)がnilの場合",
			ruleType: "convert",
			input:    []string{"ガンダム"},
			params:   template.RuleParams{ConvertType: nil}, // パラメータ欠損
			expected: "ガンダム", // そのまま返るか
		},
		{
			name:     "異常系(date): 日付として解析できない不正な文字列の場合",
			ruleType: "date",
			input:    []string{"あいうえお"}, // 日付ではない文字
			params:   template.RuleParams{Format: ptr("YYYYMMDD")},
			expected: "あいうえお", // 変換失敗時は元の値をそのまま返す仕様になっているか
		},
		{
			name:     "異常系(date): 存在しない日付（境界値エラー）の場合",
			ruleType: "date",
			input:    []string{"2026/02/31"}, // 2月31日は存在しない
			params:   template.RuleParams{Format: ptr("YYYYMMDD")},
			expected: "2026/02/31", // パースエラーとなり、元の値がそのまま返るか
		},
		{
			name:     "異常系(prefix): 設定パラメータ(Prefix)がnilの場合",
			ruleType: "prefix",
			input:    []string{"山田"},
			params:   template.RuleParams{Prefix: nil}, // パラメータ欠損
			expected: "山田", // パニックを起こさずそのまま返るか
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mapping := template.MappingInput{
				TransformRules: []template.TransformRule{
					{Type: tt.ruleType, Params: tt.params},
				},
			}
			actual := applyTransform(mapping, tt.input)
			if actual != tt.expected {
				t.Errorf("%s: 期待 %s, 実際 %s", tt.name, tt.expected, actual)
			}
		})
	}
}