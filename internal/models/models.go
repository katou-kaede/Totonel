package models

type Template struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Name           string         `gorm:"size:255;not null;unique" json:"name"`
	CreatedAt      int64      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      int64      `gorm:"autoUpdateTime" json:"updated_at"`
	FromTemplateConfig FromTemplateConfig `json:"template_config"`
	Mappings       []Mapping      `json:"mappings"`
}

// テンプレートのFromファイルの読み込み方
type FromTemplateConfig struct {
	ID             uint   `gorm:"primaryKey" json:"id"`
	TemplateID     uint   `gorm:"not null" json:"template_id"`
	FileType       string `json:"file_type"`
	HeaderRowIndex int    `json:"header_row_index"`  // ヘッダー開始行
	// SheetName      string `json:"sheet_name"`
	Delimiter      string `json:"delimiter"`  // CSVの区切り文字
	Encoding       string `json:"encoding"`   // "UTF-8", "Shift-JIS" など
}

// 出力先(To)を定義
type Mapping struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	TemplateID    uint            `gorm:"not null" json:"template_id"`
	ToColumnName  string          `gorm:"size:255;not null" json:"to_column_name"`  // 出力先の列名
	ToColumnIndex int             `json:"to_column_index"`
	MappingType   string          `json:"mapping_type"`  // const / pipeline / equal
	ConstantValue string          `json:"constant_value"`   // 固定値の値
	TransformRules string          `json:"transform_rules"`  // pipelineの変換ルール
	// 例： [{"type": "split", "delimiter": "_", "index": 0}, {"type": "date", "format": "YYYYMMDD"}]
	SortOrder     int             `json:"sort_order"`  // 表示順
	Sources       []MappingSource `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"sources"`
}

// 材料(From)を紐付け
type MappingSource struct {
	ID              uint   `gorm:"primaryKey" json:"id"`
	MappingID       uint   `gorm:"not null" json:"mapping_id"`
	FromColumnName  string `gorm:"size:255" json:"from_column_name"`  // 参照元の列名
	FromColumnIndex int    `json:"from_column_index"`
	Priority        int    `json:"priority"`  // 結合時の順序（1:姓, 2:名）
}