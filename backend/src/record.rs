use crate::error::{CommandError, INVALID_RECORD};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SyntheticRecord {
    pub(crate) id: String,
    pub(crate) text: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Arguments {
    record: SyntheticRecord,
}

impl SyntheticRecord {
    pub(crate) fn validate(self) -> Result<Self, CommandError> {
        if self.id != "synthetic-m0-001"
            || self.text.trim().is_empty()
            || self.text.chars().count() > 256
            || self.text.chars().any(char::is_control)
        {
            return Err(INVALID_RECORD);
        }
        Ok(self)
    }
}

pub(crate) fn validate_body(body: &Value) -> Result<SyntheticRecord, CommandError> {
    // Do not reflect serde errors or unknown fields across IPC.
    Arguments::deserialize(body)
        .map_err(|_| INVALID_RECORD)?
        .record
        .validate()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn preserves_unicode_and_boundary_without_normalization() {
        for text in [" 한글 e\u{301} 🦀 ".to_owned(), "🦀".repeat(256)] {
            let result =
                validate_body(&json!({"record": {"id": "synthetic-m0-001", "text": text}}))
                    .unwrap();
            assert_eq!(result.text, text);
        }
    }

    #[test]
    fn rejects_invalid_ranges_and_controls() {
        for text in [
            "".to_owned(),
            " \u{3000} ".to_owned(),
            "a".repeat(257),
            "a\n".to_owned(),
            "a\0".to_owned(),
            "a\u{7f}".to_owned(),
        ] {
            assert_eq!(
                validate_body(&json!({"record": {"id": "synthetic-m0-001", "text": text}})),
                Err(INVALID_RECORD)
            );
        }
        assert_eq!(
            validate_body(&json!({"record": {"id": "wrong-id", "text": "valid"}})),
            Err(INVALID_RECORD)
        );
    }

    #[test]
    fn rejects_bad_shapes_without_reflecting_synthetic_secret() {
        let sentinel = "synthetic-secret-never-reflect";
        for body in [
            Value::Null,
            json!({}),
            json!({"record": null}),
            json!({"record": {"id": "synthetic-m0-001"}}),
            json!({"record": {"id": 1, "text": "valid"}}),
            json!({"record": {"id": "synthetic-m0-001", "text": 42}}),
            json!({"record": {"id": "synthetic-m0-001", "text": [sentinel]}}),
            json!({"record": {"id": "synthetic-m0-001", "text": "valid", sentinel: sentinel}}),
            json!({"record": {"id": "synthetic-m0-001", "text": "valid"}, sentinel: sentinel}),
        ] {
            let error = validate_body(&body).unwrap_err();
            assert_eq!(error, INVALID_RECORD);
            assert!(!serde_json::to_string(&error).unwrap().contains(sentinel));
        }
    }
}
