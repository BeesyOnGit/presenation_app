use rand::Rng;
use std::time::{SystemTime, UNIX_EPOCH};

const ALPHANUMERIC: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/// Room codes skip I and O so nobody confuses them with 1 and 0.
const ROOM_LETTERS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ";

fn pick(len: usize, charset: &[u8]) -> String {
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| charset[rng.gen_range(0..charset.len())] as char)
        .collect()
}

pub fn generate_rand_str(len: usize) -> String {
    pick(len, ALPHANUMERIC)
}

pub fn generate_room_code() -> String {
    pick(4, ROOM_LETTERS)
}

/// Unix time in milliseconds, the unit of every timestamp sent to clients.
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
