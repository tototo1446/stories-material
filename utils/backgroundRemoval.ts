import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export interface RemovalProgress {
  message: string;
  progress: number; // 0-1
}

/**
 * 画像ファイルの背景を透過処理し、PNG形式のFileとして返す。
 * 失敗時は例外をスローする（呼び出し側でフォールバック処理を行う）。
 */
export async function removeBackground(
  file: File,
  onProgress?: (p: RemovalProgress) => void,
): Promise<File> {
  const blob = await imglyRemoveBackground(file, {
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const ratio = total > 0 ? current / total : 0;
      const messages: Record<string, string> = {
        'downloading': 'AIモデルを読み込み中...',
        'computing:inference': '背景を解析中...',
        'postprocessing': '透過処理を仕上げ中...',
      };
      onProgress({
        message: messages[key] || '背景を透過中...',
        progress: ratio,
      });
    },
  });

  const name = file.name.replace(/\.[^.]+$/, '.png');
  return new File([blob], name, { type: 'image/png' });
}
