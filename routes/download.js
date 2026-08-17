const express = require('express');
const db = require('../db');
const { requireAuthApi } = require('../middleware/auth');

const router = express.Router();
const DOWNLOAD_API_URL = process.env.DOWNLOAD_API_URL || 'https://dl.valore.web.id/api/download';

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'Facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'Twitter/X';
  return 'Lainnya';
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

module.exports = function (io) {
  router.post('/download', requireAuthApi, async (req, res) => {
    const { url, resolution } = req.body;
    const user = req.user;
    const userRoom = `user:${user.id}`;
    const res_ = resolution || '720p';

    const log = (message, level = 'info') => {
      const payload = { message, level, time: new Date().toISOString() };
      io.to(userRoom).emit('terminal:log', payload);
      io.to('admin').emit('admin:log', { ...payload, username: user.username });
    };

    if (!url || !isValidUrl(url)) {
      log('URL tidak valid. Pastikan link dimulai dengan http:// atau https://', 'error');
      return res.status(400).json({ ok: false, message: 'URL tidak valid' });
    }

    const platform = detectPlatform(url);
    log(`Menerima permintaan unduhan dari ${platform} (${res_})...`, 'info');
    log(`Menghubungi server SnapLam API...`, 'info');

    let record = {
      status: 'error',
      result_url: null,
      message: 'Gagal tidak diketahui'
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const apiRes = await fetch(DOWNLOAD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': 'cli-' + Date.now()
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      log(`Menerima respons dari server (HTTP ${apiRes.status})...`, 'info');

      let data;
      try {
        data = await apiRes.json();
      } catch (e) {
        data = null;
      }

      if (!apiRes.ok || !data) {
        record.status = 'gagal';
        record.message = `Server API merespons error (HTTP ${apiRes.status})`;
        log(record.message, 'error');
      } else if (data.error || data.status === false || data.success === false) {
        record.status = 'gagal';
        record.message = data.message || data.error || 'API menolak permintaan.';
        log(`Gagal: ${record.message}`, 'error');
      } else {
        const resultUrl =
          data.url || data.result || data.data?.url || data.data?.result ||
          (Array.isArray(data.data) ? data.data[0]?.url : null) || null;

        record.status = 'sukses';
        record.result_url = resultUrl;
        record.message = 'Unduhan berhasil diproses.';
        log('Memproses hasil media...', 'info');
        log(resultUrl ? `Sukses! Media siap diunduh.` : 'Sukses, namun link hasil tidak ditemukan pada respons.', 'success');
      }
    } catch (err) {
      record.status = 'error';
      record.message = err.name === 'AbortError' ? 'Timeout menghubungi server API.' : `Error: ${err.message}`;
      log(record.message, 'error');
    }

    const info = db.prepare(
      `INSERT INTO downloads (user_id, username, url, platform, resolution, status, result_url, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, user.username, url, platform, res_, record.status, record.result_url, record.message);

    log(`Riwayat disimpan (#${info.lastInsertRowid}).`, 'info');

    res.json({
      ok: record.status === 'sukses',
      id: info.lastInsertRowid,
      platform,
      resolution: res_,
      status: record.status,
      result_url: record.result_url,
      message: record.message
    });
  });

  router.get('/history', requireAuthApi, (req, res) => {
    const rows = db.prepare(
      'SELECT * FROM downloads WHERE user_id = ? ORDER BY id DESC LIMIT 100'
    ).all(req.user.id);
    res.json({ ok: true, data: rows });
  });

  return router;
};
