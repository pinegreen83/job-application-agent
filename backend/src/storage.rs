use crate::{
    error::{
        CommandError, LOAD_FAILED, SAVE_FAILED, SIMULATED_SAVE_FAILURE, STORAGE_UNAVAILABLE,
        UNSUPPORTED_SCHEMA,
    },
    record::SyntheticRecord,
};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use std::{path::PathBuf, time::Duration};

#[derive(Clone)]
pub(crate) struct StorageLocation(Result<PathBuf, CommandError>);

#[derive(Clone, Copy)]
pub(crate) enum SaveMode {
    Commit,
    RollbackForVerification,
}

impl StorageLocation {
    pub(crate) fn new(path: Result<PathBuf, CommandError>) -> Self {
        Self(path)
    }

    fn open(&self) -> Result<Connection, CommandError> {
        let path = self.0.as_ref().map_err(|error| *error)?;
        let parent = path.parent().ok_or(STORAGE_UNAVAILABLE)?;
        std::fs::create_dir_all(parent).map_err(|_| STORAGE_UNAVAILABLE)?;
        let mut connection = Connection::open(path).map_err(|_| STORAGE_UNAVAILABLE)?;
        connection
            .busy_timeout(Duration::from_secs(2))
            .map_err(|_| STORAGE_UNAVAILABLE)?;
        initialize(&mut connection)?;
        Ok(connection)
    }

    pub(crate) fn save(
        &self,
        record: SyntheticRecord,
        mode: SaveMode,
    ) -> Result<SyntheticRecord, CommandError> {
        let record = record.validate()?;
        save_on(&mut self.open()?, record, mode)
    }

    pub(crate) fn load(&self) -> Result<Option<SyntheticRecord>, CommandError> {
        load_on(&self.open()?)
    }
}

fn initialize(connection: &mut Connection) -> Result<(), CommandError> {
    // Schema and version advance in one transaction. Unknown versions and failed
    // migrations never trigger reset, delete, or destructive repair.
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|_| STORAGE_UNAVAILABLE)?;
    let version: i64 = transaction
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|_| STORAGE_UNAVAILABLE)?;
    match version {
        0 => transaction.execute_batch("CREATE TABLE m0_records (id TEXT PRIMARY KEY CHECK(id='synthetic-m0-001'), text TEXT NOT NULL); PRAGMA user_version=1;").map_err(|_| STORAGE_UNAVAILABLE)?,
        1 => {},
        _ => return Err(UNSUPPORTED_SCHEMA),
    }
    transaction.commit().map_err(|_| STORAGE_UNAVAILABLE)
}

fn save_on(
    connection: &mut Connection,
    record: SyntheticRecord,
    mode: SaveMode,
) -> Result<SyntheticRecord, CommandError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|_| SAVE_FAILED)?;
    transaction.execute("INSERT INTO m0_records (id, text) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET text=excluded.text", params![record.id, record.text]).map_err(|_| SAVE_FAILED)?;
    if let SaveMode::RollbackForVerification = mode {
        // Same write path as normal save, fail after the write and before commit.
        // Report the intentional failure only once rollback itself succeeds.
        transaction.rollback().map_err(|_| SAVE_FAILED)?;
        return Err(SIMULATED_SAVE_FAILURE);
    }
    transaction.commit().map_err(|_| SAVE_FAILED)?;
    Ok(record)
}

