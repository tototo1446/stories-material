# タスク: Adobe Firefly API統合の確認と設定

## 現状確認
- ✅ `backend/src/services/fireflyService.ts` - Firefly API実装済み
- ✅ `backend/src/routes/images.ts` - Firefly APIを使用したルート実装済み
- ✅ `backend/src/services/promptBuilder.ts` - プロンプト生成実装済み
- ⚠️ README.mdにGemini APIの記載が残っている（Firefly APIに更新が必要）

## 実施タスク

1. **README.mdの更新**
   - Gemini APIの記載をFirefly APIに置き換え
   - 環境変数の設定手順をFirefly API用に更新

2. **環境変数設定の確認**
   - `.env.example`がFirefly API用になっているか確認
   - 必要に応じて更新

3. **動作確認**
   - 環境変数が正しく設定されているか確認
   - エラーメッセージが適切か確認
