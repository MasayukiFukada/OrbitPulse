# データベースバックアップ手順

## バックアップ方法

### 1. ファイルコピーによるバックアップ
```bash
cp sqlite.db sqlite.db.backup.$(date +%Y%m%d)
```

### 2. SQLダンプによるバックアップ
```bash
sqlite3 sqlite.db .dump > backup_$(date +%Y%m%d).sql
```

### 3. リストア方法
```bash
# ダンプファイルからリストア
sqlite3 sqlite.db < backup_20260501.sql

# またはファイルをコピーして戻す
cp sqlite.db.backup.20260501 sqlite.db
```

## 注意事項
- データベースを削除・再作成する前には必ずバックアップを取る
- `drizzle-kit push` はスキーマを強制更新するため、データが消える可能性がある
- 本番環境ではマイグレーションファイルを使用する
