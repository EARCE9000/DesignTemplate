/*!
 * admin_server.js : 管理機能の「サーバー」タブを描く共通のスクリプト
 * Copyright (c) 2026 EARCE.NET (code & design)
 * License: MIT License - see LICENSE
 * Source: https://github.com/EARCE9000/DesignTemplate (published on GitHub)
 *
 * 共通アーキテクチャ(構成 6.2・6.3 / 画面 8.1・8.2)で決めた WebAPI の応答を読んで、次の 4 つを描く。
 *   1. このサーバー(版・ビルドした日時・起動した日時・動いている時間・DB の種類。サービスが足した項目)
 *   2. つながりの確認(つながる先ごとに、状態・掛かった時間・最後に成功・補足)
 *   3. 動いている部品の版(本体・DB・つながっている相手の、製品と版と土台)
 *   4. 部品表(直接使っている部品と、名前で探す一覧)
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
 *   - components[] にサービス独自の相手を足してよい(key は重ならない名前)。
 *     details: [{label, value}] を付けると、補足の欄にそのまま出す。知らない項目は読み飛ばす
 *   - この 4 つの後ろに、サービスが自分の節(機能の On/Off、回数の上限など)を足してよい
 *     (この要素の外に書く。このスクリプトは、この要素の中しか書き換えない)
 */
