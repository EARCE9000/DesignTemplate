# 画面作成ガイド（AI向けベーステンプレート）

このフォルダは、社内ツール（EARCE.NET "Simple Wireframe" 系）の**画面デザインを統一するためのベーステンプレート**です。
新しい画面をAIに作らせるときは、**このファイルと `_template/` 一式を渡し、「このテンプレートに従って○○画面を作って」** と依頼してください。

---

## AIへの基本指示（そのままコピペ可）

> 添付の `_template/` を**唯一のデザイン基準**とすること。
> - CSSは `assets/flexbox.css` → `assets/design.css` → `assets/components.css` の順で読み込み、**新規CSSは極力書かない**。必要な部品は既存クラスを使う。
> - 画面の骨格（ヘッダ / メニューバー / `flex_container > flex_main` / `item_group`）は各テンプレHTMLを踏襲する。
> - 目的に最も近いテンプレを土台に複製して作る:
>   - メニュー/入口 → `template_menu.html`
>   - 検索・絞り込み一覧 → `template_list.html`
>   - Queueレベルの簡易登録(少項目・上入力/下直近一覧) → `template_form_simple.html`
>   - 単票の登録/編集(多項目・セクション分け・2カラム) → `template_form.html`
> - 独自の色や角丸を新設せず、下記トークン/クラスの範囲で構成する。

---

## ファイル構成

```
_template/
├─ assets/
│   ├─ flexbox.css       レイアウト土台(box-sizing, flex骨格) ※変更しない
│   ├─ design.css        基本スタイル(ヘッダ/メニューバー/ボタン/item_group) ※変更しない
│   ├─ components.css    共通部品(バッジ/テーブル/フォーム/フィルタ/タイル/モーダル/カード 等)
│   └─ dropzone.js       ファイルD&Dの共通挙動(全 .dropzone を自動初期化)
├─ template_menu.html         メニュー画面
├─ template_list.html         一覧+絞り込み+検索(空状態の例も内包)
├─ template_form_simple.html  簡易登録(Queueレベル): 上で入力・下で直近一覧
├─ template_form.html         単票登録/編集(標準): 多項目・セクション分け・2カラム
├─ template_form_confirm.html 登録内容の確認: form → confirm → 登録 の中間画面
├─ template_detail.html       詳細表示(読み取り専用)+編集/削除、削除確認モーダル内蔵
├─ template_monitor.html      状態モニタ/ダッシュボード: カード+ステータス+自動更新
├─ template_status.html       状態画面: 完了/エラー(403/404/500の例)
└─ AI_GUIDE.md                このファイル
```

### 画面の使い分けと標準フロー
- 一覧 `template_list.html` → 行の「詳細」→ `template_detail.html` → 「編集」→ `template_form.html`（→確認→完了）／「削除」→ 詳細内のモーダル。
- 登録: `template_form.html` → `template_form_confirm.html` → `template_status.html`（完了）。
- 監視系は `template_monitor.html`、結果/エラー表示は `template_status.html`。

CSSは3枚を**この順**で読み込む（後勝ちで上書きするため順序が重要）:

```html
<link rel="stylesheet" href="./assets/flexbox.css" type="text/css">
<link rel="stylesheet" href="./assets/design.css" type="text/css">
<link rel="stylesheet" href="./assets/components.css" type="text/css">
```

---

## デザイントークン（この範囲で作る）

| 用途 | 色 |
|------|-----|
| アクセント（ホバー/選択） | `#ee7800` |
| ボタンホバー地 | `#ffa500` |
| 登録・主ボタン（青） | `#187FF5` |
| ヘッダ地（黒帯） | `#16160e` |
| メニューバー地 / 見出し | `#2b2b2b` |
| 危険・エラー（赤） | `#d22222` |
| 警告（紫） | `#5a4498` |
| 罫線グレー | `#e8e8e8` / `#d0d0d0` |
| ホバー行 地 | `#fff4e5` |

- フォントサイズは **pt** 基調（見出し18pt / 本文10〜11pt / 補助9pt / バッジ8pt）。
- 角丸は `border-radius: 6〜10px`、バッジは `4px`。

### レスポンシブ（スマホ対応済み）
- PC〜タブレット: flex の `flex-wrap` + `min-width` で列が伸縮・折り返し。
- **700px 以下**: `components.css` 末尾の `@media (max-width:700px)` で、
  カードの固定下限幅解除・フォームのラベル上積み・ボタン縦積み・
  フィルタボタンの折り返しを行い、横はみ出しを防止する。
- 幅広テーブルは `.data_table_wrap`（`overflow-x:auto`）で横スクロール。
- 骨格を踏襲すれば新規画面も自動でこの挙動になる（追加CSS不要）。

