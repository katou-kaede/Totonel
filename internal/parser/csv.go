package parser

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"

	"Totonel/internal/template"

	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/transform"
)

// CSVResponse はフロントエンドに返す型（ExcelResponseとプロパティを合わせる）
type CSVResponse struct {
	Headers     []template.ColumnInfo   `json:"headers"`
	Delimiter   string     `json:"delimiter"`
	Encoding    string     `json:"encoding"`
	PreviewRows [][]string `json:"previewRows"`
}

func GetCSVHeaders(path string, headerRow int, delimiterStr string, encoding string) (*CSVResponse, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	// 1. 文字コードに応じたデコーダーを噛ませる
	var r io.Reader = f
	if encoding == "Shift-JIS" {
		r = transform.NewReader(f, japanese.ShiftJIS.NewDecoder())
	}

	// 2. CSV Reader の初期化
	reader := csv.NewReader(r)
	
	// 区切り文字の設定
	if delimiterStr == "\\t" {
		reader.Comma = '\t'
	} else if len(delimiterStr) > 0 {
		reader.Comma = rune(delimiterStr[0])
	} else {
		reader.Comma = ',' // デフォルト
	}

	reader.LazyQuotes = true // ダブルクォートの扱いを緩くする（エラー防止）

	var headers []template.ColumnInfo
	var previewRows [][]string

	// 3. 解析（指定行まで読み飛ばしつつヘッダーとプレビューを取得）
	for i := 1; i <= headerRow+3; i++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// 解析失敗時はそこまでのデータで返すかエラーにする
			return nil, fmt.Errorf("%d行目の解析に失敗しました: %v", i, err)
		}

		if i == headerRow {
			// まずは有効なテキストがあるかチェック
			isEmpty := true
			for _, h := range record {
				if h != "" {
					isEmpty = false
					break
				}
			}
			if isEmpty {
				return nil, fmt.Errorf("指定された行（%d）にはデータが含まれていません", headerRow)
			}

			for index, name := range record {
                headers = append(headers, template.ColumnInfo{
                    Index: index,
                    Name:  name,
                })
            }
		} else if i > headerRow && i <= headerRow+3 {
			// ヘッダー直後の3行をプレビュー用にする
			previewRows = append(previewRows, record)
		}
	}

	//  返却用の区切り文字を調整
    returnedDelimiter := string(reader.Comma)
    if reader.Comma == '\t' {
        returnedDelimiter = "\\t" // 本物のタブを "\t" という文字列に置換
    }

	return &CSVResponse{
		Headers:     headers,
		Delimiter:   returnedDelimiter,
		Encoding:    encoding,
		PreviewRows: previewRows,
	}, nil
}