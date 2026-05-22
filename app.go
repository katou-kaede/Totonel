package main

import (
	"context"
	"log"
	"fmt"
	"strings"
	"path/filepath"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	// "gorm.io/driver/sqlite" // GCCが必要
	"github.com/glebarez/sqlite" // 純Go製のSQLiteドライバ
	"gorm.io/gorm"

	"Totonel/internal/models"
	"Totonel/internal/dialog"
	"Totonel/internal/parser"
	"Totonel/internal/template"
	"Totonel/internal/export"
)

// App struct
type App struct {
	ctx context.Context
	db *gorm.DB
	version string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{ version: "1.0.0"}
}


func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// DB接続(Current Directoryにapp.dbを作成)
	// db, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{})
	// if err != nil {
	// 	log.Fatal("データベースの接続に失敗しました:", err)
	// }

	// DB接続(OSごとの保存場所にapp.dbを作成) 
	// Windows: Users\ユーザー名\AppData\Roaming\, Mac: Users/ユーザー名/Library/Application Support/, Linux: home/ユーザー名/.config/
	// ユーザーのアプリデータディレクトリを取得
    configDir, err := os.UserConfigDir()
    if err != nil {
        log.Fatal("設定ディレクトリの取得に失敗しました:", err)
    }

    // アプリ専用のフォルダパスを作成 (例: AppName フォルダ)
    appDir := filepath.Join(configDir, "Totonel")
    
    // フォルダがなければ作成
    if _, err := os.Stat(appDir); os.IsNotExist(err) {
        os.MkdirAll(appDir, 0755)
    }

    // フルパスでDBを開く
    dbPath := filepath.Join(appDir, "app.db")
    db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})

	// マイグレーション
	err = db.AutoMigrate(
		&models.Template{},
		&models.FromTemplateConfig{},
		&models.Mapping{},
		&models.MappingSource{},
	)
	if err != nil {
		log.Fatal("マイグレーションに失敗しました:", err)
	}

	a.db = db

}

func (a *App) GetVersion() string {
	return a.version
}

// Wailsの仕組み上、React側から呼び出せるのは
// App 構造体に紐付いたメソッドだけ という制限があるため呼び出し用のラッパーを用意

// OS標準のファイル選択ダイアログを開き、選択されたパスを返す
func (a *App) SelectFile(title string, filter string) (string, error) {
	return dialog.SelectFile(a.ctx, title, filter)
}

// ヘッダー行を抽出
func (a *App) GetFileHeaders(path string, headerRow int, delimiter string, encoding string) (interface{}, error) {
	ext := strings.ToLower(filepath.Ext(path))

	if ext == ".csv" {
		// CSVの場合：画面で指定された区切り文字と文字コードを反映する
		return parser.GetCSVHeaders(path, headerRow, delimiter, encoding)
	}

    // UIの1始まりをGoの0始まりに補正して渡す
    return parser.GetExcelHeaders(path, headerRow-1)
}

// テンプレートの保存
func (a *App) SaveTemplate(name string, fromConfig template.FromConfig, inputs []template.MappingInput) error {
	return template.Save(a.db, name, fromConfig, inputs)
}

// テンプレートの更新
func (a *App) UpdateTemplate(id uint, name string, fromConfig template.FromConfig, inputs []template.MappingInput) error {
	return template.Update(a.db, id, name, fromConfig, inputs)
}

// テンプレートの削除
func (a *App) DeleteTemplate(id uint) error {
    return template.Delete(a.db, id)
}

// 出力
func (a *App) ExportFile(format string, config template.FromConfig, mappings []template.MappingInput) error {
	// 読み込み
	var rows [][]string
	var err error
	if config.FileType == "csv" {
		rows, err = export.ReadCSV(config)
	} else {
		rows, err = export.ReadExcel(config.Path)
	}
	if err != nil { return err }

	// マッピングに従って変換
	outputData := export.Transform(rows, mappings, config)

	// 保存先を選択するダイアログを表示
	extention := "xlsx"
	if format == "csv" {
		extention = "csv"
	}
    outputPath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        Title:           "保存先を選択",
        DefaultFilename: "output",
        Filters: []runtime.FileFilter{
            {DisplayName: "format", Pattern: "*." + extention},
        },
    })
    if err != nil || outputPath == "" {
        return nil // キャンセルされた場合
    }

	// 書き出し
	switch format {
	case "csv":
		return export.WriteCSV(outputPath, outputData)
	case "excel":
		return export.WriteExcel(outputPath, outputData)
	default:
		runtime.LogErrorf(a.ctx, "未対応のフォーマットが指定されました: %s", format)
		return fmt.Errorf("未対応のフォーマットです: %s", format)
	}
}

// GetTemplates テンプレート一覧を取得（HomeScreen用）
func (a *App) GetTemplates() ([]models.Template, error) {
    var tmpl []models.Template
    // Preloadで関連テーブルも一緒に持ってくる
    if err := a.db.Preload("FromTemplateConfig").Find(&tmpl).Error; err != nil {
		runtime.LogErrorf(a.ctx, "テンプレート一覧の取得に失敗: %v", err)
        return nil, fmt.Errorf("テンプレート一覧の取得に失敗しました: %w", err)
    }
    return tmpl, nil
}

// GetTemplateByID 特定のテンプレート詳細を取得（実行画面用）
func (a *App) GetTemplateByID(id uint) (*models.Template, error) {
    var tmpl models.Template
    err := a.db.Preload("FromTemplateConfig").
                Preload("Mappings.Sources").
                First(&tmpl, id).Error
    if err != nil {
		runtime.LogErrorf(a.ctx, "テンプレート(ID:%d)の取得に失敗: %v", id, err)
        return nil, fmt.Errorf("テンプレート(ID:%d)が見つかりません: %w", id, err)
    }
    return &tmpl, nil
}