(function () {
	"use strict";

	var STATE = {
		checking: ["processing", "確認中"],
		running: ["completed", "動いている"],
		reachable: ["completed", "届く"],
		unreachable: ["failed", "届かない"],
		unconfigured: ["unknown", "未設定"]
	};
	// 土台の並び。左から順に、あるものだけを出す
	var RUNTIME_KEYS = [["node", "Node.js"], ["python", "Python"], ["php", "PHP"], ["java", "Java"], ["openssl", "OpenSSL"], ["os", ""]];
	var RUNTIME_MORE = [["v8", "V8"], ["uv", "libuv"], ["kernel", "カーネル"], ["arch", "CPU の種類"], ["cpus", "CPU の数"]];

	function esc(value) {
		return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
			return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c];
		});
	}
	function ver(value) {
		// 版は略さず、そのままの文字で出す。取れない版は「分からない」
		return value == null || value === "" ? "<span class=\"null_val\">分からない</span>" : "<span class=\"version_text\">" + esc(value) + "</span>";
	}
	function when(iso) {
		if (!iso) return "―";
		var d = new Date(iso);
		if (isNaN(d.getTime())) return esc(iso);
		var p = function (n) { return (n < 10 ? "0" : "") + n; };
		return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
	}
	function uptime(seconds) {
		if (seconds == null) return "―";
		var d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60);
		return (d ? d + " 日 " : "") + (d || h ? h + " 時間 " : "") + m + " 分";
	}
	function bytes(n) {
		if (n == null) return "";
		var units = ["B", "KB", "MB", "GB", "TB"], i = 0;
		while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
		return (i ? n.toFixed(1) : n) + " " + units[i];
	}
	function badge(state) {
		var s = STATE[state];
		return "<span class=\"status_badge " + s[0] + "\">" + s[1] + "</span>";
	}
	function stateOf(c) {
		if (c == null) return "checking";
		if (c.configured === false) return "unconfigured";
		if (c.reachable === false) return "unreachable";
		return c.key === "app" ? "running" : "reachable";
	}
	function runtimeLine(rt) {
		if (!rt) return "―";
		var parts = [];
		RUNTIME_KEYS.forEach(function (k) {
			if (rt[k[0]] != null) parts.push((k[1] ? esc(k[1]) + " " : "") + "<span class=\"version_text\">" + esc(rt[k[0]]) + "</span>");
		});
		return parts.length ? "<span class=\"runtime_text\">" + parts.join("<span class=\"runtime_sep\">｜</span>") + "</span>" : "―";
	}
	function runtimeMore(rt) {
		if (!rt) return "";
		var rows = [];
		RUNTIME_MORE.forEach(function (k) {
			if (rt[k[0]] != null) rows.push(esc(k[1]) + ": <span class=\"version_text\">" + esc(rt[k[0]]) + "</span>");
		});
		if (rt.memory) {
			rows.push("メモリ: 使用 " + esc(bytes(rt.memory.rssBytes)) + (rt.memory.totalBytes ? " / 全体 " + esc(bytes(rt.memory.totalBytes)) : ""));
		}
		return rows.length ? "<details><summary class=\"runtime_text\">詳しく</summary><div class=\"runtime_text\">" + rows.join("<br>") + "</div></details>" : "";
	}
	function detailsText(c) {
		var rows = [];
		if (c.error) rows.push(esc(c.error));
		if (c.apiVersion != null) rows.push("API " + ver(c.apiVersion));
		(c.modules || []).forEach(function (m) {
			rows.push(esc(m.name) + (m.model ? ": " + esc(m.model) : "") + (m.version ? " " + ver(m.version) : ""));
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
		this.root.innerHTML =
			"<div class=\"panel_section_title\">このサーバー<span class=\"panel_section_action\"><a href=\"#\" data-act=\"reload\" style=\"font-size:9pt;color:#187FF5;text-decoration:none;\"><svg class=\"inline_icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"23 4 23 10 17 10\"/><polyline points=\"1 20 1 14 7 14\"/><path d=\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15\"/></svg>調べ直す</a></span></div>" +
			"<div class=\"info_grid\" data-part=\"status\"></div>" +
			"<div class=\"panel_section_title\">つながりの確認<span class=\"panel_section_action result_meta\" style=\"border:0;padding:0\" data-part=\"checked\"></span></div>" +
			"<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr><th>つながる先</th><th>状態</th><th>掛かった時間</th><th>最後に成功</th><th>補足</th></tr></thead><tbody data-part=\"connections\"></tbody></table></div>" +
			"<div class=\"panel_section_title\">動いている部品の版</div>" +
			"<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr><th>部品</th><th>状態</th><th>製品と版</th><th>土台</th></tr></thead><tbody data-part=\"components\"></tbody></table></div>" +
			"<div class=\"panel_section_title\">直接使っている部品<span class=\"panel_section_action runtime_text\" data-part=\"pkgcount\"></span></div>" +
			"<div class=\"info_grid\" data-part=\"deps\"></div>" +
			"<div class=\"panel_section_title\">部品表(名前で探す)</div>" +
			"<div class=\"filter_panel\"><div class=\"search_form\"><span class=\"filter_label\">部品の名前</span>" +
			"<input type=\"search\" class=\"search_input\" data-part=\"q\" placeholder=\"例) openssl、express\" autocomplete=\"off\"></div></div>" +
			"<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr><th>名前</th><th>版</th><th>直接</th><th>入っている場所</th></tr></thead><tbody data-part=\"packages\"></tbody></table></div>";
		var self = this;
		this.root.querySelector("[data-act=reload]").addEventListener("click", function (e) { e.preventDefault(); self.load(); });
		this.root.querySelector("[data-part=q]").addEventListener("input", function (e) {
			clearTimeout(self.searchTimer);
			var q = e.target.value.trim();
			self.searchTimer = setTimeout(function () { self.loadPackages(q); }, 300);
		});
	};

	AdminServer.prototype.part = function (name) { return this.root.querySelector("[data-part=" + name + "]"); };

	AdminServer.prototype.load = function () {
		var self = this;
		// 本体の版を先に出す。相手への問い合わせの結果は、あとから出す(全部がそろうまで待たせない)
		this.get("").then(function (s) { self.showStatus(s); }, function (err) { self.part("status").innerHTML = "<div class=\"msg_error\">読めませんでした: " + esc(err.message) + "</div>"; });
		this.showComponents(null);
		this.get("/components").then(function (c) { self.showComponents(c); }, function (err) {
			self.part("components").innerHTML = "<tr><td colspan=\"4\"><div class=\"msg_error\">読めませんでした: " + esc(err.message) + "</div></td></tr>";
			self.part("connections").innerHTML = "";
		});
		this.loadPackages(this.part("q").value.trim());
	};

	AdminServer.prototype.showStatus = function (s) {
		var items = [
			["版", ver(s.version)], ["ビルドした日時", esc(when(s.builtAt))], ["リビジョン", s.revision ? ver(s.revision) : "―"],
			["起動した日時", esc(when(s.startedAt))], ["動いている時間", esc(uptime(s.uptimeSeconds))],
			["データベース", esc(s.database && s.database.backend ? s.database.backend : "―")]
		];
		(s.extra || []).forEach(function (e) { items.push([esc(e.label), esc(e.value)]); });
		this.part("status").innerHTML = items.map(function (i) {
			return "<div><div class=\"info_label\">" + i[0] + "</div><div class=\"info_value\">" + i[1] + "</div></div>";
		}).join("");
	};

	AdminServer.prototype.showComponents = function (data) {
		var list = data ? data.components : [{key: "app", name: "本体"}];
		this.part("checked").textContent = data ? "調べた時刻 " + when(data.checkedAt) : "確認中…";
		this.part("connections").innerHTML = list.filter(function (c) { return c.key !== "app"; }).map(function (c) {
			var st = stateOf(c);
			return "<tr><td>" + esc(c.name) + "</td><td>" + badge(st) + "</td>" +
				"<td style=\"white-space:nowrap\">" + (st === "unconfigured" ? "―" : c.latencyMs != null ? esc(c.latencyMs) + " ms" : c.reachable === false ? "時間切れ・失敗" : "―") + "</td>" +
				"<td style=\"white-space:nowrap\">" + esc(when(c.lastSuccessAt)) + "</td>" +
				"<td>" + (st === "unconfigured" ? "この機能は使っていません" : (c.error ? esc(c.error) : "")) + "</td></tr>";
		}).join("") || (data ? "" : "<tr><td colspan=\"5\">" + badge("checking") + "</td></tr>");
		this.part("components").innerHTML = list.map(function (c) {
			var st = stateOf(data ? c : null);
			var product = st === "unconfigured" ? "―" : (c.product ? esc(c.product) + " " : "") + ver(c.version);
			var extra = data ? detailsText(c) : "";
			return "<tr><td>" + esc(c.name) + "</td><td>" + badge(st) + "</td>" +
				"<td>" + (data ? product : "") + (extra ? "<div class=\"runtime_text\">" + extra + "</div>" : "") + "</td>" +
				"<td>" + (data ? runtimeLine(c.runtime) + runtimeMore(c.runtime) : "") + "</td></tr>";
		}).join("");
		if (data) {
			this.part("pkgcount").textContent = data.packageCount != null ? "入っている部品は全部で " + data.packageCount + " 件(" + (data.packageSource || "") + ")" : "";
			this.part("deps").innerHTML = (data.dependencies || []).map(function (d) {
				return "<div><div class=\"info_label\">" + esc(d.name) + "</div><div class=\"info_value\">" + ver(d.version) + "</div></div>";
			}).join("") || "<div class=\"runtime_text\">ありません</div>";
		}
	};

	AdminServer.prototype.loadPackages = function (q) {
		var self = this;
		var body = this.part("packages");
		if (q === "") {
			body.innerHTML = "<tr><td colspan=\"4\" class=\"runtime_text\">名前の一部を入れると、入っている部品を探します(入れ子に入った、別の版も出ます)。</td></tr>";
			return;
		}
		this.get("/packages?q=" + encodeURIComponent(q)).then(function (r) {
			body.innerHTML = r.packages.map(function (p) {
				return "<tr><td>" + esc(p.name) + "</td><td>" + ver(p.version) + "</td><td>" + (p.direct ? "直接" : "") + "</td><td class=\"runtime_text\">" + esc(p.path || "") + "</td></tr>";
			}).join("") || "<tr><td colspan=\"4\" class=\"runtime_text\">「" + esc(q) + "」を含む部品は、入っていません。</td></tr>";
		}, function (err) {
			body.innerHTML = "<tr><td colspan=\"4\"><div class=\"msg_error\">読めませんでした: " + esc(err.message) + "</div></td></tr>";
		});
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
