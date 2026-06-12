# OshiHub ⭐ 推し活スケジュール管理アプリ（β版）

推しを登録するだけで、AIが公式サイト・公式Xの情報を集めて予定を自動でカレンダーにまとめる、アイドルファン向けアプリ。

## 特徴

- 📱 スマホファースト / ピンク・紫・水色の柔らかい配色
- 🔐 Googleログイン（Firebase Authentication）
- ⭐ 推しグループ登録（複数選択・後から変更可）
- 🤖 AIによる予定収集（ライブ／特典会／テレビ／ラジオ／YouTube／TikTok LIVE／リリース／グッズ）
- 🏠 ホーム：今日の予定・今週の予定・推しニュース
- 📅 月表示カレンダー（イベントのある日にマーク、タップで詳細へ）
- 🔔 通知設定（カテゴリ・タイミング・グループ別 ON/OFF）

## 技術構成

React + TypeScript + Vite + Tailwind CSS + Firebase（Authentication / Firestore / Hosting）

## セットアップ

```bash
npm install
npm run dev      # http://localhost:5173
```

### デモモード（Firebase 不要）

`.env` を作らずに起動すると **デモモード** で動きます。Google ログインは擬似ユーザーに、
データはモック（`src/data/`）になり、設定は `localStorage` に保存されます。
すぐ動かして UI を確認したいときに便利です。

### 本番モード（Firebase 接続）

1. Firebase コンソールでプロジェクトを作成
2. Authentication で「Google」プロバイダを有効化
3. Firestore を作成（`firestore.rules` を適用）
4. `.env.example` を `.env` にコピーし、各値を設定

```bash
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
```

`.env` の値が揃うと自動的に本番モード（実 Google ログイン + Firestore）に切り替わります。

## Firestore データモデル

```
users/{uid}        UserProfile（推し登録・通知設定）
events/{eventId}   OshiEvent（AI収集バックエンドが書き込み、クライアントは読み取りのみ）
news/{newsId}      OshiNews
```

クライアントは `src/services/eventService.ts` 経由でのみデータにアクセスするため、
収集ロジックを差し替えても UI は変更不要。

## 予定収集バックエンド（2方式）

予定を `events` コレクションに自動投入する方法は2つあります。**無料で始めるなら方式Aを推奨**。

| 方式 | コスト | 対応グループ | 仕組み |
|---|---|---|---|
| **A. 無料スクレイパ（`scraper/`）★推奨** | **0円**（GitHub Actions無料枠） | **β版10組すべて** | 公式サイトのJSON/HTMLを直接パース。AI不使用 |
| B. AI収集（`functions/`） | 従量（Anthropic API） | 全10組 | Claudeのweb巡回＋抽出。任意 |

方式Aで**β版対応10組すべて**を無料でカバーします（ヘッドレスブラウザ不要・追加課金なし）。
方式Bは将来サイト構造が変わってAパーサーが壊れた際の代替・補完として残しています。

---

## A. 無料スクレイパ（`scraper/`）★推奨

公式サイトを直接パースして Firestore に保存。**Anthropic API を使わず、GitHub Actions の無料枠で毎日1回実行**します。

```
scraper/src/
  sources.mjs              収集対象と使用パーサー
  parsers/nogizaka.mjs     乃木坂46（公式JSON API）
  parsers/iyimei.mjs       =LOVE / ≠ME / ≒JOY（公式HTML・同一CMS）
  parsers/asobisystem.mjs  FRUITS ZIPPER / CUTIE STREET / CANDY TUNE / SWEET STEADY（公式HTML）
  parsers/sakurazaka.mjs   櫻坂46（公式ページ内のイベント配列）
  parsers/hinatazaka.mjs   日向坂46（公式HTML）
  util.mjs                 カテゴリ判定・日付整形
  firestore.mjs            Firestore へ upsert（重複防止）
  collect.mjs              収集エントリ
.github/workflows/collect.yml   毎日 JST 6:00 に自動実行
```

### ローカルで動作確認（保存なし）

