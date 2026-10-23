/*!
 * account.js : 全員が使う 2 つの画面(APIキーの管理、自分の操作の履歴)を、ヘッダーのアイコンからモーダルで開く
 * Copyright (c) 2026 EARCE.NET (code & design)
 * License: MIT License - see LICENSE
 * Source: https://github.com/EARCE9000/DesignTemplate (published on GitHub)
 *
 * 共通アーキテクチャ(画面 9 章、認証 4 章・5 章)の決まりを部品にした物。assets/ui.js の後に読み込む。
 *
 * 置き方:
 *   ヘッダーの鍵のアイコンに data-open="apikeys"、時計のアイコンに data-open="history" を付ける。
 *   <script src="./assets/ui.js"></script>
 *   <script src="./assets/account.js" data-keys="./webapi/apikeys" data-history="./webapi/history"
 *           data-guide="./webapi/usage.md" data-service="サービス名" data-login="./"></script>
 *   data-guide は任意(AI チャット貼り付け用の利用ガイド。<APIキー> と <ベースURL> を置き換えて使う)
 *
 * WebAPI の形(どのサービスでも同じ。画面のログインから使う。APIキーでは呼べない):
 *   GET    {keys}        → {keys: [{id, label, role, createdAt, expiresAt, lastUsedAt}], myRole}(配列だけを返してもよい)
 *                          expiresAt が null は無期限(readonly のキーだけ)
 *   POST   {keys}        ← {label, role, expiryOption}(today | 30d | 90d | 1y | none)→ {id, label, role, apiKey, expiresAt}
 *                          平文のキーは、この応答の 1 回だけ。admin のキーは発行できない。自分の権限より上のキーは 403
 *   DELETE {keys}/{id}   失効させる(自分のキーだけ)
 *   GET    {history}     → {entries: [{at, action, target, result, via}], actions: [{value, label}]}(配列だけを返してもよい)
 *                          自分の分だけ。result は success / denied / failed、via は screen / apikey
 */
