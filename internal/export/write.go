package export

import (
	"encoding/csv"
	"os"
	"strings"
	"fmt"
	"github.com/xuri/excelize/v2"
)

func WriteExcel(path string, data [][]string) error {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "Sheet1"
	for i, row := range data {
		for j, val := range row {
			// --- ここが重要：データ内のBOMを除去してから書き込む ---
            cleanVal := strings.ReplaceAll(val, "\ufeff", "")

			cell, _ := excelize.CoordinatesToCellName(j+1, i+1)
			f.SetCellValue(sheet, cell, cleanVal)
		}
	}
	// 保存実行
    if err := f.SaveAs(path); err != nil {
        return fmt.Errorf("他のプロセスがファイルを使用している可能性があります。ファイルを閉じてから再試行してください: %w", err)
    }
    return nil
}

func WriteCSV(path string, data [][]string) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("他のプロセスがファイルを使用している可能性があります。ファイルを閉じてから再試行してください: %w", err)
	}
	defer f.Close()

	// UTF-8 with BOMで書き込む（Excelでの文字化け対策）
	f.Write([]byte{0xEF, 0xBB, 0xBF})

	w := csv.NewWriter(f)
	w.Comma = ','
	for _, row := range data {
		if err := w.Write(row); err != nil {
			return err
		}
	}
	w.Flush()
	return w.Error()
}