(function () {
  if (typeof io === 'undefined') return;
  var socket = io();
  window.SnapLamSocket = socket;

  var msgsEl = document.getElementById('chatMsgs');
  var inputEl = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var toastStack = document.getElementById('toastStack');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addMsg(m) {
    if (!msgsEl) return;
    var div = document.createElement('div');
    div.className = 'chat-msg';
    var roleTag = m.role === 'admin' ? ' 👑' : '';
    div.innerHTML = '<b>' + esc(m.username) + roleTag + ':</b> ' + esc(m.message);
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  socket.on('chat:history', function (history) {
    if (!msgsEl) return;
    msgsEl.innerHTML = '';
    history.forEach(function (m) {
      addMsg({ username: m.username, message: m.message });
    });
  });

  socket.on('chat:message', addMsg);

  function send() {
    if (!inputEl) return;
    var val = inputEl.value.trim();
    if (!val) return;
    socket.emit('chat:send', val);
    inputEl.value = '';
  }

  if (sendBtn) sendBtn.addEventListener('click', send);
  if (inputEl) inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') send();
  });

  function showToast(title, message) {
    if (!toastStack) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<b>' + esc(title) + '</b>' + esc(message);
    toastStack.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .4s';
      setTimeout(function () { t.remove(); }, 400);
    }, 6000);
  }

  socket.on('notif:broadcast', function (data) {
    showToast('📢 Notifikasi dari ' + data.from, data.message);
  });

  window.SnapLamToast = showToast;
})();