```bash
cd scraper
npm install
npm run dry                       # 全対応グループを取得して表示のみ
node src/collect.mjs --dry nogizaka46   # 特定グループだけ
```

### 本番（自動実行）の設定

1. Firebase コンソールでサービスアカウント鍵（JSON）を発行
2. GitHub リポジトリの **Settings → Secrets → Actions** に `FIREBASE_SERVICE_ACCOUNT` を作成し、鍵JSONの全文を貼り付け
3. `.github/workflows/collect.yml` が毎日自動実行（Actions タブから手動実行も可）

これで毎日 `events` が更新され、アプリに実データが反映されます（追加費用なし）。

### グループ／カテゴリを増やすには

`scraper/src/parsers/` に新しいパーサーを追加し、`sources.mjs` に `{ id, name, parser, status:'ok', base/api }` を足して
`collect.mjs` の `PARSERS` に登録するだけ。既存5パーサー（nogizaka / iyimei / asobisystem / sakurazaka / hinatazaka）が実装例です。

> サイト構造が変わるとパーサーは壊れます。`npm run dry` で件数が0になっていないか時々確認してください。

---

## B. AI予定収集バックエンド（`functions/`）※任意・従量課金

公式サイト・公式Xから予定を自動収集して `events` / `news` に書き込む Cloud Functions。
**Claude（claude-opus-4-8）のサーバーサイド `web_search` / `web_fetch` ツール**で巡回し、
`strict` ツールで構造化抽出した結果を Firestore へ保存します（スクレイパの手書き不要）。

```
functions/src/
  groups.ts      収集対象グループと公式URL・Xハンドル
  collector.ts   Claude で巡回・構造化抽出（save_schedule ツール）
  firestore.ts   決定的IDで upsert（再実行時の重複防止）
  index.ts       scheduledCollect（6時間ごと）/ manualCollect（手動HTTP）
  runOnce.ts     ローカル実行スクリプト
```

### セットアップ・デプロイ

```bash
cd functions
npm install

# Anthropic API キーを Secret Manager に登録
firebase functions:secrets:set ANTHROPIC_API_KEY

# デプロイ（定期実行 + 手動トリガー）
npm run deploy
```

デプロイ後、初回データ投入は手動トリガーで実行できます:

```bash
curl https://asia-northeast1-<PROJECT_ID>.cloudfunctions.net/manualCollect
```

以降は6時間ごとに自動で `events` / `news` が更新され、アプリに実データが反映されます。

### ローカルで1回だけ試す（デプロイ不要）

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccount.json"
$env:ANTHROPIC_API_KEY = "sk-ant-..."
cd functions
npm run collect:once                 # 全グループ
node lib/runOnce.js fruits-zipper    # 特定グループだけ
```

> 注意: 収集には Anthropic API の利用料がかかります（web検索/取得＋抽出）。
> グループ数・頻度に応じてコストを見積もってください。公式サイトの構造変更や
> X の取得制限により、一部ソースが取れない場合があります（その分は web_search で補完）。

## ディレクトリ構成

```
src/
  components/   再利用UI（カード・バッジ・ナビ等）
  contexts/     AuthContext（Firebase/デモ両対応）
  data/         グループ定義・モックデータ
  hooks/        useEvents / useNews
  pages/        Login / Onboarding / Home / Calendar / EventDetail / Settings
  services/     データ取得・永続化層（Firestore 抽象化）
  types/        ドメイン型（OshiEvent / UserProfile 等）
  utils/        日付・カテゴリのヘルパー
```

## 拡張ポイント（今後）

- 🏆 **ランキング機能** … `services/` に rankingService を追加し、`events` 集計を読む
- 📔 **推し活記録機能** … `users/{uid}/records` サブコレクションを追加、型は `types/` に集約
- 🔔 **プッシュ通知の実配信** … Firebase Cloud Messaging + Functions のスケジューラ

ドメインモデルとデータ層を分離しているため、上記は UI を大きく変えずに追加できます。

## ビルド / デプロイ

```bash
npm run build
# Firebase Hosting
firebase deploy --only hosting
```
