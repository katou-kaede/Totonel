package export

import (
	"Totonel/internal/template"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"github.com/xuri/excelize/v2"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/transform"
)

func ReadExcel(path string) ([][]string, error) {
	f, err := excelize.OpenFile(path)
	if err != nil {
		return nil, fmt.Errorf("Excelファイルを開けませんでした: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("シートが見つかりません")
	}

	// 最初のシートを使用
	rows, err := f.GetRows(sheets[0], excelize.Options{RawCellValue: true})
	if err != nil {
		return nil, fmt.Errorf("データの取得に失敗しました: %w", err)
	}

	return rows, nil
}


func ReadCSV(config template.FromConfig) ([][]string, error) {
	f, err := os.Open(config.Path)
	if err != nil {
		return nil, fmt.Errorf("CSVファイルを開けませんでした: %w", err)
	}
	defer f.Close()

	var reader io.Reader = f
	// SJISならデコーダーを通す（文字化け防止）
	if config.Encoding == "Shift-JIS" {
		reader = transform.NewReader(f, japanese.ShiftJIS.NewDecoder())
	}

	csvReader := csv.NewReader(reader)
	
	// 区切り文字の設定
	if config.Delimiter == "\\t" {
		// タブ記号（エスケープされた文字列）の場合は明示的にタブ文字をセット
		csvReader.Comma = '\t'
	} else if len(config.Delimiter) > 0 {
		// 1文字の指定がある場合（";" や "," など）はその文字をセット
		// config.Delimiter は string なので、その最初の1文字を rune として取り出す
		csvReader.Comma = rune(config.Delimiter[0])
	} else {
		// 万が一、空文字などで指定がない場合のデフォルト
		csvReader.Comma = ','
	}

	// 全行読み込み（内部で自動的にUTF-8に変換される）
	rows, err := csvReader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("CSVの解析に失敗しました: %w", err)
	}

	return rows, nil
}