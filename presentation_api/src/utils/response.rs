use serde::Serialize;
use socketioxide::extract::AckSender;

/// Same envelope as the portfolio API, sent back through Socket.IO acknowledgements.
#[derive(Debug, Serialize)]
pub struct JsonResponse<T> {
    pub success: bool,
    pub message: Option<String>,
    pub result: Option<T>,
}

impl<T> JsonResponse<T> {
    pub fn make_error(error: String) -> Self {
        JsonResponse {
            success: false,
            message: Some(error),
            result: None,
        }
    }
    pub fn make_success(message: &str, result: T) -> Self {
        JsonResponse {
            success: true,
            message: Some(message.to_string()),
            result: Some(result),
        }
    }
}

/// Acks `result`, or its error message. Does nothing when the client sent no ack callback.
pub fn reply<T: Serialize>(ack: AckSender, message: &str, result: Result<T, String>) {
    let _ = match result {
        Ok(value) => ack.send(&JsonResponse::make_success(message, value)),
        Err(e) => ack.send(&JsonResponse::<()>::make_error(e)),
    };
}
