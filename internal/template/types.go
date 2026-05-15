package template

// インデックスと名前のペアを管理する共通構造体
type ColumnInfo struct {
    Index int    `json:"index"`
    Name  string `json:"name"`
}

type FromConfig struct {
	Path           string `json:"path"`
	HeaderRow      int    `json:"headerRow"`
	Headers		[]ColumnInfo `json:"headers"`
	FileType		string   `json:"fileType"`	
	// SheetName      string `json:"sheetName"`
	Delimiter      string `json:"delimiter"`
	Encoding 	   string `json:"encoding"`
	PreviewRows [][]string `json:"previewRows"`
}

// MappingInput はフロントの mappings[i] と合わせる
type MappingInput struct {
	ToField       ColumnInfo   `json:"toField"`
	FromFields    []ColumnInfo `json:"fromFields"` // ここがスライスになる
	Type          string   `json:"type"`  // "const" / "equal" / "pipeline"
	ConstantValue string   `json:"constantValue"`
	TransformRules []TransformRule  `json:"transformRules"`
	// TransformRule map[string]interface{} `json:"transformRule"` // 追加設定を柔軟に受け取るためにマップにする
}

// TransformRule は 1つの加工工程（ステップ）の定義
type TransformRule struct {
    Type   string     `json:"type"`   // "split", "slice", "convert" など
    Params RuleParams `json:"params"` // その工程に必要な設定値
}

// RuleParams は各ステップの詳細設定
type RuleParams struct {
	// ポインタ型 (*string) にすることで、値がない場合に nil (null) を許容します
    // omitempty を付けることで、空の時にJSONに含めない（＝フロント側で必須でなくなる）ようになります
	Delimiter *string `json:"delimiter,omitempty"` // split, joinの区切り文字など
	Index     *int    `json:"index,omitempty"`  // split: 分割後のどの部分を使うか, slice: 開始位置
	Format    *string `json:"format,omitempty"` // 日付フォーマットなど
	Length	*int    `json:"length,omitempty"`  // padding: 何桁にするか, slice: 切り出す長さ
	PadChar *string `json:"padChar,omitempty"` // 埋める文字
	ConvertType *string `json:"convertType,omitempty"` // "to_half" (半角へ) or "to_full" (全角へ)
	Prefix *string `json:"prefix,omitempty"` // 先頭に追加する文字列
	ReplaceOld *string `json:"replaceOld,omitempty"` // 置換対象の文字列
    ReplaceNew *string `json:"replaceNew,omitempty"` // 置換後の文字列
	Direction *string `json:"direction,omitempty"` // slice: "forward" (前方から), "backward" (後方から)
}


// transformRule: [ { ... }, { ... }, { ... } ]
// 例：
// [
//   { "type": "convert", "params": { "convertType": "to_half" } }, // 1番目：半角にする
//   { "type": "slice",   "params": { "index": 0, "length": 30 } }, // 2番目：切り出す
//   { "type": "prefix",  "params": { "prefix": "℡" } }             // 3番目：文字を付ける
// ]