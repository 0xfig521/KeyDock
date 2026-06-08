use super::{bool_to_i64, log_audit, mask_value, now, validate_env_name, with_tx, AppStore};
use crate::{
    decrypt_secret, encrypt_secret, SecretField, SecretFieldInput, SecretFieldPurpose,
    SecretFieldType,
};
use anyhow::{anyhow, Result};
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl AppStore {
    pub fn list_secret_fields(&self, secret_id_or_name: &str) -> Result<Vec<SecretField>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT id, secret_id, label, field_type, encrypted_value, sensitive, env_name,
                    purpose, section, sort_order, enabled, expires_at, created_at, updated_at
             FROM secret_fields
             WHERE secret_id = ?1
             ORDER BY sort_order",
        )?;
        let mut fields = stmt
            .query_map([&secret.id], row_to_secret_field)?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        for field in &mut fields {
            if field.sensitive {
                if let Some(ref enc) = field.encrypted_value {
                    field.value_preview = Some(mask_value(
                        &decrypt_secret(&self.master_key, enc).unwrap_or_default(),
                    ));
                }
            } else {
                field.value_preview = field.encrypted_value.clone();
            }
        }
        Ok(fields)
    }

    pub fn create_secret_field(
        &self,
        secret_id_or_name: &str,
        input: SecretFieldInput,
    ) -> Result<SecretField> {
        if let Some(ref env_name) = input.env_name {
            validate_env_name(env_name)?;
        }
        let secret = self.resolve_secret(secret_id_or_name)?;
        let id = Uuid::new_v4().to_string();
        let now_ts = now();
        let encrypted_value = match (&input.value, input.sensitive) {
            (Some(val), true) => Some(encrypt_secret(&self.master_key, val)?),
            (Some(val), false) => Some(val.clone()),
            (None, _) => None,
        };
        let next_order = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM secret_fields WHERE secret_id = ?1",
                [&secret.id],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0);

        with_tx(&self.conn, |conn| {
            conn.execute(
                "INSERT INTO secret_fields (id, secret_id, label, field_type, encrypted_value,
                 sensitive, env_name, purpose, section, sort_order, enabled, expires_at,
                 created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
                params![
                    &id,
                    &secret.id,
                    &input.label,
                    field_type_to_db(&input.field_type),
                    &encrypted_value,
                    bool_to_i64(input.sensitive),
                    &input.env_name,
                    input.purpose.as_ref().map(purpose_to_db),
                    &input.section,
                    input.sort_order.unwrap_or(next_order),
                    bool_to_i64(input.enabled),
                    &input.expires_at,
                    &now_ts,
                ],
            )?;
            log_audit(
                conn,
                "create_field",
                Some(&id),
                None,
                input.env_name.as_deref(),
            )
        })?;
        self.get_secret_field(&id)?
            .ok_or_else(|| anyhow!("created secret field not found"))
    }

    pub fn get_secret_field(&self, id: &str) -> Result<Option<SecretField>> {
        let mut field = self
            .conn
            .query_row(
                "SELECT id, secret_id, label, field_type, encrypted_value, sensitive, env_name,
                         purpose, section, sort_order, enabled, expires_at, created_at, updated_at
                 FROM secret_fields WHERE id = ?1",
                [id],
                row_to_secret_field,
            )
            .optional()
            .map_err(|e| anyhow::anyhow!(e))?;
        if let Some(ref mut field) = field {
            if field.sensitive {
                if let Some(ref enc) = field.encrypted_value {
                    field.value_preview = Some(mask_value(
                        &decrypt_secret(&self.master_key, enc).unwrap_or_default(),
                    ));
                }
            } else {
                field.value_preview = field.encrypted_value.clone();
            }
        }
        Ok(field)
    }

    pub fn resolve_secret_field(&self, id: &str) -> Result<SecretField> {
        self.get_secret_field(id)?
            .ok_or_else(|| anyhow!("secret field not found: {id}"))
    }

    pub fn update_secret_field(&self, id: &str, input: SecretFieldInput) -> Result<SecretField> {
        if let Some(ref env_name) = input.env_name {
            validate_env_name(env_name)?;
        }
        let field = self.resolve_secret_field(id)?;
        let now_ts = now();
        let field_id = field.id.clone();
        with_tx(&self.conn, |conn| {
            match (&input.value, input.sensitive) {
                (Some(val), true) if !val.is_empty() => {
                    let encrypted = encrypt_secret(&self.master_key, val)?;
                    conn.execute(
                        "UPDATE secret_fields SET label = ?2, field_type = ?3, encrypted_value = ?4,
                         sensitive = ?5, env_name = ?6, purpose = ?7, section = ?8, sort_order = ?9,
                         enabled = ?10, expires_at = ?11, updated_at = ?12
                         WHERE id = ?1",
                        params![
                            &field_id,
                            &input.label,
                            field_type_to_db(&input.field_type),
                            &encrypted,
                            bool_to_i64(input.sensitive),
                            &input.env_name,
                            input.purpose.as_ref().map(purpose_to_db),
                            &input.section,
                            input.sort_order.unwrap_or(field.sort_order),
                            bool_to_i64(input.enabled),
                            &input.expires_at,
                            &now_ts,
                        ],
                    )?;
                }
                (Some(val), false) if !val.is_empty() => {
                    conn.execute(
                        "UPDATE secret_fields SET label = ?2, field_type = ?3, encrypted_value = ?4,
                         sensitive = ?5, env_name = ?6, purpose = ?7, section = ?8, sort_order = ?9,
                         enabled = ?10, expires_at = ?11, updated_at = ?12
                         WHERE id = ?1",
                        params![
                            &field_id,
                            &input.label,
                            field_type_to_db(&input.field_type),
                            val,
                            bool_to_i64(input.sensitive),
                            &input.env_name,
                            input.purpose.as_ref().map(purpose_to_db),
                            &input.section,
                            input.sort_order.unwrap_or(field.sort_order),
                            bool_to_i64(input.enabled),
                            &input.expires_at,
                            &now_ts,
                        ],
                    )?;
                }
                _ => {
                    conn.execute(
                        "UPDATE secret_fields SET label = ?2, field_type = ?3,
                         sensitive = ?4, env_name = ?5, purpose = ?6, section = ?7, sort_order = ?8,
                         enabled = ?9, expires_at = ?10, updated_at = ?11
                         WHERE id = ?1",
                        params![
                            &field_id,
                            &input.label,
                            field_type_to_db(&input.field_type),
                            bool_to_i64(input.sensitive),
                            &input.env_name,
                            input.purpose.as_ref().map(purpose_to_db),
                            &input.section,
                            input.sort_order.unwrap_or(field.sort_order),
                            bool_to_i64(input.enabled),
                            &input.expires_at,
                            &now_ts,
                        ],
                    )?;
                }
            }
            log_audit(
                conn,
                "edit_field",
                Some(&field_id),
                None,
                input.env_name.as_deref(),
            )
        })?;
        let updated = self
            .get_secret_field(&field.id)?
            .ok_or_else(|| anyhow!("secret field not found after update"))?;
        self.refresh_active_preset_env()?;
        Ok(updated)
    }

    pub fn delete_secret_field(&self, id: &str) -> Result<()> {
        let field = self.resolve_secret_field(id)?;
        let field_id = field.id.clone();
        let env_name = field.env_name.clone();
        with_tx(&self.conn, |conn| {
            conn.execute("DELETE FROM secret_fields WHERE id = ?1", [&field_id])?;
            log_audit(
                conn,
                "delete_field",
                Some(&field_id),
                None,
                env_name.as_deref(),
            )
        })?;
        self.refresh_active_preset_env()
    }

    pub fn reveal_secret_field(&self, id: &str) -> Result<String> {
        let field = self.resolve_secret_field(id)?;
        let encrypted = field
            .encrypted_value
            .ok_or_else(|| anyhow!("field has no value"))?;
        let value = decrypt_secret(&self.master_key, &encrypted)?;
        self.audit(
            "reveal_field",
            Some(&field.id),
            None,
            field.env_name.as_deref(),
        )?;
        Ok(value)
    }

    pub fn reorder_secret_fields(
        &self,
        secret_id_or_name: &str,
        field_ids: Vec<String>,
    ) -> Result<Vec<SecretField>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        with_tx(&self.conn, |conn| {
            let mut stmt = conn.prepare(
                "UPDATE secret_fields SET sort_order = ?1 WHERE id = ?2 AND secret_id = ?3",
            )?;
            for (i, field_id) in field_ids.iter().enumerate() {
                stmt.execute(params![i as i64, field_id, &secret.id])?;
            }
            Ok(())
        })?;
        self.list_secret_fields(&secret.id)
    }

    pub(crate) fn field_value(&self, field_id: &str) -> Result<String> {
        let encrypted: String = self.conn.query_row(
            "SELECT encrypted_value FROM secret_fields WHERE id = ?1",
            [field_id],
            |row| row.get(0),
        )?;
        decrypt_secret(&self.master_key, &encrypted)
    }
}