> 補足: 元の `flexbox.css` にはバグがあり修正済み。
> ① media query のセレクタ誤字 `.flex-container`→`.flex_container`
> ② `.flex_item3` 重複定義 → `.flex_item4` に修正。
> スマホ幅の横はみ出し主因だった `design.css` の `.item_group{min-width:480px}`
> は `components.css` の media query で 700px 以下のみ上書きして無効化している。

---

## 画面の骨格（全画面共通）

```html
<body>
  <div class="header"> … ユーザー名 / ログアウト … </div>   <!-- 黒帯 -->
  <div class="flex_menubar"> … ホーム / パンくず … </div>    <!-- 濃灰ナビ -->
  <div class="flex_container">
    <div class="flex_main">
      <div class="item_group"> … カード単位のコンテンツ … </div>
    </div>
  </div>
  <div class="footer">                                       <!-- 黒帯 左:コピーライト / 右:バージョン -->
    <span class="footer_copyright">&copy; {{年}} {{会社名}}</span>
    <span class="footer_version">Ver. {{バージョン}}</span>
  </div>
</body>
```

- `footer` = 全画面共通のフッター。固定表示ではなくページ最下部に置く（内容が短い画面では画面下端に付く）。
- `item_group` = 1つの機能ブロック（カード）。見出しは `item_title > .title`。
- 2カラムにしたい時は `flex_container` 内に `flex_main`/`flex_side` を並べる。

---

## 主要コンポーネント早見

### ボタン（`design.css`）
```html
<button class="entry_button">登録</button>     <!-- 青:主アクション -->
<button class="cancel_button">クリア</button>   <!-- 白:副アクション -->
<button class="warning_button">再実行</button>  <!-- 紫:警告 -->
<button class="caution_button">削除</button>    <!-- 赤:危険 -->
```

### ステータスバッジ（`components.css`）
```html
<span class="status_badge pending">pending</span>
<span class="status_badge processing">processing</span>
<span class="status_badge completed">completed</span>
<span class="status_badge failed">failed</span>
<span class="status_badge unknown">unknown</span>
```

### 一覧テーブル
`.data_table` を `.data_table_wrap`（横スクロール）で包む。
行状態の強調は `<tr class="row_failed">` / `row_processing` / `row_completed`。
空値は `<span class="null_val">NULL</span>`。

### フォーム
`form_row > form_field > (form_label + form_value)`。
必須ラベルは `class="form_label required"`（自動で赤い * が付く）。
補足は `<div class="form_hint">`。

**2種類の使い分け:**
- **簡易登録**（`template_form_simple.html`）… Queueレベルの少項目。1画面で「上=入力／下=直近一覧」。
- **単票登録/編集**（`template_form.html`）… 項目が多いマスタ等。`form_section_title` でセクション分けし、`form_row` に `form_field` を2つ並べて2カラムにする（狭幅で自動1カラム）。全幅にしたい項目は `form_row` に1フィールドだけ置く。一覧は同居させず、保存後は一覧画面へ戻す。

**登録専用フォームは確認画面を挟む（form → confirm → 登録）:**
- 入力画面（`template_form.html`）の `<form>` は確認画面（`template_form_confirm.html`）へ POST する。
- 確認画面は入力値を `form_static` で読み取り専用表示し、同じ値を `<input type="hidden">` で保持したまま登録エンドポイントへ送る。
- 確認画面のボタンは「戻る」（入力画面へ、サーバはPOST値で再表示）と「この内容で登録」（entry_button）。
- 確認を挟まない軽い登録は、入力フォームの action を直接登録先にしてよい。
- **確認画面は全項目テキスト表示が標準**。トグル/チェック/ラジオも含め、値は `form_static` でラベル:値の形で見せる（可読性優先。操作部品は「触れそう」で紛らわしいため通常は出さない）。送信値は `<input type="hidden">` で保持する。
- （例外）どうしても部品の見た目で状態を見せたい場合のみ、囲む `form_value` に `readonly` を付け各 `<input>` に `tabindex="-1"` を付けて「色そのまま・操作不可」にできる（標準ではない）。

