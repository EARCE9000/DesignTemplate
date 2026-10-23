/*!
 * admin_server.js : 管理機能の「サーバー」タブを描く共通のスクリプト
 * Copyright (c) 2026 EARCE.NET (code & design)
 * License: MIT License - see LICENSE
 * Source: https://github.com/EARCE9000/DesignTemplate (published on GitHub)
 *
 * 共通アーキテクチャ(構成 6.2・6.3 / 画面 8.1・8.2)で決めた WebAPI の応答を読んで、次を描く。
 * 守りの点検(部品の脆弱性、設定の抜け)のときに、この画面だけで判断できる情報量にする。
 *   1. このサーバー(版・ビルド・リビジョン・ビルドした日時・起動した日時・動いている時間・DB の種類と、DB のファイル)
 *   2. 守りの設定(認証の方式、回数の上限、セッションの寿命、APIキーの最長の期限 など)
 *   3. 機能の On/Off
 *   4. つながりの確認(つながる先ごとに、状態・掛かった時間・最後に成功・補足)
 *   5. 動いている部品の版(本体・DB・つながっている相手の、製品と版と土台。本体は V8・カーネル・CPU・メモリまで)
 *   6. 直接使っている部品と、部品表(名前で探す。入れ子に入った別の版も)
 *
 * 使い方(サービスの画面):
 *   <div class="admin_server" data-base="./webapi/server-status" data-login="./"></div>
 *   <script src="./assets/admin_server.js"></script>
 *   data-base  … 共通の WebAPI の頭。{base}、{base}/components、{base}/packages?q= を呼ぶ
 *   data-login … 401 のときに移る先(認証の資料: 画面の中の認証切れは、必ずログインの画面へ戻す)
 *
 * 見本(テンプレート)では、WebAPI の代わりに、ページに埋めた JSON を読む:
 *   <div class="admin_server" data-sample="admin_server_sample"></div>
 *   <script type="application/json" id="admin_server_sample">{"status": …, "components": …, "packages": …}</script>
 *
 * サービスごとの足し方(カスタム化):
 *   - status.extra: [{label, value}] … 「このサーバー」に項目を足す
 *   - status.security: [{label, value, state, note}] … 守りの設定の行。state は ok / warn / bad / 省略
 *   - status.features: [{name, enabled, note}] … 機能の On/Off(ここでは読むだけ。切り替えはサービスの節で)
 *   - components[] にサービス独自の相手を足してよい(key は重ならない名前)。
 *     details: [{label, value}] を付けると、補足の欄にそのまま出す。知らない項目は読み飛ばす
 *   - この要素の後ろに、サービスが自分の節(上限の変更、機能の切り替えなど)を足してよい
 *     (この要素の外に書く。このスクリプトは、この要素の中しか書き換えない)
 */
