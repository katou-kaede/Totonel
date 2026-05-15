package dialog

import (
	"context"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// OS標準のファイル選択ダイアログを開き、選択されたパスを返します
func SelectFile(ctx context.Context, title string, filter string) (string, error) {
	selection, err := runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Excel/CSV Files (*.xlsx; *.csv)",
				Pattern:     filter,
			},
		},
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}