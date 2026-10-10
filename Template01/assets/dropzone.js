/*
  dropzone.js  —  ファイル ドラッグ&ドロップの共通挙動
  ------------------------------------------------------------------
  ページ内の全 .dropzone を自動初期化する。読み込むだけでOK:
    <script src="./assets/dropzone.js"></script>

  期待するマークアップ:
    <label class="dropzone">
      <input type="file" name="attachments[]" multiple hidden>
      <div class="dz_icon">📎</div>
      <div class="dz_text">ここにファイルをドラッグ&ドロップ</div>
      <div class="dz_hint">または<span class="dz_browse">クリックして選択</span></div>
    </label>
    <div class="dz_file_list"></div>   ← .dropzone の直後(同じ親)に置く

  ・ドロップ / クリック選択の両対応
  ・選択済みファイルを一覧表示し、× で個別削除
  ・DataTransfer で input.files を同期するので、そのまま form 送信できる
  Author: d.idei@earce.net
  Copyright (c) 2026 EARCE.NET (code & design)
  License: MIT License - see LICENSE
  Source: https://github.com/EARCE9000/DesignTemplate (published on GitHub)
  ------------------------------------------------------------------ */
(function () {
  "use strict";

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function initDropzone(zone) {
    var input = zone.querySelector('input[type="file"]');
    if (!input) return;
    // .dropzone の直後(同じ親)にある一覧領域。なければ生成。
    var list = zone.parentNode.querySelector(".dz_file_list");
    if (!list) {
      list = document.createElement("div");
      list.className = "dz_file_list";
      zone.parentNode.insertBefore(list, zone.nextSibling);
    }

    function setFiles(fileArray) {
      var dt = new DataTransfer();
      fileArray.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
      render();
    }

    function removeAt(index) {
      var arr = Array.prototype.slice.call(input.files);
      arr.splice(index, 1);
      setFiles(arr);
    }

    function render() {
      list.innerHTML = "";
      Array.prototype.forEach.call(input.files, function (file, i) {
        var row = document.createElement("div");
        row.className = "dz_file";

        var name = document.createElement("span");
        name.className = "dz_name";
        name.textContent = file.name;

        var size = document.createElement("span");
        size.className = "dz_size";
        size.textContent = formatSize(file.size);

        var remove = document.createElement("a");
        remove.className = "dz_remove";
        remove.href = "#";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "削除");
        remove.addEventListener("click", function (e) {
          e.preventDefault();
          removeAt(i);
        });

        row.appendChild(name);
        row.appendChild(size);
        row.appendChild(remove);
        list.appendChild(row);
      });
    }

    ["dragenter", "dragover"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add("dragover");
      });
    });
    ["dragleave", "dragend", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove("dragover");
      });
    });

    zone.addEventListener("drop", function (e) {
      var dropped = Array.prototype.slice.call(e.dataTransfer.files);
      if (!dropped.length) return;
      var existing = Array.prototype.slice.call(input.files);
      // multiple でなければ最後の1件のみ
      setFiles(input.multiple ? existing.concat(dropped) : [dropped[dropped.length - 1]]);
    });

    input.addEventListener("change", render);
    render();
  }

  function initAll() {
    document.querySelectorAll(".dropzone").forEach(initDropzone);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
