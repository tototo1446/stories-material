<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ストーリーズ背景画像生成ツール

Instagramストーリーズ用の「文字入れ専用」背景画像をAIで生成するツールです。Adobe Firefly APIを使用して、台本から自動的に複数の背景画像を生成します。

## 機能

- **文字入れ専用背景生成**: InstagramのUI要素を考慮した余白（ネガティブスペース）を自動計算
- **ブランド学習**: ブランドカラー、ロゴ、フォント設定を保存して一貫性を維持
- **一括生成**: 台本から複数スライドの背景を一度に生成
- **画像ダウンロード**: 生成した画像をJPG/PNG形式でダウンロード
- **エディットパレット**: 生成後の画像を微調整（ぼかし、明度、ブランドカラー適用）

## アーキテクチャ

```
フロントエンド (React + Vite)
    ↓ HTTP API
バックエンド (Express + TypeScript)
    ↓ REST API + OAuth 2.0
Adobe Firefly API (画像生成)
```

## セットアップ

### 前提条件

- Node.js 18以上
- Adobe Firefly API認証情報（[Adobe Developer Console](https://developer.adobe.com/console)で取得）
  - Client ID
  - Client Secret

### インストール手順

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd stories-material
   ```

2. **フロントエンドの依存関係をインストール**
   ```bash
   npm install
   ```

3. **バックエンドの依存関係をインストール**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **環境変数の設定**

   **バックエンド** (`backend/.env`):
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   `.env`に以下を設定：
   ```env
   ADOBE_FIREFLY_CLIENT_ID=your-adobe-firefly-client-id-here
   ADOBE_FIREFLY_CLIENT_SECRET=your-adobe-firefly-client-secret-here
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```
   
   **Adobe Firefly API認証情報の取得方法**:
   
   詳細な手順は [`ADOBE_FIREFLY_SETUP.md`](./ADOBE_FIREFLY_SETUP.md) を参照してください。
   
   簡単な手順：
   1. [Adobe Developer Console](https://developer.adobe.com/console)にアクセス
   2. 新しいプロジェクトを作成
   3. 「APIを追加する」→「Adobe Firefly サービス」を選択
   4. 「保存」をクリックしてClient IDを取得
   5. 左メニューから「OAuth Server-to-Server」を選択
   6. 「Retrieve client secret」をクリックしてClient Secretを取得（一度しか表示されません）
   
   **フロントエンド** (`.env.local`):
   ```bash
   cp .env.local.example .env.local
   ```
   
   `.env.local`に以下を設定：
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```
   
   **注意**: `.env`と`.env.local`はGitにコミットしないでください（`.gitignore`に含まれています）

5. **アプリの起動**

   ターミナルを2つ開いて、それぞれで実行：

   **バックエンド**:
   ```bash
   cd backend
   npm run dev
   ```
   
   **フロントエンド**:
   ```bash
   npm run dev
   ```
   
   ブラウザで `http://localhost:3000` を開きます。

## 使用方法

1. **ブランド設定**（初回のみ推奨）
   - サイドバーの「ブランドプリセット」タブを開く
   - メインカラー（HEX）、ロゴ、フォントを設定
   - 設定は自動的にローカルストレージに保存されます

2. **背景画像の生成**
   - 「生成ダッシュボード」タブで台本を入力、またはテーマを指定
   - ストーリーの目的と雰囲気を選択
   - 「文字入れ専用背景を生成」ボタンをクリック
   - 生成中の進捗が表示されます

3. **画像の調整とダウンロード**
   - 生成された画像をクリックして選択
   - エディットパレットで微調整（ぼかし、明度、ブランドカラー適用）
   - 「背景を保存」ボタンで個別ダウンロード、または「すべて保存」で一括ダウンロード

## プロジェクト構造

```
.
├── backend/                    # バックエンドAPIサーバー
│   ├── src/
│   │   ├── server.ts          # Expressサーバー起動
│   │   ├── routes/
│   │   │   └── images.ts      # 画像生成エンドポイント
│   │   ├── services/
│   │   │   ├── fireflyService.ts     # Adobe Firefly API連携
│   │   │   └── promptBuilder.ts      # プロンプトエンジニアリング
│   │   └── types.ts           # 型定義
│   ├── package.json
│   └── tsconfig.json
├── services/
│   └── imageGenerationService.ts    # フロントエンド画像生成サービス
├── utils/
│   ├── imageDownload.ts       # 画像ダウンロード機能
│   └── storage.ts             # ローカルストレージ管理
├── components/
│   ├── EditPalette.tsx        # エディットパレット
│   ├── InstagramOverlay.tsx   # Instagram UIガイド
│   └── ErrorToast.tsx          # エラー通知コンポーネント
├── types.ts                   # TypeScript型定義
├── App.tsx                    # メインコンポーネント
└── package.json
```

## API仕様

### POST /api/images/generate

画像を生成するエンドポイント。

**リクエストボディ:**
```json
{
  "script": "台本の内容（改行区切り）",
  "theme": "テーマ・キーワード",
  "goal": "共感 (Empathy) | 教育 (Education) | 販売 (Sales) | ライフスタイル (Lifestyle)",
  "atmosphere": "ミニマル | エレガント | ポップ | ナチュラル | ラグジュアリー | フューチャリスティック",
  "brandColor": "#6366f1",
  "subColor": "#000000",
  "count": 3
}
```

**レスポンス:**
```json
{
  "images": [
    {
      "id": "slide-1-1234567890",
      "url": "https://...",
      "prompt": "生成に使用したプロンプト",
      "slideNumber": 1,
      "resolution": "1080x1920"
    }
  ]
}
```

## プロンプトエンジニアリング

バックエンドの`promptBuilder.ts`で、以下の要素を考慮したプロンプトを自動生成します：

- **ネガティブスペース**: Instagram UI要素（左上プロフィール、右上閉じるボタン、下部入力欄）を避けた中央エリアの確保
- **目的別構図**: 共感/教育/販売/ライフスタイルに応じた構図パターン
- **雰囲気**: ミニマル/エレガント/ポップ等のスタイル反映
- **ブランドカラー**: 指定されたブランドカラーパレットの適用

## トラブルシューティング

### バックエンドサーバーに接続できない場合

- バックエンドサーバーが起動しているか確認（`cd backend && npm run dev`）
- `.env.local`の`VITE_API_BASE_URL`が正しく設定されているか確認
- ポート3001が他のプロセスで使用されていないか確認

### 画像が生成されない場合

- `backend/.env`の`ADOBE_FIREFLY_CLIENT_ID`と`ADOBE_FIREFLY_CLIENT_SECRET`が正しく設定されているか確認
- Adobe Firefly APIのクォータとレート制限を確認
- バックエンドのコンソールでエラーメッセージを確認
- Adobe Developer ConsoleでAPIアクセスが有効になっているか確認

### CORSエラーが発生する場合

- `backend/.env`の`CORS_ORIGIN`が`http://localhost:3000`に設定されているか確認
- バックエンドサーバーを再起動

## ライセンス

このプロジェクトは個人利用・商用利用可能です。