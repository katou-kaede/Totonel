package parser

import (
	"fmt"
	"Totonel/internal/template"
	
	"github.com/xuri/excelize/v2"
)

// 戻り値用の構造体を定義（wailsがJS側に型を書き出せるようにタグを付ける）
type ExcelResponse struct {
	Headers []template.ColumnInfo `json:"headers"`
	// SheetName string   `json:"sheetName"`
	Delimiter   string     `json:"delimiter"` // Excelなら空文字
    Encoding    string     `json:"encoding"`  // Excelなら "UTF-8" 固定
	PreviewRows [][]string `json:"previewRows"` // プレビュー用の行データ
}

// Excelのヘッダー行を抽出
func GetExcelHeaders(path string, rowIndex int) (*ExcelResponse, error) {
	if rowIndex < 0 {
        rowIndex = 0 // 0未満なら強制的に0(1行目)にする
    }

	f, err := excelize.OpenFile(path)
	if err != nil {
		return nil, fmt.Errorf("ファイルを開けませんでした: %w", err)
	}
	defer f.Close()

	// シート名を保持
	sheets := f.GetSheetList()
    if len(sheets) == 0 {
        return nil, fmt.Errorf("ワークブックにシートが含まれていません")
    }
    activeSheet := sheets[0] // 常にインデックス0を採用
	
	rows, err := f.GetRows(activeSheet, excelize.Options{RawCellValue: true})
	if err != nil {
		return nil, fmt.Errorf("行の取得に失敗しました: %w", err)
	}

	if len(rows) <= rowIndex {
		return nil, fmt.Errorf("指定された行（%d）が存在しません", rowIndex+1)
	}

	// ヘッダー行の取得と有効性チェック
	rawHeaders := rows[rowIndex]
    isEmpty := true
    for _, h := range rawHeaders {
        if h != "" {
            isEmpty = false
            break
        }
    }
    if isEmpty {
        return nil, fmt.Errorf("指定された行（%d）にはデータが含まれていません", rowIndex+1)
    }

	// []string から []template.ColumnInfo への変換
    var headers []template.ColumnInfo
    for index, name := range rawHeaders {
        headers = append(headers, template.ColumnInfo{
            Index: index,
            Name:  name,
        })
    }

	// プレビュー用データを取得
	previewRows := [][]string{}
    maxPreviewCount := 3 // プレビューとして返す最大行数

	// ヘッダー行の次の行からデータを取得
    for i := rowIndex + 1; i < len(rows) && len(previewRows) < maxPreviewCount; i++ {
        // 行が短い場合に備えて、ヘッダーと同じ長さまで空文字で埋める
        row := rows[i]
        paddedRow := make([]string, len(headers))
        for j := 0; j < len(headers); j++ {
            if j < len(row) {
                paddedRow[j] = row[j]
            } else {
                paddedRow[j] = ""
            }
        }
        previewRows = append(previewRows, paddedRow)
    }

	

	return &ExcelResponse{
		Headers: headers,
		// SheetName: activeSheet,
		Delimiter:   "",      // 明示的に空にする
        Encoding:    "Shift-JIS", // 固定値
		PreviewRows: previewRows,
	}, nil
}