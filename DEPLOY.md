# OshiHub 本番投入 手順書

**完全無料（Firebase Spark プラン）で動きます。** Cloud Functions は使わず、収集は GitHub Actions（無料）で回します。
所要時間の目安: 20〜30分。`★` が付いた箇所はあなたのアカウント操作が必要です。

---

## STEP 1 ★ Firebase プロジェクト作成（ブラウザ）

1. https://console.firebase.google.com を開き「プロジェクトを追加」
2. **Authentication** → 「始める」→ **Google** を有効化（サポートメールを選択して保存）
3. **Firestore Database** → 「データベースの作成」→ **本番環境モード** → ロケーション **asia-northeast1（東京）**
4. **プロジェクトの設定（⚙）→ マイアプリ → ウェブ（`</>`）を追加** → アプリ登録
   → 表示される `firebaseConfig` の次の6値を控える:
   `apiKey` / `authDomain` / `projectId` / `storageBucket` / `messagingSenderId` / `appId`

> 課金プラン変更は不要。Auth・Firestore・Hosting はすべて無料枠で動きます。

---

## STEP 2 ★ フロントの設定とデプロイ（ターミナル）

プロジェクト直下（`C:\Users\治往\頑張るアプリ制作`）で:

1. `.env` を開き、STEP 1 の6値を記入:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   → 値を入れると自動的に「デモモード」から「本番モード」に切り替わります。

2. ビルド・ログイン・プロジェクト紐付け・デプロイ:
   ```powershell
   npm run build
   npx firebase login
   npx firebase use --add        # 一覧から STEP1 のプロジェクトを選び、alias は default
   npx firebase deploy --only hosting,firestore:rules,firestore:indexes
   ```
   → 完了後に表示される **Hosting URL（https://<projectId>.web.app）** が本番URLです。

3. Authentication → Settings → 「承認済みドメイン」に `<projectId>.web.app` が入っているか確認（通常は自動追加）。

---

## STEP 3 ★ 初回データ投入（ローカルで即時・無料）

1. Firebase: **プロジェクトの設定 → サービスアカウント → 「新しい秘密鍵を生成」** → JSON をダウンロード（例: `C:\keys\serviceAccount.json`）
2. スクレイパを1回実行して Firestore に実データ投入:
   ```powershell
   cd "C:\Users\治往\頑張るアプリ制作\scraper"
   npm install
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\keys\serviceAccount.json"
   npm run collect
   ```
   → `events` に10組の実予定が入ります。本番URLをリロードすると実データが表示されます。

> ⚠️ `serviceAccount.json` と `.env` は**絶対にGitに含めない**でください（`.gitignore` で除外済み）。

---

## STEP 4 ★ 毎日自動更新の設定（GitHub Actions・無料）

1. GitHub で空のリポジトリを作成（Private 可）
2. ローカルから push:
   ```powershell
   cd "C:\Users\治往\頑張るアプリ制作"
   git init
   git add .
   git commit -m "OshiHub initial"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
3. GitHub → リポジトリ **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: `serviceAccount.json` の**中身全文**を貼り付け
4. **Actions タブ → 「Collect schedules (free)」→ Run workflow** で手動実行して動作確認。
   以降は毎日 **JST 6:00** に自動収集されます。

---

## 完了チェック

- [ ] 本番URLでGoogleログインできる
- [ ] 推し選択後、ホーム/カレンダーに実データが出る
- [ ] GitHub Actions が成功（緑チェック）
- [ ] 翌朝、データが更新されている

## トラブル時

- **データが出ない** → STEP3を実行したか／Firestoreの `events` にドキュメントがあるか確認
- **インデックスエラー** → `npx firebase deploy --only firestore:indexes` を再実行（作成に数分かかる場合あり）
- **収集が0件のグループがある** → 公式サイト構造変更の可能性。`cd scraper; npm run dry` でローカル確認し、該当パーサーを修正