fn row_to_secret_field(row: &rusqlite::Row<'_>) -> rusqlite::Result<SecretField> {
    let field_type_str: String = row.get(3)?;
    let purpose_str: Option<String> = row.get(7)?;
    Ok(SecretField {
        id: row.get(0)?,
        secret_id: row.get(1)?,
        label: row.get(2)?,
        field_type: field_type_from_db(&field_type_str),
        encrypted_value: row.get(4)?,
        value_preview: None,
        sensitive: row.get::<_, i64>(5)? == 1,
        env_name: row.get(6)?,
        purpose: purpose_str.as_deref().map(purpose_from_db),
        section: row.get(8)?,
        sort_order: row.get(9)?,
        enabled: row.get::<_, i64>(10)? == 1,
        expires_at: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

fn field_type_to_db(ft: &SecretFieldType) -> &'static str {
    match ft {
        SecretFieldType::Secret => "secret",
        SecretFieldType::Text => "text",
        SecretFieldType::Url => "url",
        SecretFieldType::Email => "email",
        SecretFieldType::Number => "number",
        SecretFieldType::Json => "json",
        SecretFieldType::Env => "env",
        SecretFieldType::Note => "note",
        SecretFieldType::File => "file",
    }
}

fn field_type_from_db(s: &str) -> SecretFieldType {
    match s {
        "text" => SecretFieldType::Text,
        "url" => SecretFieldType::Url,
        "email" => SecretFieldType::Email,
        "number" => SecretFieldType::Number,
        "json" => SecretFieldType::Json,
        "env" => SecretFieldType::Env,
        "note" => SecretFieldType::Note,
        "file" => SecretFieldType::File,
        _ => SecretFieldType::Secret,
    }
}

fn purpose_to_db(p: &SecretFieldPurpose) -> &'static str {
    match p {
        SecretFieldPurpose::Credential => "credential",
        SecretFieldPurpose::Identifier => "identifier",
        SecretFieldPurpose::Endpoint => "endpoint",
        SecretFieldPurpose::Metadata => "metadata",
        SecretFieldPurpose::Note => "note",
    }
}

fn purpose_from_db(s: &str) -> SecretFieldPurpose {
    match s {
        "identifier" => SecretFieldPurpose::Identifier,
        "endpoint" => SecretFieldPurpose::Endpoint,
        "metadata" => SecretFieldPurpose::Metadata,
        "note" => SecretFieldPurpose::Note,
        _ => SecretFieldPurpose::Credential,
    }
}
