const cookie = require('cookie');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

module.exports = function (io) {
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      if (!raw) return next(new Error('unauthorized'));
      const parsed = cookie.parse(raw);
      const payload = verifyToken(parsed.snaplam_token);
      if (!payload) return next(new Error('unauthorized'));
      socket.user = payload;
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user:${user.id}`);
    socket.join('chat');
    if (user.role === 'admin') socket.join('admin');

    socket.emit('chat:history', db.prepare(
      'SELECT username, message, created_at FROM chat_messages ORDER BY id DESC LIMIT 50'
    ).all().reverse());

    io.to('chat').emit('chat:presence', { username: user.username, event: 'join' });

    socket.on('chat:send', (msg) => {
      if (!msg || typeof msg !== 'string') return;
      const text = msg.trim().slice(0, 500);
      if (!text) return;
      db.prepare('INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)')
        .run(user.id, user.username, text);
      io.to('chat').emit('chat:message', {
        username: user.username,
        message: text,
        role: user.role,
        time: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      io.to('chat').emit('chat:presence', { username: user.username, event: 'leave' });
    });
  });
};
