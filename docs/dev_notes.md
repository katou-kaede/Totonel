# Webアプリ
- プロジェクトを立ち上げる  
`go mod init アプリ名`  
（go.mod が requirements.txt と venv の両方の役目を果たす）

- コード内の import を見て、足りないライブラリを自動でダウンロード  
`go mod tidy`
　
- コンパイル（ビルド）と実行を一度に行う  
`go run ファイル名.go`
　
- 実行ファイル（.exe など）を生成  
`go build`
　
- ライブラリをダウンロードしてプロジェクトに追加  
`go get パッケージURL`

    ```bash
    # SQLite  
    　　go get github.com/glebarez/sqlite
    # Echo  
    　　go get github.com/labstack/echo/v4
    # GORM（GoのORM）  
    　　go get gorm.io/gorm
    ```
　　
- ホットリロード機能  
    1. インストール  
    `bash go install github.com/air-verse/air@latest`  
    ※グローバルにインストールするので一度やればOK
　
    2. air -v で確認
　
    3. air init を実行
　
    4. `backend/.air.toml` ファイルを書き換える
        ```
        cmd = "go build -o ./tmp/main.exe ./mainのある場所（./cmd/server/main.goなど）"
        ```
　
- Echoのサーバー起動時のWindows許可を省略する
    ```go
    e.Logger.Fatal(e.Start("127.0.0.1:8080"))
    ```
　
　
# デスクトップアプリ 
> **Wails: 「GoがReact（Vite）を内包している」**

- Wails（フレームワーク）を使用する。
    ```bash
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    # ※グローバルにインストールするので一度やればOK
    ```
　
- プロジェクトを立ち上げる
    ```bash
    wails init -n アプリ名 -t react-ts
    # -n: アプリの名前（フォルダ名になります）
    # -t: テンプレート（React + TypeScript を指定）
    ```
　
- 開発モードで実行  
`wails dev`
　
- ビルド  
`wails build`


※Wailsのフロントエンド環境は最新ではないので、Tailwind V4.0などを使いたい場合はTypescriptとViteをアップデートする必要がある。


# Vite
- セットアップ  
    ディレクトリに移動して、`npm create vite@latest .`を実行  
    ※途中で質問が出たら`「React」→「TypeScript」`を選択

    ルートディレクトリ直下で以下を実行でもOK  
    `npm create vite@latest frontend -- --template react-ts`
　
- 必要なパッケージをインストール  
`npm install`
　
- API通信用のライブラリ「axios」をインストール  
`npm install axios`


# Tailwind 
- Tailwind CSS v4.0をインストール  
`npm install @tailwindcss/vite`
　
- vite.config.js でTailwind CSSをインポート
``` go
	import { defineConfig } from 'vite'
	import react from '@vitejs/plugin-react'
+	import tailwindcss from '@tailwindcss/vite'

	// https://vite.dev/config/
	export default defineConfig({
+	  plugins: [react(), tailwindcss()],
	})
```
	
- src/index.cssでTailwind CSSをインポート  
`@import 'tailwindcss';`
　
　
- 開発サーバーを起動  
`npm run dev`