fn load_on(connection: &Connection) -> Result<Option<SyntheticRecord>, CommandError> {
    let record = connection
        .query_row(
            "SELECT id, text FROM m0_records WHERE id = ?1",
            ["synthetic-m0-001"],
            |row| {
                Ok(SyntheticRecord {
                    id: row.get(0)?,
                    text: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|_| LOAD_FAILED)?;
    // Local files may be damaged/modified independently of the renderer.
    record
        .map(|value| value.validate().map_err(|_| LOAD_FAILED))
        .transpose()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(text: &str) -> SyntheticRecord {
        SyntheticRecord {
            id: "synthetic-m0-001".into(),
            text: text.into(),
        }
    }
    fn location(directory: &tempfile::TempDir) -> StorageLocation {
        StorageLocation::new(Ok(directory
            .path()
            .join("isolated")
            .join("synthetic.sqlite3")))
    }

    #[test]
    fn new_database_migrates_once_and_reopens_without_losing_unicode_or_sql_text() {
        let directory = tempfile::tempdir().unwrap();
        let storage = location(&directory);
        assert_eq!(storage.load().unwrap(), None);
        let original = record("한글 🦀 e\u{301} '; DROP TABLE m0_records; --");
        assert_eq!(
            storage.save(original.clone(), SaveMode::Commit).unwrap(),
            original
        );
        drop(storage);
        let reopened = location(&directory);
        assert_eq!(reopened.load().unwrap(), Some(original));
        let connection = reopened.open().unwrap();
        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            1
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM m0_records", [], |row| row
                    .get::<_, i64>(0))
                .unwrap(),
            1
        );
    }

    #[test]
    fn failed_write_rolls_back_after_upsert_and_keeps_previous_record() {
        let directory = tempfile::tempdir().unwrap();
        let storage = location(&directory);
        let original = record("마지막 정상 합성 저장본");
        storage.save(original.clone(), SaveMode::Commit).unwrap();
        assert_eq!(
            storage.save(record("실패할 변경"), SaveMode::RollbackForVerification),
            Err(SIMULATED_SAVE_FAILURE)
        );
        assert_eq!(location(&directory).load().unwrap(), Some(original));
        let empty_directory = tempfile::tempdir().unwrap();
        let empty = location(&empty_directory);
        assert_eq!(
            empty.save(record("실패"), SaveMode::RollbackForVerification),
            Err(SIMULATED_SAVE_FAILURE)
        );
        assert_eq!(empty.load().unwrap(), None);
    }

    #[test]
    fn readonly_and_open_failures_are_fixed_errors_and_preserve_data() {
        let directory = tempfile::tempdir().unwrap();
        let storage = location(&directory);
        storage.save(record("보존"), SaveMode::Commit).unwrap();
        let mut readonly = Connection::open_with_flags(
            storage.0.as_ref().unwrap(),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        assert_eq!(
            save_on(&mut readonly, record("덮어쓰기"), SaveMode::Commit),
            Err(SAVE_FAILED)
        );
        assert_eq!(storage.load().unwrap(), Some(record("보존")));
        let invalid = StorageLocation::new(Ok(directory.path().to_path_buf()));
        assert_eq!(invalid.load(), Err(STORAGE_UNAVAILABLE));
        assert!(!serde_json::to_string(&invalid.load().unwrap_err())
            .unwrap()
            .contains(directory.path().to_str().unwrap()));
    }

    #[test]
    fn unknown_schema_and_failed_migration_do_not_reset_existing_tables() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("fixture.sqlite3");
        let connection = Connection::open(&path).unwrap();
        connection.execute_batch("CREATE TABLE m0_records (marker TEXT); INSERT INTO m0_records VALUES ('keep-synthetic'); PRAGMA user_version=42;").unwrap();
        drop(connection);
        let storage = StorageLocation::new(Ok(path.clone()));
        assert_eq!(storage.load(), Err(UNSUPPORTED_SCHEMA));
        let connection = Connection::open(&path).unwrap();
        assert_eq!(
            connection
                .query_row("SELECT marker FROM m0_records", [], |row| row
                    .get::<_, String>(0))
                .unwrap(),
            "keep-synthetic"
        );
        connection.pragma_update(None, "user_version", 0).unwrap();
        drop(connection);
        assert_eq!(storage.load(), Err(STORAGE_UNAVAILABLE));
        let connection = Connection::open(path).unwrap();
        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT marker FROM m0_records", [], |row| row
                    .get::<_, String>(0))
                .unwrap(),
            "keep-synthetic"
        );
    }

    #[test]
    fn invalid_input_and_damaged_storage_are_not_returned_or_repaired() {
        let directory = tempfile::tempdir().unwrap();
        let storage = location(&directory);
        storage.save(record("보존"), SaveMode::Commit).unwrap();
        assert_eq!(
            storage.save(record(""), SaveMode::Commit),
            Err(crate::error::INVALID_RECORD)
        );
        assert_eq!(storage.load().unwrap(), Some(record("보존")));
        storage
            .open()
            .unwrap()
            .execute("UPDATE m0_records SET text=?1", ["synthetic-secret\n"])
            .unwrap();
        assert_eq!(storage.load(), Err(LOAD_FAILED));
        let path = directory.path().join("broken.sqlite3");
        let bytes = b"not-a-database-synthetic";
        std::fs::write(&path, bytes).unwrap();
        assert_eq!(
            StorageLocation::new(Ok(path.clone())).load(),
            Err(STORAGE_UNAVAILABLE)
        );
        assert_eq!(std::fs::read(path).unwrap(), bytes);
    }

    #[test]
    fn concurrent_transactions_keep_one_complete_record() {
        let directory = tempfile::tempdir().unwrap();
        let storage = location(&directory);
        storage.load().unwrap();
        let writers: Vec<_> = (0..8)
            .map(|index| {
                let location = storage.clone();
                std::thread::spawn(move || {
                    location.save(
                        record(&format!("합성-{index}-{}", "🦀".repeat(200))),
                        SaveMode::Commit,
                    )
                })
            })
            .collect();
        for writer in writers {
            writer.join().unwrap().unwrap();
        }
        let saved = storage.load().unwrap().unwrap();
        assert!(saved.text.starts_with("합성-"));
        assert!(saved.text.ends_with(&"🦀".repeat(200)));
        assert_eq!(
            storage
                .open()
                .unwrap()
                .query_row("SELECT count(*) FROM m0_records", [], |row| row
                    .get::<_, i64>(0))
                .unwrap(),
            1
        );
    }
}
