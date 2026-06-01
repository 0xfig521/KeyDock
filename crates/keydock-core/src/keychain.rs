use anyhow::{Context, Result};
use base64::prelude::*;
use keyring::Entry;
use rand::{rngs::OsRng, RngCore};

const SERVICE: &str = "dev.keydock";
const ACCOUNT: &str = "master-key";

pub fn load_or_create_master_key() -> Result<Vec<u8>> {
    let entry = Entry::new(SERVICE, ACCOUNT).context("open OS keychain entry")?;

    match entry.get_password() {
        Ok(encoded) => BASE64_STANDARD
            .decode(encoded)
            .context("decode master key from OS keychain"),
        Err(_) => {
            let mut key = vec![0_u8; 32];
            OsRng.fill_bytes(&mut key);
            entry
                .set_password(&BASE64_STANDARD.encode(&key))
                .context("store master key in OS keychain")?;
            Ok(key)
        }
    }
}