(function () {
	"use strict";
	if (!window.UI) { throw new Error("account.js は ui.js の後に読み込む"); }
	var UI = window.UI, esc = UI.esc, when = UI.when;

	var EXPIRY = [
		{value: "today", label: "当日限り(既定)"},
		{value: "30d", label: "30 日"},
		{value: "90d", label: "90 日"},
		{value: "1y", label: "1 年"},
		{value: "none", label: "無期限(readonly だけ)", readonlyOnly: true}
	];
	var ROLES = {readonly: "読み取り専用", readwrite: "読み書き"};
	var ROLE_DETAIL = {
		readonly: "読み取り専用(GET だけが使えます。登録・変更・削除はできません)",
		readwrite: "読み書き(登録・変更・削除もできます。管理の操作と、APIキーの発行はできません)"
	};
	var RESULT = {success: ["completed", "Success"], denied: ["failed", "Denied"], failed: ["failed", "Error"]};
	var ICON_TRASH = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>";
	var ICON_WARN = "<svg class=\"state_icon warn\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/></svg>";

	var me = document.currentScript;
	var cfg = {
		keys: me.getAttribute("data-keys") || "./webapi/apikeys",
		history: me.getAttribute("data-history") || "./webapi/history",
		guide: me.getAttribute("data-guide"),
		service: me.getAttribute("data-service") || document.title.replace(/^【開発モード】/, "").split("|").pop().trim(),   // 題名は「画面の名前 | システムの名前」。後ろを取る
		login: me.getAttribute("data-login") || "./",
		demo: me.hasAttribute("data-demo")
	};

	// ---------------------------------------------------------------- 見本(テンプレートだけ。data-demo)
	var now = Date.now(), H = 3600 * 1000, D = 24 * H;
	var DEMO = {
		myRole: "readwrite",
		keys: [
			{id: "k1", label: "夜間の取り込み", role: "readonly", createdAt: new Date(now - 40 * D).toISOString(), expiresAt: null, lastUsedAt: new Date(now - 3 * H).toISOString()},
			{id: "k2", label: "AI エージェント用", role: "readwrite", createdAt: new Date(now - 2 * D).toISOString(), expiresAt: new Date(now + 88 * D).toISOString(), lastUsedAt: new Date(now - 20 * 60000).toISOString()},
			{id: "k3", label: "", role: "readonly", createdAt: new Date(now - 5 * H).toISOString(), expiresAt: new Date(now + 6 * H).toISOString(), lastUsedAt: null},
			{id: "k4", label: "古い作業用", role: "readwrite", createdAt: new Date(now - 100 * D).toISOString(), expiresAt: new Date(now - 10 * D).toISOString(), lastUsedAt: new Date(now - 12 * D).toISOString()}
		],
		history: {
			actions: [{value: "login", label: "ログイン"}, {value: "upload", label: "登録"}, {value: "delete", label: "削除"}, {value: "apikey_issue", label: "APIキーの発行"}],
			entries: [
				{at: new Date(now - 15 * 60000).toISOString(), action: "upload", target: "report.html", result: "success", via: "apikey"},
				{at: new Date(now - 2 * H).toISOString(), action: "apikey_issue", target: "AI エージェント用", result: "success", via: "screen"},
				{at: new Date(now - 3 * H).toISOString(), action: "delete", target: "old.md", result: "denied", via: "apikey"},
				{at: new Date(now - 5 * H).toISOString(), action: "login", target: null, result: "success", via: "screen"}
			]
		},
		guide: "# <サービス名> 利用ガイド (AI向け)\n\nベースURL: <ベースURL>\n\n認証: すべての要求に `Authorization: Bearer <APIキー>` を付ける。\n\n" +
			"## 例\n```bash\ncurl -H \"Authorization: Bearer <APIキー>\" \"<ベースURL>webapi/items\"\n```\n"
	};

	function request(method, url, body) {
		if (cfg.demo) return Promise.resolve(demoAnswer(method, url, body));
		var opts = {method: method, credentials: "same-origin", headers: {"Accept": "application/json"}};
		if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
		return fetch(url, opts).then(function (res) {
			if (res.status === 401) { window.location.href = cfg.login; throw new Error("unauthenticated"); }
			if (res.status === 204) return null;
			return res.json().catch(function () { return {}; }).then(function (data) {
				if (!res.ok) throw new Error((data && data.error) || "HTTP " + res.status);
				return data;
			});
		});
	}
	function demoAnswer(method, url, body) {
		if (url === cfg.history) return DEMO.history;
		if (method === "GET") return {keys: DEMO.keys, myRole: DEMO.myRole};
		if (method === "POST") {
			var key = {id: "k" + (DEMO.keys.length + 1), label: body.label, role: body.role, createdAt: new Date().toISOString(),
				expiresAt: expiresAt(body.expiryOption), lastUsedAt: null};
			DEMO.keys.unshift(key);
			return {id: key.id, label: key.label, role: key.role, expiresAt: key.expiresAt, apiKey: "svc_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)};
		}
		if (method === "DELETE") { var id = url.split("/").pop(); DEMO.keys = DEMO.keys.filter(function (k) { return k.id !== id; }); return null; }
		return null;
	}

	// 期限の見込み(画面に出すだけ。本当の期限は、サーバーが決めて返す)
	function expiresAt(option) {
		var t = Date.now();
		if (option === "none") return null;
		if (option === "30d") return new Date(t + 30 * D).toISOString();
		if (option === "90d") return new Date(t + 90 * D).toISOString();
		if (option === "1y") return new Date(t + 365 * D).toISOString();
		// 当日限り: 12 時間後と、翌日 02:00(日本時間)の早いほう
		var jst = new Date(t + 9 * H);
		var next2 = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + (jst.getUTCHours() >= 2 ? 1 : 0), 2) - 9 * H;
		return new Date(Math.min(t + 12 * H, next2)).toISOString();
	}
	function remaining(iso) {
		if (iso == null) return "無期限";
		var ms = new Date(iso).getTime() - Date.now();
		if (ms <= 0) return "期限切れ";
		if (ms < D) return "あと " + Math.max(1, Math.round(ms / H)) + " 時間";
		return "あと " + Math.round(ms / D) + " 日";
	}

	// ---------------------------------------------------------------- APIキーの管理
	function openKeys() {
		var issued = null;   // 発行した直後のキー(閉じたら消える)
		var m = UI.modal({titleHtml: "APIキーの管理", wide: true, body: "<div data-part=\"form\"></div><div data-part=\"issued\"></div><div data-part=\"msg\"></div><div data-part=\"list\"></div>",
			onClose: function () { issued = null; }});
		var box = m.box;
		var part = function (n) { return box.querySelector("[data-part=" + n + "]"); };

		var renderForm = function (myRole) {
			var roles = myRole === "readonly" ? ["readonly"] : ["readonly", "readwrite"];
			part("form").innerHTML =
				"<div class=\"key_form\">" +
				"<label>期限 <select class=\"search_input\" data-f=\"expiry\">" + EXPIRY.map(function (e) {
					return "<option value=\"" + e.value + "\">" + esc(e.label) + "</option>";
				}).join("") + "</select></label>" +
				"<label>権限 <select class=\"search_input\" data-f=\"role\">" + roles.map(function (r) {
					return "<option value=\"" + r + "\">" + esc(ROLES[r]) + "</option>";
				}).join("") + "</select></label>" +
				"<label class=\"key_form_memo\">用途のメモ <input type=\"text\" class=\"search_input\" data-f=\"label\" maxlength=\"100\" placeholder=\"例) AI エージェント用\"></label>" +
				"<button type=\"button\" class=\"entry_button key_issue\" data-f=\"issue\">発行</button></div>" +
				"<div class=\"key_form_hint\" data-f=\"hint\"></div>";
			var hint = function () {
				var ex = part("form").querySelector("[data-f=expiry]");
				var role = part("form").querySelector("[data-f=role]");
				var noneOpt = ex.querySelector("option[value=none]");
				noneOpt.disabled = role.value !== "readonly";
				if (noneOpt.disabled && ex.value === "none") ex.value = "today";
				var at = expiresAt(ex.value);
				var text = "失効: " + (at ? esc(when(at)) : "なし(無期限)");
				if (ex.value === "1y") text += "<span class=\"key_warn\">" + ICON_WARN + "長い期限。漏れたときの被害が長く続く。切れる前に発行し直す</span>";
				if (ex.value === "none") text += "<span class=\"key_warn\">" + ICON_WARN + "失効しない。ほかのサービスが値を読みに来る連携だけに使い、使わなくなったら消す</span>";
				part("form").querySelector("[data-f=hint]").innerHTML = text;
			};
			part("form").querySelectorAll("select").forEach(function (s) { s.addEventListener("change", hint); });
			part("form").querySelector("[data-f=issue]").addEventListener("click", issue);
			hint();
		};

		var renderIssued = function () {
			if (!issued) { part("issued").innerHTML = ""; return; }
			part("issued").innerHTML = "<div class=\"key_issued\">" +
				"<div><b>発行しました。このキーは二度と表示されないので、必ずコピーしてください。</b></div>" +
				"<div class=\"key_value version_text\">" + esc(issued.apiKey) + "</div>" +
				"<div class=\"runtime_text\">有効期限: " + (issued.expiresAt ? esc(when(issued.expiresAt)) : "無期限") + " / 権限: " + esc(ROLES[issued.role] || issued.role) + "</div>" +
				"<div class=\"key_issued_actions\"><button type=\"button\" class=\"search_btn\" data-copy=\"key\">APIキーをコピー</button>" +
				"<button type=\"button\" class=\"search_btn primary\" data-copy=\"chat\">AIチャット貼り付け用にコピー</button></div></div>";
			part("issued").querySelector("[data-copy=key]").addEventListener("click", function (e) { UI.copy(e.target, issued.apiKey); });
			part("issued").querySelector("[data-copy=chat]").addEventListener("click", function (e) {
				var b = e.target;
				pasteText(issued).then(function (text) { UI.copy(b, text); });
			});
		};

		var renderList = function (keys) {
			var sorted = keys.slice().sort(function (a, b) {
				var val = function (k) { return k.expiresAt == null ? Infinity : new Date(k.expiresAt).getTime(); };
				return val(b) - val(a);   // 期限の長い物が上。切れた物は、いちばん下
			});
			var rows = sorted.map(function (k) {
				var expired = k.expiresAt != null && new Date(k.expiresAt).getTime() <= Date.now();
				return "<tr" + (expired ? " class=\"row_expired\"" : "") + "><td>" + (k.label ? esc(k.label) : "<span class=\"null_val\">メモなし</span>") + "</td>" +
					"<td>" + esc(ROLES[k.role] || k.role) + "</td><td style=\"white-space:nowrap\">" + esc(when(k.createdAt)) + "</td>" +
					"<td style=\"white-space:nowrap\">" + (k.expiresAt == null ? "<span class=\"status_badge pending\">無期限</span>" : esc(when(k.expiresAt)) + "<div class=\"runtime_text\">" + esc(remaining(k.expiresAt)) + "</div>") + "</td>" +
					"<td style=\"white-space:nowrap\">" + (k.lastUsedAt ? esc(when(k.lastUsedAt)) : "<span class=\"null_val\">なし</span>") + "</td>" +
					"<td class=\"row_actions\"><button type=\"button\" class=\"icon_button danger\" title=\"削除\" aria-label=\"削除\" data-del=\"" + esc(k.id) + "\">" + ICON_TRASH + "</button></td></tr>";
			}).join("");
			part("list").innerHTML = "<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr><th>メモ</th><th>権限</th><th>発行日時</th><th>有効期限</th><th>最終利用</th><th>操作</th></tr></thead><tbody>" +
				(rows || "<tr><td colspan=\"6\" class=\"runtime_text\">発行したキーなし</td></tr>") + "</tbody></table></div>";
			part("list").querySelectorAll("[data-del]").forEach(function (b) {
				b.addEventListener("click", function () {
					var k = sorted.filter(function (x) { return x.id === b.getAttribute("data-del"); })[0];
					UI.confirm({title: "APIキーの削除", danger: true, ok: "削除する",
						body: "APIキー「" + esc(k.label || "メモなし") + "」を削除。このキーを使っているクライアントは、使えなくなる。元に戻せない。"}).then(function (yes) {
						if (!yes) return;
						request("DELETE", cfg.keys + "/" + encodeURIComponent(k.id)).then(load, function (err) {
							UI.error({body: "APIキーを削除できなかった。", detail: err.message});
						});
					});
				});
			});
		};

		var load = function () {
			return request("GET", cfg.keys).then(function (d) {
				var keys = Array.isArray(d) ? d : (d.keys || []);
				if (!part("form").innerHTML) renderForm(d && d.myRole);
				renderList(keys);
			}, function (err) { UI.error({body: "APIキーの一覧を読めなかった。", detail: err.message}); });
		};

		var issue = function () {
			var f = function (n) { return part("form").querySelector("[data-f=" + n + "]"); };
			var body = {label: f("label").value.trim(), role: f("role").value, expiryOption: f("expiry").value};
			f("issue").disabled = true;
			request("POST", cfg.keys, body).then(function (created) {
				issued = created;
				f("label").value = "";
				renderIssued();
				return load();
			}, function (err) { UI.error({body: "APIキーを発行できなかった。", detail: err.message}); })
				.then(function () { f("issue").disabled = false; });
		};

		load();
	}

	// AI チャット貼り付け用の文面(認証 4.4)。期限と権限を、ガイドの前に置く
	function pasteText(k) {
		var base = new URL(".", location.href).href;
		var head = cfg.service + "のAPIキーを発行しました。以下の情報でAPIを直接呼び出してください。\n" +
			"- 有効期限: " + (k.expiresAt ? when(k.expiresAt) : "無期限") + "(これを過ぎると使えなくなります。切れたら、利用者に新しいキーの発行を頼んでください)\n" +
			"- 権限: " + (ROLE_DETAIL[k.role] || k.role) + "\n" +
			"- APIキー: " + k.apiKey + "\n" +
			"- ベースURL: " + base + "\n\n";
		var guide = cfg.demo ? Promise.resolve(DEMO.guide) : cfg.guide
			? fetch(cfg.guide, {credentials: "same-origin"}).then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; })
			: Promise.resolve("");
		return guide.then(function (g) {
			return head + g.split("<APIキー>").join(k.apiKey).split("<ベースURL>").join(base).split("<サービス名>").join(cfg.service);
		});
	}

	// ---------------------------------------------------------------- 自分の操作の履歴
	function openHistory() {
		var m = UI.modal({titleHtml: "自分の操作の履歴", wide: true, body: "<div class=\"runtime_text\" style=\"margin-bottom:6px\">自分の分だけ(新しい順)。全員の分は、管理者が管理の画面の「監査ログ」で見る。</div><div data-part=\"list\">Checking…</div>"});
		request("GET", cfg.history).then(function (d) {
			var entries = Array.isArray(d) ? d : (d.entries || []);
			var actions = (d && d.actions) || [];
			var label = function (v) { for (var i = 0; i < actions.length; i += 1) if (actions[i].value === v) return actions[i].label; return v; };
			m.box.querySelector("[data-part=list]").innerHTML = "<div class=\"data_table_wrap\"><table class=\"data_table\"><thead><tr><th>日時</th><th>操作</th><th>対象</th><th>結果</th><th>経路</th></tr></thead><tbody>" +
				(entries.map(function (e) {
					var r = RESULT[e.result] || ["completed", "Success"];
					return "<tr" + (e.result && e.result !== "success" ? " class=\"row_failed\"" : "") + "><td style=\"white-space:nowrap\">" + esc(when(e.at)) + "</td>" +
						"<td>" + esc(label(e.action)) + "</td><td>" + (e.target ? esc(e.target) : "―") + "</td>" +
						"<td><span class=\"status_badge " + r[0] + "\">" + r[1] + "</span></td><td>" + (e.via === "apikey" ? "APIキー" : "画面") + "</td></tr>";
				}).join("") || "<tr><td colspan=\"5\" class=\"runtime_text\">記録なし</td></tr>") + "</tbody></table></div>";
		}, function (err) { m.close(); UI.error({body: "操作の履歴を読めなかった。", detail: err.message}); });
	}

	document.addEventListener("click", function (e) {
		var b = e.target.closest && e.target.closest("[data-open]");
		if (!b) return;
		var what = b.getAttribute("data-open");
		if (what !== "apikeys" && what !== "history") return;
		e.preventDefault();
		if (what === "apikeys") openKeys(); else openHistory();
	});
	window.Account = {openKeys: openKeys, openHistory: openHistory};
})();
