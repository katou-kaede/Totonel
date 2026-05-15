package template

import (
	"Totonel/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
)


func Save(db *gorm.DB, name string, fromConfig FromConfig, inputs []MappingInput) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// テンプレートの保存
		newTemplate := models.Template{Name: name}
		if err := tx.Create(&newTemplate).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return fmt.Errorf("テンプレート名 '%s' は既に存在しています。別の名前を使用してください。", name)
			}
			return err
		}

		config := models.FromTemplateConfig{
            TemplateID:     newTemplate.ID,
            FileType:       fromConfig.FileType,
            HeaderRowIndex: fromConfig.HeaderRow, // 0-indexedに調整
            // SheetName:      fromConfig.SheetName,
            Delimiter:      fromConfig.Delimiter,
			Encoding:       fromConfig.Encoding,
        }
        if err := tx.Create(&config).Error; err != nil {
            return err
        }

		// MappingとMappingSourceの保存
		for i, input := range inputs {
			ruleJSON, _ := json.Marshal(input.TransformRules)

			mapping := models.Mapping{
				TemplateID: newTemplate.ID,
				ToColumnName: input.ToField.Name,
				ToColumnIndex: input.ToField.Index,
				MappingType: input.Type,
				ConstantValue: input.ConstantValue,
				TransformRules: string(ruleJSON),
				SortOrder: i,
			}

			if err := tx.Create(&mapping).Error; err != nil {
				return err
			}

			// MappingType が 'const' の場合は Sources を作成しない
			if input.Type == "const" {
				continue 
			}

			for priority, fromField := range input.FromFields {
				// 空のカラム名は保存しない（固定値のみの場合など）
                if fromField.Name == "" {
                    continue
                }

				source := models.MappingSource{
					MappingID: mapping.ID,
					FromColumnName: fromField.Name,
					FromColumnIndex: fromField.Index,
					Priority: priority + 1,  // 優先順位は1から始まる
				}
				if err := tx.Create(&source).Error; err != nil {
					return err
				}
			}
		}
		log.Printf("テンプレート '%s' が保存されました (ID: %d)", name, newTemplate.ID)
		return nil
	})
}


func Update(db *gorm.DB, id uint, name string, fromConfig FromConfig, inputs []MappingInput) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 1. テンプレート名の更新
		var t models.Template
		if err := tx.First(&t, id).Error; err != nil {
			return fmt.Errorf("テンプレートが見つかりません (ID: %d): %v", id, err)
		}
		
		t.Name = name
		if err := tx.Save(&t).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return fmt.Errorf("テンプレート名 '%s' は既に存在しています。別の名前を使用してください。", name)
			}
			return err
		}

		// 2. 既存の FromTemplateConfig と Mappings を削除（物理削除推奨）
		if err := tx.Where("template_id = ?", id).Delete(&models.FromTemplateConfig{}).Error; err != nil {
			return err
		}

		// 既存の Mapping ID を取得して、それに関連する MappingSource を削除
		var oldMappings []models.Mapping
		tx.Where("template_id = ?", id).Find(&oldMappings)
		for _, m := range oldMappings {
			tx.Where("mapping_id = ?", m.ID).Delete(&models.MappingSource{})
		}
		// Mapping 自体を削除
		if err := tx.Where("template_id = ?", id).Delete(&models.Mapping{}).Error; err != nil {
			return err
		}

		// 3. データの再作成 (Save関数とほぼ同じロジック)
		config := models.FromTemplateConfig{
			TemplateID:     id,
			FileType:       fromConfig.FileType,
			HeaderRowIndex: fromConfig.HeaderRow,
			Delimiter:      fromConfig.Delimiter,
			Encoding:       fromConfig.Encoding,
		}
		if err := tx.Create(&config).Error; err != nil {
			return err
		}

		for i, input := range inputs {
			ruleJSON, _ := json.Marshal(input.TransformRules)

			mapping := models.Mapping{
				TemplateID:    id,
				ToColumnName:  input.ToField.Name,
				ToColumnIndex: input.ToField.Index,
				MappingType:   input.Type,
				ConstantValue: input.ConstantValue,
				TransformRules: string(ruleJSON),
				SortOrder:     i,
			}

			if err := tx.Create(&mapping).Error; err != nil {
				return err
			}

			// MappingType が 'const' の場合は Sources を作成しない
			if input.Type == "const" {
				continue 
			}

			for priority, fromField := range input.FromFields {
				if fromField.Name == "" {
					continue
				}

				source := models.MappingSource{
					MappingID:      mapping.ID,
					FromColumnName: fromField.Name,
					FromColumnIndex: fromField.Index,
					Priority:       priority + 1,
				}
				if err := tx.Create(&source).Error; err != nil {
					return err
				}
			}
		}

		log.Printf("テンプレート ID: %d ('%s') が更新されました", id, name)
		return nil
	})
}


func Delete(db *gorm.DB, id uint) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // 子要素(MappingSource)をMapping経由で削除
        tx.Where("mapping_id IN (?)", tx.Model(&models.Mapping{}).Select("id").Where("template_id = ?", id)).Delete(&models.MappingSource{})
        
        // Mappingを削除
        tx.Where("template_id = ?", id).Delete(&models.Mapping{})
        
        // ファイル設定を削除
        tx.Where("template_id = ?", id).Delete(&models.FromTemplateConfig{})
        
        // 最後にテンプレート本体を削除
        if err := tx.Delete(&models.Template{}, id).Error; err != nil {
            return err
        }
        
        return nil
    })
}