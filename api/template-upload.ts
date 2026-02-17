import { put } from '@vercel/blob';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const filename = req.query.filename as string;
  if (!filename) {
    return res.status(400).json({ error: 'filename is required' });
  }

  try {
    const folder = (req.query.folder as string) || 'templates';
    const blob = await put(`${folder}/${filename}`, req, {
      access: 'public',
    });

    return res.json({ url: blob.url });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
