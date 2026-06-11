use super::shell::{current_active_preset, write_active_env};
use super::{log_audit, mask_value, now, validate_env_name, with_tx, AppStore};
use crate::{
    decrypt_secret, ActivePreset, Preset, PresetEntry, PresetEnv, PresetInclude, PresetInput,
    PresetPreview, PresetTemplate, PresetTemplateField,
};
use anyhow::{anyhow, Result};
use rusqlite::{params, OptionalExtension};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

impl AppStore {
    // ── Preset CRUD ─────────────────────────────────────────────────────

    pub fn create_preset(&self, input: PresetInput) -> Result<Preset> {
        let id = Uuid::new_v4().to_string();
        let now_ts = now();
        self.conn.execute(
            "INSERT INTO presets (id, name, description, tags_json, created_at, updated_at) VALUES (?1, ?2, ?3, '[]', ?4, ?4)",
            params![id, &input.name, &input.description, now_ts],
        )?;
        self.get_preset_by_id(&id)?
            .ok_or_else(|| anyhow!("created preset not found"))
    }

    pub fn list_presets(&self) -> Result<Vec<Preset>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, tags_json, created_at, updated_at FROM presets ORDER BY name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], row_to_preset)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn get_preset(&self, id_or_name: &str) -> Result<Option<Preset>> {
        self.conn
            .query_row(
                "SELECT id, name, description, tags_json, created_at, updated_at FROM presets WHERE id = ?1 OR name = ?1",
                [id_or_name],
                row_to_preset,
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn resolve_preset(&self, id_or_name: &str) -> Result<Preset> {
        self.get_preset(id_or_name)?
            .ok_or_else(|| anyhow!("preset not found: {id_or_name}"))
    }

    pub fn delete_preset(&self, id_or_name: &str) -> Result<()> {
        let preset = self.resolve_preset(id_or_name)?;
        // Explicit cleanup in case FK cascade is not active
        self.conn.execute(
            "DELETE FROM preset_includes WHERE preset_id = ?1 OR included_preset_id = ?1",
            [preset.id.as_str()],
        )?;
        with_tx(&self.conn, |conn| {
            conn.execute("DELETE FROM presets WHERE id = ?1", [&preset.id])?;
            log_audit(conn, "delete_preset", Some(&preset.id), None, None)
        })
    }

    // ── Preset Entry CRUD ───────────────────────────────────────────────

    pub fn add_preset_entry(
        &self,
        preset_id_or_name: &str,
        field_id_or_name: &str,
        env_name: Option<&str>,
    ) -> Result<PresetEntry> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let field = self.resolve_secret_field(field_id_or_name)?;
        let env_name = env_name
            .or(field.env_name.as_deref())
            .ok_or_else(|| anyhow!("field has no default env name; provide one explicitly"))?;
        validate_env_name(env_name)?;
        let now_ts = now();
        let preset_id = preset.id.clone();
        let field_secret_id = field.secret_id.clone();
        let field_id = field.id.clone();
        with_tx(&self.conn, |conn| {
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM preset_entries WHERE preset_id = ?1 AND env_name = ?2",
                    params![&preset_id, env_name],
                    |row| row.get(0),
                )
                .optional()?;
            if let Some(existing_id) = existing {
                conn.execute(
                    "UPDATE preset_entries
                     SET secret_id = ?1, field_id = ?2, enabled = 1, updated_at = ?3
                     WHERE id = ?4",
                    params![&field_secret_id, &field_id, &now_ts, &existing_id],
                )?;
            } else {
                let id = Uuid::new_v4().to_string();
                let sort_order: i64 = conn.query_row(
                    "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM preset_entries WHERE preset_id = ?1",
                    [&preset_id],
                    |row| row.get(0),
                )?;
                conn.execute(
                    "INSERT INTO preset_entries (id, preset_id, secret_id, field_id, env_name, sort_order, enabled, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)",
                    params![id, &preset_id, &field_secret_id, &field_id, env_name, sort_order, &now_ts],
                )?;
            }
            log_audit(
                conn,
                "map_preset_entry",
                Some(&field_id),
                Some(&preset_id),
                Some(env_name),
            )
        })?;
        let entry = self
            .fetch_preset_entry(&preset.id, env_name)?
            .ok_or_else(|| anyhow!("preset entry not found"))?;
        self.refresh_active_preset_env()?;
        Ok(entry)
    }

    pub fn list_preset_entries(&self, preset_id_or_name: &str) -> Result<Vec<PresetEntry>> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT pe.id, pe.preset_id, pe.secret_id, s.name, pe.field_id, f.label, pe.env_name,
             pe.sort_order, pe.enabled, pe.created_at, pe.updated_at
             FROM preset_entries pe
             JOIN secrets s ON s.id = pe.secret_id
             JOIN secret_fields f ON f.id = pe.field_id
             WHERE pe.preset_id = ?1
             ORDER BY pe.sort_order, pe.env_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([preset.id], row_to_preset_entry)?;
        let mut entries: Vec<PresetEntry> = rows.collect::<rusqlite::Result<Vec<_>>>()?;
        for entry in &mut entries {
            fill_entry_preview(self, entry);
        }
        Ok(entries)
    }

    pub fn remove_preset_entry(&self, preset_id_or_name: &str, env_name: &str) -> Result<()> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let preset_id = preset.id.clone();
        with_tx(&self.conn, |conn| {
            conn.execute(
                "DELETE FROM preset_entries WHERE preset_id = ?1 AND env_name = ?2",
                params![&preset_id, env_name],
            )?;
            log_audit(
                conn,
                "unmap_preset_entry",
                None,
                Some(&preset_id),
                Some(env_name),
            )
        })?;
        self.refresh_active_preset_env()
    }

    pub fn update_preset_entry_env_name(
        &self,
        preset_id_or_name: &str,
        old_env_name: &str,
        new_env_name: &str,
    ) -> Result<PresetEntry> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        validate_env_name(new_env_name)?;
        let now_ts = now();
        let preset_id = preset.id.clone();

        with_tx(&self.conn, |conn| {
            // Check if new env_name already exists in this preset
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM preset_entries WHERE preset_id = ?1 AND env_name = ?2 AND env_name != ?3",
                    params![&preset_id, new_env_name, old_env_name],
                    |row| row.get(0),
                )
                .optional()?;
            if let Some(_id) = existing {
                return Err(anyhow!(
                    "env name '{new_env_name}' already exists in this preset"
                ));
            }

            let affected = conn.execute(
                "UPDATE preset_entries SET env_name = ?1, updated_at = ?2 WHERE preset_id = ?3 AND env_name = ?4",
                params![new_env_name, &now_ts, &preset_id, old_env_name],
            )?;
            if affected == 0 {
                return Err(anyhow!("preset entry not found: {old_env_name}"));
            }
            log_audit(
                conn,
                "rename_preset_entry",
                None,
                Some(&preset_id),
                Some(new_env_name),
            )
        })?;

        let entry = self
            .fetch_preset_entry(&preset.id, new_env_name)?
            .ok_or_else(|| anyhow!("preset entry not found after rename"))?;
        self.refresh_active_preset_env()?;
        Ok(entry)
    }

    pub fn add_secret_default_fields_to_preset(
        &self,
        preset_id_or_name: &str,
        secret_id_or_name: &str,
    ) -> Result<Vec<PresetEntry>> {
        let secret = self.resolve_secret(secret_id_or_name)?;
        let mut stmt = self.conn.prepare(
            "SELECT id, env_name FROM secret_fields WHERE secret_id = ?1 AND enabled = 1 AND env_name IS NOT NULL",
        )?;
        let rows = stmt.query_map([&secret.id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        let fields = rows.collect::<rusqlite::Result<Vec<_>>>()?;
        let mut entries = Vec::new();
        for (field_id, env_name) in fields {
            entries.push(self.add_preset_entry(preset_id_or_name, &field_id, Some(&env_name))?);
        }
        Ok(entries)
    }

    // ── Env Resolution ──────────────────────────────────────────────────

    pub fn resolve_preset_env(&self, preset_id_or_name: &str) -> Result<Vec<PresetEnv>> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let mut visited = Vec::new();
        self.resolve_preset_env_inner(&preset.id, &mut visited)
    }

    pub fn export_preset_env(&self, preset_id_or_name: &str) -> Result<String> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let env = self.resolve_preset_env(&preset.id)?;
        log_audit(&self.conn, "export_env", None, Some(&preset.id), None)?;
        Ok(super::shell::format_env(env))
    }

    // ── Preview ─────────────────────────────────────────────────────────

    pub fn preview_preset(&self, preset_id_or_name: &str) -> Result<PresetPreview> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let env = self.resolve_preset_env(&preset.id)?;

        let env_names: Vec<String> = env.iter().map(|e| e.env_name.clone()).collect();
        let env_count = env_names.len();

        let includes = self.get_preset_includes_by_parent_id(&preset.id)?;
        let mut conflicts = Vec::new();
        let own_env = self.own_preset_env(&preset.id).unwrap_or_default();
        let own_names: HashSet<String> = own_env.iter().map(|e| e.env_name.clone()).collect();

        for include in &includes {
            if let Ok(inc_env) = self.resolve_preset_env(&include.included_preset_id) {
                for item in &inc_env {
                    if own_names.contains(&item.env_name) && !conflicts.contains(&item.env_name) {
                        conflicts.push(item.env_name.clone());
                    }
                }
            }
        }

        Ok(PresetPreview {
            name: preset.name,
            env_names,
            env_count,
            secret_values: false,
            conflicts,
        })
    }

    // ── Activation ──────────────────────────────────────────────────────

    pub fn activate_preset(&self, preset_id_or_name: &str) -> Result<ActivePreset> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let env = self.resolve_preset_env(&preset.id)?;
        write_active_env("preset", &preset.id, &preset.name, &env)?;
        log_audit(&self.conn, "activate_preset", None, Some(&preset.id), None)?;
        Ok(ActivePreset {
            id: preset.id,
            name: preset.name,
            source_type: "preset".into(),
            env_count: env.len(),
            env_names: env.iter().map(|item| item.env_name.clone()).collect(),
        })
    }

    // ── Templates ───────────────────────────────────────────────────────

    pub fn create_preset_from_template(
        &self,
        template: &PresetTemplate,
        name: &str,
    ) -> Result<Preset> {
        let description = if template.fields.is_empty() {
            format!(
                "Preset from template '{}': {}",
                template.name, template.description
            )
        } else {
            let fields_desc: Vec<String> = template
                .fields
                .iter()
                .map(|f| {
                    let req = if f.required { "" } else { "optional " };
                    let sens = if f.sensitive { ", sensitive" } else { "" };
                    format!(
                        "  {env} ({req}{sens}) - {desc}",
                        env = f.env_name,
                        req = req,
                        sens = sens,
                        desc = f.description
                    )
                })
                .collect();
            format!(
                "Preset from template '{}': {}\n\nFields:\n{}",
                template.name,
                template.description,
                fields_desc.join("\n")
            )
        };
        self.create_preset(PresetInput {
            name: name.into(),
            description: Some(description),
        })
    }

    // ── Preset Includes ─────────────────────────────────────────────────

    pub fn include_preset(
        &self,
        preset_id_or_name: &str,
        included_id_or_name: &str,
    ) -> Result<PresetInclude> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let included = self.resolve_preset(included_id_or_name)?;

        if preset.id == included.id {
            return Err(anyhow!("a preset cannot include itself"));
        }

        let id = Uuid::new_v4().to_string();
        let now_ts = now();

        let sort_order: i64 = self.conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM preset_includes WHERE preset_id = ?1",
            [preset.id.as_str()],
            |row| row.get(0),
        )?;

        with_tx(&self.conn, |conn| {
            conn.execute(
                "INSERT OR IGNORE INTO preset_includes (id, preset_id, included_preset_id, sort_order, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, preset.id, included.id, sort_order, now_ts],
            )?;
            log_audit(
                conn,
                "include_preset",
                Some(&included.id),
                Some(&preset.id),
                None,
            )
        })?;

        let include = self
            .get_preset_include_by_id(&id)?
            .ok_or_else(|| anyhow!("created preset include not found"))?;
        self.refresh_active_preset_env()?;
        Ok(include)
    }

    pub fn remove_include_preset(
        &self,
        preset_id_or_name: &str,
        included_id_or_name: &str,
    ) -> Result<()> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        let included = self.resolve_preset(included_id_or_name)?;

        with_tx(&self.conn, |conn| {
            conn.execute(
                "DELETE FROM preset_includes WHERE preset_id = ?1 AND included_preset_id = ?2",
                params![preset.id, included.id],
            )?;
            log_audit(
                conn,
                "remove_include_preset",
                Some(&included.id),
                Some(&preset.id),
                None,
            )
        })?;
        self.refresh_active_preset_env()
    }

    pub fn list_preset_includes(&self, preset_id_or_name: &str) -> Result<Vec<PresetInclude>> {
        let preset = self.resolve_preset(preset_id_or_name)?;
        self.get_preset_includes_by_parent_id(&preset.id)
    }

    // ── private helpers ─────────────────────────────────────────────────

    fn get_preset_by_id(&self, id: &str) -> Result<Option<Preset>> {
        self.conn
            .query_row(
                "SELECT id, name, description, tags_json, created_at, updated_at FROM presets WHERE id = ?1",
                [id],
                row_to_preset,
            )
            .optional()
            .map_err(Into::into)
    }

    fn fetch_preset_entry(&self, preset_id: &str, env_name: &str) -> Result<Option<PresetEntry>> {
        let mut entry = self
            .conn
            .query_row(
                "SELECT pe.id, pe.preset_id, pe.secret_id, s.name, pe.field_id, f.label, pe.env_name,
                 pe.sort_order, pe.enabled, pe.created_at, pe.updated_at
                 FROM preset_entries pe
                 JOIN secrets s ON s.id = pe.secret_id
                 JOIN secret_fields f ON f.id = pe.field_id
                 WHERE pe.preset_id = ?1 AND pe.env_name = ?2",
                params![preset_id, env_name],
                row_to_preset_entry,
            )
            .optional()?;
        if let Some(ref mut e) = entry {
            fill_entry_preview(self, e);
        }
        Ok(entry)
    }

    /// Resolve only the current preset's own env (no includes).
    fn own_preset_env(&self, preset_id: &str) -> Result<Vec<PresetEnv>> {
        let mut stmt = self.conn.prepare(
            "SELECT pe.env_name, pe.secret_id, pe.field_id, f.encrypted_value
             FROM preset_entries pe
             JOIN secret_fields f ON f.id = pe.field_id
             WHERE pe.preset_id = ?1 AND pe.enabled = 1
             ORDER BY pe.sort_order, pe.env_name COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([preset_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })?;
        let mut env = Vec::with_capacity(rows.size_hint().0);
        for row in rows {
            let (env_name, secret_id, _field_id, encrypted_value) = row?;
            env.push(PresetEnv {
                env_name,
                value: decrypt_secret(&self.master_key, &encrypted_value)?,
                secret_id,
            });
        }
        Ok(env)
    }

    /// Recursively resolve env vars for a preset.
    /// Uses a `visited` set to detect and break cycles.
    fn resolve_preset_env_inner(
        &self,
        preset_id: &str,
        visited: &mut Vec<String>,
    ) -> Result<Vec<PresetEnv>> {
        if visited.iter().any(|v| v == preset_id) {
            return Ok(Vec::new());
        }
        visited.push(preset_id.to_string());

        let includes = self.get_preset_includes_by_parent_id(preset_id)?;

        let mut env_map: HashMap<String, PresetEnv> = HashMap::new();

        for include in &includes {
            let included_env =
                self.resolve_preset_env_inner(&include.included_preset_id, visited)?;
            for item in included_env {
                env_map.insert(item.env_name.clone(), item);
            }
        }

        let own_env = self.own_preset_env(preset_id)?;
        for item in own_env {
            env_map.insert(item.env_name.clone(), item);
        }

        Ok(env_map.into_values().collect())
    }

    fn get_preset_include_by_id(&self, id: &str) -> Result<Option<PresetInclude>> {
        self.conn
            .query_row(
                "SELECT pi.id, pi.preset_id, pi.included_preset_id, p.name, pi.sort_order, pi.created_at
                 FROM preset_includes pi
                 JOIN presets p ON p.id = pi.included_preset_id
                 WHERE pi.id = ?1",
                [id],
                row_to_preset_include,
            )
            .optional()
            .map_err(Into::into)
    }

    fn get_preset_includes_by_parent_id(&self, parent_id: &str) -> Result<Vec<PresetInclude>> {
        let mut stmt = self.conn.prepare(
            "SELECT pi.id, pi.preset_id, pi.included_preset_id, p.name, pi.sort_order, pi.created_at
             FROM preset_includes pi
             JOIN presets p ON p.id = pi.included_preset_id
             WHERE pi.preset_id = ?1
             ORDER BY pi.sort_order",
        )?;
        let rows = stmt.query_map([parent_id], row_to_preset_include)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub(crate) fn refresh_active_preset_env(&self) -> Result<()> {
        let Some(active) = current_active_preset()? else {
            return Ok(());
        };
        if active.source_type != "preset" {
            return Ok(());
        }
        let Some(preset) = self.get_preset(&active.id)? else {
            return Ok(());
        };
        let env = self.resolve_preset_env(&preset.id)?;
        write_active_env("preset", &preset.id, &preset.name, &env)
    }
}

// ── row mappers ────────────────────────────────────────────────────────

fn row_to_preset(row: &rusqlite::Row<'_>) -> rusqlite::Result<Preset> {
    let tags_json: String = row.get(3)?;
    Ok(Preset {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn row_to_preset_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<PresetEntry> {
    Ok(PresetEntry {
        id: row.get(0)?,
        preset_id: row.get(1)?,
        secret_id: row.get(2)?,
        secret_name: row.get(3)?,
        field_id: row.get(4)?,
        field_label: row.get(5)?,
        env_name: row.get(6)?,
        preview: None,
        sort_order: row.get(7)?,
        enabled: row.get::<_, i64>(8)? == 1,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

fn row_to_preset_include(row: &rusqlite::Row<'_>) -> rusqlite::Result<PresetInclude> {
    Ok(PresetInclude {
        id: row.get(0)?,
        preset_id: row.get(1)?,
        included_preset_id: row.get(2)?,
        included_preset_name: row.get::<_, Option<String>>(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
    })
}

fn fill_entry_preview(store: &AppStore, entry: &mut PresetEntry) {
    if let Ok(value) = store.field_value(&entry.field_id) {
        entry.preview = Some(mask_value(&value));
    }
}

// ── Built-in preset templates ─────────────────────────────────────────

pub fn list_preset_templates() -> Vec<PresetTemplate> {
    vec![
        PresetTemplate {
            name: "OpenAI".into(),
            description: "OpenAI API credentials for GPT models and embeddings".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "OPENAI_API_KEY".into(),
                    sensitive: true,
                    required: true,
                    description: "OpenAI API key (sk-...)".into(),
                },
                PresetTemplateField {
                    env_name: "OPENAI_BASE_URL".into(),
                    sensitive: false,
                    required: false,
                    description: "Custom API base URL (e.g., proxy endpoint)".into(),
                },
                PresetTemplateField {
                    env_name: "OPENAI_MODEL".into(),
                    sensitive: false,
                    required: false,
                    description: "Default model name (e.g., gpt-4o)".into(),
                },
            ],
        },
        PresetTemplate {
            name: "Anthropic".into(),
            description: "Anthropic API credentials for Claude models".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "ANTHROPIC_API_KEY".into(),
                    sensitive: true,
                    required: true,
                    description: "Anthropic API key (sk-ant-...)".into(),
                },
                PresetTemplateField {
                    env_name: "ANTHROPIC_BASE_URL".into(),
                    sensitive: false,
                    required: false,
                    description: "Custom API base URL".into(),
                },
            ],
        },
        PresetTemplate {
            name: "OpenRouter".into(),
            description: "OpenRouter API key for multi-model access".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "OPENROUTER_API_KEY".into(),
                    sensitive: true,
                    required: true,
                    description: "OpenRouter API key".into(),
                },
                PresetTemplateField {
                    env_name: "OPENROUTER_BASE_URL".into(),
                    sensitive: false,
                    required: false,
                    description: "Custom API base URL".into(),
                },
            ],
        },
        PresetTemplate {
            name: "GitHub".into(),
            description: "GitHub personal access token for API and CLI access".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "GITHUB_TOKEN".into(),
                    sensitive: true,
                    required: true,
                    description: "GitHub personal access token".into(),
                },
                PresetTemplateField {
                    env_name: "GITHUB_USERNAME".into(),
                    sensitive: false,
                    required: false,
                    description: "GitHub username for authentication".into(),
                },
            ],
        },
        PresetTemplate {
            name: "Cloudflare".into(),
            description: "Cloudflare API credentials for account and zone management".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "CLOUDFLARE_ACCOUNT_ID".into(),
                    sensitive: false,
                    required: true,
                    description: "Cloudflare account ID".into(),
                },
                PresetTemplateField {
                    env_name: "CLOUDFLARE_API_TOKEN".into(),
                    sensitive: true,
                    required: true,
                    description: "Cloudflare API token".into(),
                },
                PresetTemplateField {
                    env_name: "CLOUDFLARE_ZONE_ID".into(),
                    sensitive: false,
                    required: false,
                    description: "Cloudflare zone ID".into(),
                },
            ],
        },
        PresetTemplate {
            name: "Vercel".into(),
            description: "Vercel deployment and project management tokens".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "VERCEL_TOKEN".into(),
                    sensitive: true,
                    required: true,
                    description: "Vercel API token".into(),
                },
                PresetTemplateField {
                    env_name: "VERCEL_ORG_ID".into(),
                    sensitive: false,
                    required: false,
                    description: "Vercel team/organization ID".into(),
                },
                PresetTemplateField {
                    env_name: "VERCEL_PROJECT_ID".into(),
                    sensitive: false,
                    required: false,
                    description: "Vercel project ID".into(),
                },
            ],
        },
        PresetTemplate {
            name: "Supabase".into(),
            description: "Supabase project credentials for database and auth".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "SUPABASE_URL".into(),
                    sensitive: false,
                    required: true,
                    description: "Supabase project URL".into(),
                },
                PresetTemplateField {
                    env_name: "SUPABASE_ANON_KEY".into(),
                    sensitive: true,
                    required: true,
                    description: "Supabase anon/public key".into(),
                },
                PresetTemplateField {
                    env_name: "SUPABASE_SERVICE_ROLE_KEY".into(),
                    sensitive: true,
                    required: false,
                    description: "Supabase service role key (admin)".into(),
                },
            ],
        },
        PresetTemplate {
            name: "Stripe".into(),
            description: "Stripe API keys for payment processing".into(),
            fields: vec![
                PresetTemplateField {
                    env_name: "STRIPE_SECRET_KEY".into(),
                    sensitive: true,
                    required: true,
                    description: "Stripe secret key (sk_live_...)".into(),
                },
                PresetTemplateField {
                    env_name: "STRIPE_PUBLISHABLE_KEY".into(),
                    sensitive: false,
                    required: false,
                    description: "Stripe publishable key (pk_live_...)".into(),
                },
                PresetTemplateField {
                    env_name: "STRIPE_WEBHOOK_SECRET".into(),
                    sensitive: true,
                    required: false,
                    description: "Stripe webhook signing secret".into(),
                },
            ],
        },
    ]
}
