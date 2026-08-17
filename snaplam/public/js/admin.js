(function () {
  var logsBody = document.getElementById('adminLogsBody');
  var notifForm = document.getElementById('notifForm');
  var notifInput = document.getElementById('notifInput');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (window.SnapLamSocket) {
    window.SnapLamSocket.on('admin:log', function (data) {
      if (!logsBody) return;
      var tr = document.createElement('tr');
      var cls = data.level === 'success' ? 'sukses' : (data.level === 'error' ? 'error' : 'gagal');
      var badge = data.level === 'success' ? 'sukses' : (data.level === 'error' ? 'error' : 'info');
      tr.innerHTML =
        '<td>' + esc(data.username) + '</td>' +
        '<td class="mono" style="max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(data.message) + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(data.level) + '</span></td>' +
        '<td>' + new Date(data.time).toLocaleTimeString() + '</td>';
      logsBody.prepend(tr);
    });
  }

  if (notifForm) {
    notifForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = notifInput.value.trim();
      if (!msg) return;
      await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      notifInput.value = '';
      if (window.SnapLamToast) window.SnapLamToast('Terkirim', 'Notifikasi berhasil dibroadcast ke semua user.');
    });
  }
})();
