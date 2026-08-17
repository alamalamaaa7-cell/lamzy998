(function () {
  var form = document.getElementById('dlForm');
  var urlInput = document.getElementById('dlUrl');
  var resSelect = document.getElementById('dlRes');
  var btn = document.getElementById('dlBtn');
  var progressWrap = document.getElementById('progressWrap');
  var progressBar = document.getElementById('progressBar');
  var terminal = document.getElementById('terminal');
  var resultBox = document.getElementById('resultBox');
  var historyBody = document.getElementById('historyBody');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function termLine(message, level) {
    if (!terminal) return;
    var div = document.createElement('div');
    div.className = 'term-line ' + (level || 'info');
    var time = new Date().toLocaleTimeString();
    div.innerHTML = '<span class="t">[' + time + ']</span>' + esc(message);
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = pct + '%';
  }

  if (window.SnapLamSocket) {
    window.SnapLamSocket.on('terminal:log', function (data) {
      termLine(data.message, data.level);
      if (data.level === 'info') setProgress(Math.min(85, (parseInt(progressBar.style.width) || 10) + 20));
      if (data.level === 'success') setProgress(100);
      if (data.level === 'error') setProgress(100);
    });
  }

  function addHistoryRow(row) {
    if (!historyBody) return;
    var tr = document.createElement('tr');
    var badgeClass = row.status === 'sukses' ? 'sukses' : (row.status === 'gagal' ? 'gagal' : 'error');
    tr.innerHTML =
      '<td>' + esc(row.platform || '-') + '</td>' +
      '<td class="mono" style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(row.url) + '</td>' +
      '<td>' + esc(row.resolution || '-') + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + esc(row.status) + '</span></td>' +
      '<td>' + (row.result_url ? '<a href="' + esc(row.result_url) + '" target="_blank" style="color:var(--accent2); font-weight:600;">Buka</a>' : '-') + '</td>';
    historyBody.prepend(tr);
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var url = urlInput.value.trim();
      if (!url) return;
      var resolution = resSelect.value;

      btn.disabled = true;
      btn.textContent = 'Memproses...';
      progressWrap.classList.add('show');
      setProgress(8);
      terminal.innerHTML = '';
      resultBox.classList.remove('show');
      resultBox.innerHTML = '';
      termLine('Memulai proses unduhan...', 'info');

      try {
        var res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url, resolution: resolution })
        });
        var data = await res.json();

        setProgress(100);
        if (data.ok && data.result_url) {
          resultBox.classList.add('show');
          resultBox.innerHTML = '<a class="result-link" href="' + esc(data.result_url) + '" target="_blank">⬇ Unduh Media (' + esc(data.resolution) + ')</a>';
        } else if (!data.ok) {
          termLine(data.message || 'Gagal memproses unduhan.', 'error');
        }
        addHistoryRow({
          platform: data.platform,
          url: url,
          resolution: data.resolution,
          status: data.status,
          result_url: data.result_url
        });
      } catch (err) {
        termLine('Terjadi kesalahan koneksi ke server.', 'error');
        setProgress(100);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Unduh Sekarang';
      }
    });
  }
})();