(function () {
	"use strict";

	var STATE = {
		checking: ["processing", "Checking"],
		running: ["completed", "Running"],
		reachable: ["completed", "Connected"],
		unreachable: ["failed", "Error"],
		unconfigured: ["unknown", "Not set"]
	};
	var LEVEL = {ok: ["completed", "OK"], warn: ["pending", "Warning"], bad: ["failed", "Critical"]};
	// 土台の 1 行目。左から順に、あるものだけを出す
	var RUNTIME_KEYS = [["node", "Node.js"], ["python", "Python"], ["php", "PHP"], ["java", "Java"], ["openssl", "OpenSSL"], ["os", ""], ["arch", ""]];
	// 土台の 2 行目(本体は、ここまで出す)
	var RUNTIME_MORE = [["v8", "V8"], ["uv", "libuv"], ["kernel", "カーネル"], ["cpus", "CPU"]];

	function esc(value) {
		return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
			return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c];
		});
	}
	function ver(value) {
		// 版は略さず、そのままの文字で出す。取れない版は「分からない」
		return value == null || value === "" ? "<span class=\"null_val\">不明</span>" : "<span class=\"version_text\">" + esc(value) + "</span>";
	}
	function when(iso) {
		if (!iso) return "―";
		var d = new Date(iso);
		if (isNaN(d.getTime())) return esc(iso);
		var p = function (n) { return (n < 10 ? "0" : "") + n; };
		return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
	}
	function uptime(seconds) {
		if (seconds == null) return "―";
		var d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60);
		return (d ? d + " 日 " : "") + (d || h ? h + " 時間 " : "") + m + " 分";
	}
	function bytes(n) {
		if (n == null) return "―";
		var units = ["B", "KB", "MB", "GB", "TB"], i = 0;
		while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
		return (i ? n.toFixed(1) : n) + " " + units[i];
	}
	function badge(pair) {
		return "<span class=\"status_badge " + pair[0] + "\">" + pair[1] + "</span>";
	}
	function stateOf(c) {
		if (c == null) return "checking";
		if (c.configured === false) return "unconfigured";
		if (c.reachable === false) return "unreachable";
		return c.key === "app" ? "running" : "reachable";
	}
	function table(head, rows, empty) {
		return "<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr>" + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
			"</tr></thead><tbody>" + (rows.join("") || "<tr><td colspan=\"" + head.length + "\" class=\"runtime_text\">" + (empty || "なし") + "</td></tr>") + "</tbody></table></div>";
	}
	function runtimeCell(c) {
		var rt = c.runtime;
		if (rt === null) return "<span class=\"runtime_text\">(この相手は未対応。相手の更新で表示)</span>";
		if (!rt) return "―";
		var first = [];
		RUNTIME_KEYS.forEach(function (k) {
			if (rt[k[0]] != null) first.push((k[1] ? esc(k[1]) + " " : "") + "<span class=\"version_text\">" + esc(rt[k[0]]) + "</span>");
		});
		var lines = [first.join("<span class=\"runtime_sep\">/</span>")];
		var more = [];
		RUNTIME_MORE.forEach(function (k) {
			if (rt[k[0]] != null) more.push(esc(k[1]) + " <span class=\"version_text\">" + esc(rt[k[0]]) + (k[0] === "cpus" ? " コア" : "") + "</span>");
		});
		if (more.length) lines.push(more.join("<span class=\"runtime_sep\">/</span>"));
		if (rt.memory) lines.push("メモリ 使用 " + esc(bytes(rt.memory.rssBytes)) + (rt.memory.totalBytes ? "(サーバー全体 " + esc(bytes(rt.memory.totalBytes)) + ")" : ""));
		return "<span class=\"runtime_text\">" + lines.join("<br>") + "</span>";
	}
	function detailsText(c) {
		var rows = [];
		if (c.apiVersion != null) rows.push("API " + ver(c.apiVersion));
		(c.modules || []).forEach(function (m) {
			rows.push("モジュール " + esc(m.name) + (m.model ? "(" + esc(m.model) + ")" : "") + (m.version ? " " + ver(m.version) : ""));
		});
		(c.details || []).forEach(function (d) { rows.push(esc(d.label) + ": " + esc(d.value)); });
		return rows.join("<br>");
	}

	function AdminServer(root) {
		this.root = root;
		this.base = root.getAttribute("data-base");
		this.login = root.getAttribute("data-login") || "./";
		var sampleId = root.getAttribute("data-sample");
		this.sample = null;
		if (sampleId) {
			var node = document.getElementById(sampleId);
			this.sample = node ? JSON.parse(node.textContent) : null;
		}
		this.searchTimer = null;
		this.deps = [];
	}

	AdminServer.prototype.get = function (path) {
		var self = this;
		if (this.sample) {
			// 見本: WebAPI の代わりに、埋めた JSON を返す(相手への問い合わせに時間が掛かる様子も、少しだけ見せる)
			return new Promise(function (resolve) {
				setTimeout(function () {
					if (path === "") return resolve(self.sample.status);
					if (path === "/components") return resolve(self.sample.components);
					var q = decodeURIComponent((path.split("q=")[1] || "")).toLowerCase();
					var list = self.sample.packages.packages.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; });
					resolve({source: self.sample.packages.source, total: self.sample.packages.packages.length, count: list.length, packages: list});
				}, path === "/components" ? 600 : 50);
			});
		}
		return fetch(this.base + path, {credentials: "same-origin", headers: {"Accept": "application/json"}}).then(function (res) {
			if (res.status === 401) {
				// 認証切れは、必ずログインの画面へ戻す(403 や 5xx では移らない)
				window.location.href = self.login;
				throw new Error("unauthenticated");
			}
			if (!res.ok) throw new Error("HTTP " + res.status);
			return res.json();
		});
	};

	AdminServer.prototype.render = function () {
		var REF = "<svg class=\"inline_icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" +
			"<polyline points=\"23 4 23 10 17 10\"/><polyline points=\"1 20 1 14 7 14\"/><path d=\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15\"/></svg>";
		this.root.innerHTML =
			"<div class=\"panel_section_title\">このサーバー<span class=\"panel_section_action\"><a href=\"#\" data-act=\"reload\" style=\"font-size:9pt;color:#187FF5;text-decoration:none;\">" + REF + "再確認</a></span></div>" +
			"<div class=\"info_grid\" data-part=\"status\"></div>" +
			"<div data-part=\"dbfiles\"></div>" +
			"<div class=\"panel_section_title\">守りの設定</div><div data-part=\"security\"></div>" +
			"<div class=\"panel_section_title\">機能の On/Off</div><div data-part=\"features\"></div>" +
			"<div class=\"panel_section_title\">接続の確認<span class=\"panel_section_action runtime_text\" data-part=\"checked\"></span></div>" +
			"<div data-part=\"connections\"></div>" +
			"<div class=\"panel_section_title\">稼働中の部品の版</div><div data-part=\"components\"></div>" +
			"<div class=\"panel_section_title\">ライブラリ(部品表)<span class=\"panel_section_action runtime_text\" data-part=\"pkgcount\"></span></div>" +
			"<div class=\"filter_panel\"><div class=\"search_form\"><span class=\"filter_label\">部品の名前</span>" +
			"<input type=\"search\" class=\"search_input\" data-part=\"q\" placeholder=\"例) openssl、express\" autocomplete=\"off\"></div></div>" +
			"<div data-part=\"packages\"></div>";
		var self = this;
		this.root.querySelector("[data-act=reload]").addEventListener("click", function (e) { e.preventDefault(); self.load(); });
		this.root.querySelector("[data-part=q]").addEventListener("input", function (e) {
			clearTimeout(self.searchTimer);
			var q = e.target.value.trim();
			self.searchTimer = setTimeout(function () { self.loadPackages(q); }, 300);
		});
	};

	AdminServer.prototype.part = function (name) { return this.root.querySelector("[data-part=" + name + "]"); };

	AdminServer.prototype.fail = function (names, err) {
		var self = this;
		names.forEach(function (n) { self.part(n).innerHTML = "<div class=\"msg_error\">取得失敗: " + esc(err.message) + "</div>"; });
	};

	AdminServer.prototype.load = function () {
		var self = this;
		// 本体の情報を先に出す。相手への問い合わせの結果は、あとから出す(全部がそろうまで待たせない)
		this.get("").then(function (s) { self.showStatus(s); }, function (err) { self.fail(["status"], err); });
		this.showComponents(null);
		this.get("/components").then(function (c) { self.showComponents(c); }, function (err) { self.fail(["connections", "components"], err); });
	};

	AdminServer.prototype.showStatus = function (s) {
		var items = [
			["版", ver(s.version)], ["ビルド", s.build ? ver(s.build) : "―"], ["リビジョン", s.revision ? ver(s.revision) : "―"],
			["ビルド日時", esc(when(s.builtAt))], ["起動日時", esc(when(s.startedAt))], ["稼働時間", esc(uptime(s.uptimeSeconds))],
			["データベース", esc(s.database && s.database.backend ? s.database.backend : "―")]
		];
		(s.extra || []).forEach(function (e) { items.push([esc(e.label), esc(e.value)]); });
		this.part("status").innerHTML = items.map(function (i) {
			return "<div><div class=\"info_label\">" + i[0] + "</div><div class=\"info_value\">" + i[1] + "</div></div>";
		}).join("");

		var files = s.database && s.database.files;
		this.part("dbfiles").innerHTML = files && files.length ? table(["DB のファイル", "大きさ", ""], files.map(function (f) {
			return "<tr><td class=\"version_text\">" + esc(f.name) + "</td><td>" + esc(bytes(f.sizeBytes)) + "</td><td>" + (f.current ? "<b>使用中</b>" : "旧版(切り戻し用に保管)") + "</td></tr>";
		})) : "";

		this.part("security").innerHTML = table(["項目", "現在の値", "状態", "補足"], (s.security || []).map(function (r) {
			return "<tr" + (r.state === "bad" ? " class=\"row_failed\"" : "") + "><td>" + esc(r.label) + "</td><td>" + esc(r.value) + "</td><td>" +
				(LEVEL[r.state] ? badge(LEVEL[r.state]) : "") + "</td><td class=\"runtime_text\">" + esc(r.note || "") + "</td></tr>";
		}), "守りの設定の返却なし");

		this.part("features").innerHTML = table(["機能", "状態", "補足"], (s.features || []).map(function (f) {
			return "<tr><td>" + esc(f.name) + "</td><td>" + (f.enabled ? badge(["completed", "On"]) : badge(["unknown", "Off"])) + "</td><td class=\"runtime_text\">" + esc(f.note || "") + "</td></tr>";
		}), "切り替え可能な機能なし");
	};

	AdminServer.prototype.showComponents = function (data) {
		var list = data ? data.components : [{key: "app", name: "本体"}];
		this.part("checked").textContent = data ? "確認日時 " + when(data.checkedAt) : "Checking…";
		this.part("connections").innerHTML = table(["接続先", "状態", "応答時間", "最終成功", "補足"],
			data ? list.filter(function (c) { return c.key !== "app"; }).map(function (c) {
				var st = stateOf(c);
				return "<tr" + (st === "unreachable" ? " class=\"row_failed\"" : "") + "><td>" + esc(c.name) + "</td><td>" + badge(STATE[st]) + "</td>" +
					"<td style=\"white-space:nowrap\">" + (st === "unconfigured" ? "―" : c.latencyMs != null ? esc(c.latencyMs) + " ms" : c.reachable === false ? "時間切れ" : "―") + "</td>" +
					"<td style=\"white-space:nowrap\">" + esc(when(c.lastSuccessAt)) + "</td>" +
					"<td>" + (st === "unconfigured" ? "この機能は未使用" : esc(c.error || "")) + "</td></tr>";
			}) : ["<tr><td colspan=\"5\">" + badge(STATE.checking) + "</td></tr>"]);
		this.part("components").innerHTML = table(["部品", "状態", "製品と版", "土台・詳細"], list.map(function (c) {
			var st = stateOf(data ? c : null);
			if (!data) return "<tr><td>" + esc(c.name) + "</td><td>" + badge(STATE[st]) + "</td><td></td><td></td></tr>";
			var product = st === "unconfigured" ? "―" : (c.product ? esc(c.product) + " " : "") + ver(c.version);
			var extra = detailsText(c);
			return "<tr><td>" + esc(c.name) + "</td><td>" + badge(STATE[st]) + "</td>" +
				"<td>" + product + (extra ? "<div class=\"runtime_text\">" + extra + "</div>" : "") + "</td>" +
				"<td>" + (st === "unconfigured" ? "―" : st === "unreachable" ? "<span class=\"runtime_text\">" + esc(c.error || "応答なし") + "</span>" : runtimeCell(c)) + "</td></tr>";
		}));
		if (data) {
			this.part("pkgcount").textContent = data.packageCount != null ? "入っている部品 " + data.packageCount + " 個(" + (data.packageSource || "") + ")" : "";
			this.deps = data.dependencies || [];
			this.loadPackages(this.part("q").value.trim());
		}
	};

	AdminServer.prototype.loadPackages = function (q) {
		var self = this;
		var box = this.part("packages");
		if (q === "") {
			// 探す言葉が無ければ、直接使っているライブラリを出す
			box.innerHTML = "<div class=\"result_meta\" style=\"border:0\">直接使用のライブラリ " + this.deps.length + " 個。名前の入力で、部品表の全体から検索(入れ子に入った別の版も表示)。</div>" +
				table(["部品", "版"], this.deps.map(function (d) { return "<tr><td class=\"version_text\">" + esc(d.name) + "</td><td>" + ver(d.version) + "</td></tr>"; }));
			return;
		}
		this.get("/packages?q=" + encodeURIComponent(q)).then(function (r) {
			if (self.part("q").value.trim() !== q) return;
			box.innerHTML = "<div class=\"result_meta\" style=\"border:0\">「" + esc(q) + "」を含む部品 " + r.count + " 個(全 " + r.total + " 個中)</div>" +
				table(["部品", "版", "直接", "場所"], r.packages.map(function (p) {
					return "<tr><td class=\"version_text\">" + esc(p.name) + "</td><td>" + ver(p.version) + "</td><td>" + (p.direct ? "直接" : "") + "</td><td class=\"version_text\">" + esc(p.path || "") + "</td></tr>";
				}), "「" + esc(q) + "」を含む部品なし");
		}, function (err) { self.fail(["packages"], err); });
	};

	function start() {
		var nodes = document.querySelectorAll(".admin_server");
		for (var i = 0; i < nodes.length; i += 1) {
			var a = new AdminServer(nodes[i]);
			a.render();
			a.load();
		}
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
	else start();
})();
