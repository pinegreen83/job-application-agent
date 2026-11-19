use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::{InvokeBody, Request};

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SyntheticRecord {
    id: String,
    text: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Arguments {
    record: SyntheticRecord,
}

#[derive(Debug, PartialEq, Serialize)]
pub(crate) struct ValidatedRecord {
    id: String,
    text: String,
    status: &'static str,
}

#[derive(Debug, PartialEq, Serialize)]
pub(crate) struct ValidationError {
    code: &'static str,
    message: &'static str,
}

const INVALID_RECORD: ValidationError = ValidationError {
    code: "INVALID_RECORD",
    message: "합성 레코드의 형식과 입력 범위를 확인해 주세요.",
};

fn validate_body(body: &Value) -> Result<ValidatedRecord, ValidationError> {
    // Borrow the transport body. Deserialization owns just the typed strings;
    // discard serde errors rather than reflecting unknown fields or input values.
    let arguments = Arguments::deserialize(body).map_err(|_| INVALID_RECORD)?;
    let record = arguments.record;
    if record.id != "synthetic-m0-001"
        || record.text.trim().is_empty()
        || record.text.chars().count() > 256
        || record.text.chars().any(char::is_control)
    {
        return Err(INVALID_RECORD);
    }
    // Move validated strings into the response without normalizing user input.
    // This function has no persistence, environment access, or asynchronous work.
    Ok(ValidatedRecord {
        id: record.id,
        text: record.text,
        status: "validated",
    })
}

#[tauri::command]
pub(crate) fn m0_validate_record(request: Request<'_>) -> Result<ValidatedRecord, ValidationError> {
    match request.body() {
        InvokeBody::Json(body) => validate_body(body),
        InvokeBody::Raw(_) => Err(INVALID_RECORD),
    }
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
            assert_eq!(result.status, "validated");
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
