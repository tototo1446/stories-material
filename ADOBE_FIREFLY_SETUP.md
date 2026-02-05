# Adobe Firefly API 認証情報の取得手順

このドキュメントでは、Adobe Firefly APIを使用するために必要な**Client ID**と**Client Secret**の取得方法を詳しく説明します。

## 前提条件

- Adobeアカウント（無料で作成可能）
- Adobe Developer Consoleへのアクセス権限

## 手順

### ステップ1: Adobe Developer Consoleにアクセス

1. [Adobe Developer Console](https://developer.adobe.com/console)にアクセス
2. Adobeアカウントでログイン（まだアカウントがない場合は作成）

### ステップ2: プロジェクトを作成

1. コンソールのトップページで**「プロジェクトを作成」**または**「Create project」**をクリック
2. プロジェクト名を入力（例: `Story Background Generator`）
3. **「作成」**または**「Create」**をクリック

### ステップ3: Adobe Firefly APIを追加

1. プロジェクト画面で**「APIを追加する」**または**「Add API」**をクリック
2. **「Adobe Firefly サービス」**を検索または選択
3. **「次へ」**または**「Next」**をクリック

### ステップ4: Client IDを取得

1. API設定画面で**「保存」**または**「Save configured API」**をクリック
2. 次の画面で**Client ID**（APIキー）が表示されます
3. このClient IDをコピーして保存してください

   ```
   例: 1234567890abcdef1234567890abcdef@AdobeOrg
   ```

### ステップ5: Client Secretを取得

1. 左側のナビゲーションメニューから**「OAuth Server-to-Server」**を選択
2. **「Retrieve client secret」**または**「クライアントシークレットを取得」**ボタンをクリック
3. Client Secretが表示されます（**一度しか表示されないため、必ずコピーして保存してください**）

   ```
   例: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```

### ステップ6: 環境変数に設定

取得した認証情報をバックエンドの`.env`ファイルに設定します：

```bash
cd backend
cp .env.example .env
```

`.env`ファイルを開いて、以下のように設定：

```env
ADOBE_FIREFLY_CLIENT_ID=取得したClient_IDをここに貼り付け
ADOBE_FIREFLY_CLIENT_SECRET=取得したClient_Secretをここに貼り付け
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**重要**: `.env`ファイルはGitにコミットしないでください（既に`.gitignore`に含まれています）

## トラブルシューティング

### Client Secretが表示されない場合

- **「OAuth Server-to-Server」**タブが表示されない場合は、API設定画面で**「OAuth Server-to-Server」**を有効にする必要があります
- 一度Client Secretを取得した後は再表示できないため、必ずコピーして安全な場所に保存してください

### APIが利用できない場合

- Adobe Firefly APIは有料ライセンスまたはサブスクリプションが必要な場合があります
- 無料トライアルが利用可能な場合もあります
- APIが無効になっている場合は、[Adobeの営業担当者](https://www.adobe.com/jp/contact.html)にお問い合わせください

### 認証エラーが発生する場合

1. Client IDとClient Secretが正しく設定されているか確認
2. 環境変数ファイル（`.env`）が正しい場所にあるか確認（`backend/.env`）
3. バックエンドサーバーを再起動
4. バックエンドのコンソールでエラーメッセージを確認

## セキュリティに関する注意事項

⚠️ **重要**: Client IDとClient Secretは機密情報です

- ✅ 環境変数ファイル（`.env`）に保存する
- ✅ `.gitignore`に含まれていることを確認（Gitにコミットしない）
- ❌ コードに直接書かない
- ❌ 公開リポジトリにコミットしない
- ❌ クライアント側（フロントエンド）のコードに含めない

## 参考リンク

- [Adobe Developer Console](https://developer.adobe.com/console)
- [Adobe Firefly API ドキュメント](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/)
- [認証ガイド](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/authentication/)
