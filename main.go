package main

import (
	"embed"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// ユーザーのAppDataフォルダ内に「Totonel/app.log」を作る
	configDir, _ := os.UserConfigDir()
	logPath := filepath.Join(configDir, "Totonel", "app.log")
	// ログファイルが既に存在する場合は削除（新しいログで上書き）
	os.Remove(logPath)

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Totonel",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Logger: logger.NewFileLogger(logPath),
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
