import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imagesRouter from './routes/images';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ミドルウェア
// 開発環境では複数のオリジンを許可
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [CORS_ORIGIN]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // 開発環境ではoriginがundefinedの場合（同一オリジンリクエストなど）も許可
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policyでブロックされました'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// APIルート
app.use('/api/images', imagesRouter);

// エラーハンドリング
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    error: 'サーバー内部エラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 バックエンドサーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📡 CORS設定: ${CORS_ORIGIN}`);
  
  if (!process.env.ADOBE_FIREFLY_CLIENT_ID || !process.env.ADOBE_FIREFLY_CLIENT_SECRET) {
    console.warn('⚠️  Adobe Firefly APIの認証情報が設定されていません。ADOBE_FIREFLY_CLIENT_IDとADOBE_FIREFLY_CLIENT_SECRETを.envファイルに設定してください。');
  }
});