### トグルスイッチ（ON/OFF）
チェックボックスの代わりに使うスライド式スイッチ（ON=緑・右／OFF=グレー・左、右横にラベル）。
```html
<!-- 固定ラベル -->
<label class="toggle_switch">
  <input type="checkbox" name="opt" value="1" checked>
  <span class="toggle_track"></span>
  <span class="toggle_label">有効にする</span>
</label>

<!-- ON/OFFで状態語が切り替わる(JS不要) -->
<label class="toggle_switch">
  <input type="checkbox" name="is_public" value="1">
  <span class="toggle_track"></span>
  <span class="toggle_label">
    <span class="toggle_on">公開</span>
    <span class="toggle_off">非公開</span>
  </span>
</label>
```
初期ONは `<input>` に `checked`。状態語を切り替えたい時は `toggle_label` 内に `toggle_on` / `toggle_off` を置くと、`:checked` に応じてCSSだけで表示が入れ替わる（例: 受け取る/受け取らない、公開/非公開）。

### ファイル ドラッグ&ドロップ
ドロップ / クリック選択の両対応。選択済みは名前・サイズ・削除×付きで一覧表示。
```html
<div class="form_value">
  <label class="dropzone">
    <input type="file" name="attachments[]" multiple hidden>
    <div class="dz_icon">📎</div>
    <div class="dz_text">ここにファイルをドラッグ＆ドロップ</div>
    <div class="dz_hint">または<span class="dz_browse">クリックして選択</span>（複数可）</div>
  </label>
  <div class="dz_file_list"></div>
</div>
```
`</body>` 直前で `<script src="./assets/dropzone.js"></script>` を読み込む（全 `.dropzone` を自動初期化）。DataTransfer で `input.files` を同期するのでそのまま送信可。単一ファイルなら `multiple` を外す。確認画面では**ファイル名をテキスト表示**する（全項目テキスト方針）。

### 絞り込み
`.filter_panel` 内に、期間トグル `.range_btn`（選択中に `.active`）と
`.search_form`（キーワード検索）を並べる。

### メッセージ
```html
<div class="msg_success">登録しました。</div>
<div class="msg_error">エラー: …</div>
```

### モーダル（確認ダイアログ・JS不要）
チェックボックス方式。削除など破壊的操作の確認に使う。`modal_toggle` の直後に置いた `modal_overlay` が `:checked` で表示される。
```html
<input type="checkbox" id="del_modal" class="modal_toggle" hidden>
<label for="del_modal" class="caution_button" style="cursor:pointer;">削除</label>
...
<div class="modal_overlay">
  <label for="del_modal" class="modal_backdrop"></label>
  <div class="modal_box">
    <div class="modal_title danger">削除の確認</div>
    <div class="modal_body">「対象名」を削除します。取り消せません。</div>
    <div class="modal_actions">
      <label for="del_modal" class="cancel_button" style="cursor:pointer;">キャンセル</label>
      <form method="post" action="{{削除先}}"><button class="caution_button">削除する</button></form>
    </div>
  </div>
</div>
```

### 状態モニタ カード
```html
<div class="monitor_list">
  <div class="monitor_card is_ok">   <!-- is_ok/is_running/is_stale/is_failed -->
    <span class="monitor_name">host / job</span>
    <span class="status_badge completed">正常</span>
    <span class="status_badge elapsed_15m">3分前</span>
    <span class="monitor_meta">最終成功 09:27</span>
  </div>
</div>
```
自動更新は `<head>` に `<meta http-equiv="refresh" content="30">`。

### 空状態 / 結果状態
```html
<div class="empty_state">
  <div class="empty_icon">🗂️</div>
  <div class="empty_text">該当するデータがありません</div>
  <div class="empty_hint">条件を変えるか新規追加してください。</div>
</div>

<div class="result_state ok">   <!-- ok / error -->
  <div class="result_icon">✅</div>
  <div class="result_title">登録が完了しました</div>
  <div class="result_desc">…</div>
  <div class="result_actions"><a href="…" class="entry_button" style="...">一覧へ戻る</a></div>
</div>
```

---

## やってはいけないこと

- `flexbox.css` / `design.css` の**改変**（土台なので全画面に影響する）。
- 独自カラー・独自フォント・重いUIライブラリの持ち込み。
- 既存クラスで表現できるものを新規CSSで作り直すこと。
- CSSリンクの読み込み順を変えること。

新しい共通部品が本当に必要な場合のみ、`components.css` に**追記**する（既存の命名規則 `snake_case` に合わせる）。

---

## 著作権・ライセンス

- Copyright (c) 2026 EARCE.NET — 本テンプレートのコードおよび画面デザインの著作権は EARCE.NET が保有します。
- ライセンス: MIT License（リポジトリ直下の `LICENSE` を参照）。
- 公開場所: GitHub で公開しています — <https://github.com/EARCE9000/DesignTemplate>
- 各画面フッターの `&copy; {{年}} {{会社名}}` は、このテンプレートで作る**システム側**の表記です（テンプレート自体の著作権表記ではありません）。
