erDiagram
    Template ||--|| TemplateConfig : "Fromの読み方を定義"
    Template ||--o{ Mapping : "出力列(To)を定義"
    Mapping ||--o{ MappingSource : "材料(From)を紐付け"

    Template {
        int id PK
        string name "テンプレート名（例：佐川e飛伝用）"
        datetime created_at
        datetime updated_at
    }

    FromTemplateConfig {
        int id PK
        int template_id FK
        string file_type "CSV or EXCEL"
        int header_row_index "Fromヘッダー開始行（0-indexed）"
        string sheet_name "Excel用シート名"
        string delimiter "CSV用区切り文字"
    }

    Mapping {
        int id PK
        int template_id FK
        string to_column_name "出力先の列名"
        string mapping_type "constant / single / join / date_format"
        string constant_value "固定値（mapping_type=constantの場合）"
        string transform_rule "JSON形式の追加設定（日付フォーマット、結合文字など）"
        int sort_order "画面上の表示順"
    }

    MappingSource {
        int id PK
        int mapping_id FK
        string from_column_name "参照元の列名"
        int priority "結合時の順序（1:姓, 2:名）"
    }