# Template02 — 個人向け(B2C) ベーステンプレート

個人ユーザー向けサービスのUIベース。**丸み・余白広め・モバイルファースト**の親しみやすいレイアウトに、**Template01と同じ配色（青の主ボタン＋オレンジのアクセント）**を合わせた系統。

新しい画面をAIに作らせるときは、このファイルと `Template02/` 一式を渡し「このテンプレートに従って○○画面を作って」と依頼してください。

## このテンプレートの位置づけ(最初に読む)

**これは、デザインと操作性のテンプレートです。実装の方法を決める物でも、強いる物でもありません。**

- 主眼は、**見た目とボタンの配置などの操作性**です。ワイヤーを検討しなくても、見本の HTML を写せば、画面の見た目と使い勝手がそろう、が目的です。
- 決めること: 色・文字の大きさ・部品の class、画面の骨格、ボタンやアイコンの並べ方、言葉づかい。
- 決めないこと: データの取り方、WebAPI の形、サーバーや認証の作り、画面を動かすスクリプトの書き方、使うライブラリ。これらは、作るサービスごとに自由に実装してください。
- 実装の方法(実現方法や内部の作り)は、このテンプレートではなく、各プロジェクトのアーキテクチャの資料で決めます。その資料も、AI に任せて作る進め方の妨げにならないよう、守る動きと安全の決まりにとどめ、書き方やライブラリまでは縛らない想定です。
- 見本の中のスクリプト(パスワードの表示の切り替えなど)や、画面の行き来は、見本を動かして見せるための物です。サービスの実装の手本ではありません。

## AIへの基本指示（コピペ可）
> 添付の `Template02/` を唯一のデザイン基準とすること。
> - CSSは `assets/base.css` のみを読み込み、既存のクラス／トークンで組む（新規CSSは極力書かない）。
> - モバイルファースト。中央寄せの最大幅（認証カード420px／アプリ本文480px）を踏襲。
> - 配色は下記トークンの範囲（青=主アクション、オレンジ=アクセント/選択、ニュートラル背景）。

## ファイル構成
```
Template02/
├─ assets/base.css          配色トークン＋全部品(認証/アプリシェル)
├─ template_login.html      ログイン(中央パネル)
├─ template_register.html   新規会員登録(中央パネル)
├─ template_home.html       ログイン後ホーム(メニュー): ヘッダ＋ハイライト＋タイル＋リスト＋下部ナビ
├─ template_search.html     さがす(発見型): 検索バー＋カテゴリチップ＋カードグリッド
├─ template_notifications.html お知らせ(時系列): すべて/未読＋日付グループ＋未読/既読フィード
├─ template_mypage.html     マイページ(プロフィール/設定/ログアウト)
├─ template_profile_edit.html 単票入力サンプル(プロフィール編集): 各種入力型＋固定保存バー
└─ AI_GUIDE.md
```

## デザイントークン（`:root`、Template01準拠）
| 用途 | 変数 | 値 |
|---|---|---|
| 主アクション(青) | `--primary` / `--primary-dark` | `#187FF5` / `#0f5fbb` |
| アクセント(オレンジ) | `--accent` / `--accent-tint` | `#ee7800` / `#fff4e5` |
| 文字 / 補助 | `--text` / `--muted` | `#2b2b2b` / `#8a8a8a` |
| 背景 / 面 / 罫線 | `--bg` / `--card` / `--line` | `#f2f4f7` / `#fff` / `#e8e8e8` |
| 危険 / 成功 | `--danger` / `--ok` | `#d22222` / `#1a6e1a` |
| 角丸 | `--radius-card/field/pill` | `22 / 14 / 999px` |

- 主ボタン=`btn btn_primary`(青・角丸pill)、副=`btn btn_ghost`。
- 選択/アクティブ状態・アイコンチップ・ホバー地は**オレンジ系**（`--accent` / `--accent-tint`）。

## 画面の骨格
- **中央パネル系(認証)**: `.auth_wrap > .auth_card`（`brand` → `auth_title/auth_sub` → `field`×n → `btn_primary` → `divider` → `auth_foot`）。
- **ログイン後(アプリシェル)**: `.app_header`（`app_brand`＋`app_actions`）→ `.app_main`（`greeting`／`hero_card`／`section_title`＋`menu_grid`／`list_card`）→ `.app_nav`（`nav_item`、現在地に `active`）。本文は下部ナビ分の余白込み。

## 主要コンポーネント早見
- 入力: `.field > .field_label + .input`（パスワードは `.input_group` に `.input_toggle`）。
- ボタン: `.btn.btn_primary` / `.btn.btn_ghost`（`.btn_social` でアイコン＋文言）。
- タイル: `.menu_grid > a.menu_tile(.mt_icon/.mt_label)`。
- リスト: `.list_card > a.list_row(.lr_icon/.lr_body(.lr_title/.lr_sub)/.lr_meta/.lr_chev)`。
- バッジ: `.badge.badge_primary|badge_accent|badge_ok`。
- トグル: `.switch > input + .track`（onで青）。
- 通知ドット: `.icon_btn > .dot`。

## 一覧系の見せ方の違い
- **さがす(発見型)** = `search_bar` ＋ `chip_row/chip`(カテゴリ、選択で `active`) ＋ `card_grid > a.pcard`(`pc_thumb`/`pc_body`(`pc_title`/`pc_meta`/`pc_foot`(`pc_price`/`pc_like`)))。探して選ぶための**カードグリッド**。
- **お知らせ(時系列型)** = `seg`(すべて/未読) ＋ `feed_date`(今日/今週/以前) ＋ `list_card > a.list_row`。未読は `list_row.unread` ＋ `unread_dot`。読む**フィード**。

## 単票入力フォーム（`template_profile_edit.html`）
1レコードをまとめて編集するサブページ。ヘッダは `hdr_back`(戻る)＋`hdr_title`、下部タブナビは出さず**固定保存バー** `form_bar`(`btn_ghost`＋`btn_primary`)を置く（保存ボタンはフォーム外なので `form="<id>"` で紐付け）。
- 基本入力: `.field > .field_label(.req で必須) + .input`（`input`/`textarea.input`/`select.input` を共用。selectは右にシェブロン付与済み、textareaは高さ可変）。
- セグメント選択(ラジオ): `.opt_row > label.opt > input[type=radio] + span`（選択で青）。
- フォーム内トグル: `.toggle_field`（説明＋`.switch`）。
- アバター編集: `.avatar_edit > .ae_pic(.avatar + .ae_cam) + .ae_link`。
- 本文は `app_main` の下余白で保存バーを避ける。

## フロー(デモ)
ログイン/登録 → `template_home.html`（実際は認証エンドポイントへPOST→成功後リダイレクト）。ホーム⇄マイページは下部ナビ／アバターで往復。ログアウト→ログイン。

## 注意
UIテンプレート（ダミー項目）です。実在サービスの偽装や実資格情報の収集には使わないこと。

---

## 著作権・ライセンス

- Copyright (c) 2026 EARCE.NET — 本テンプレートのコードおよび画面デザインの著作権は EARCE.NET が保有します。
- ライセンス: MIT License（リポジトリ直下の `LICENSE` を参照）。
- 公開場所: GitHub で公開しています — <https://github.com/EARCE9000/DesignTemplate>
