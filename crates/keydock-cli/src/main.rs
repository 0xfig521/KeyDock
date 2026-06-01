use anyhow::{anyhow, Context, Result};
use arboard::Clipboard;
use clap::{Args, Parser, Subcommand};
use keydock_core::{
    default_database_path, format_env, initialize_vault, vault_status, ApiKeyInput, AppStore,
    SecretCategory, SecretInput, WorkspaceEnv,
};
use std::{process::Command, thread, time::Duration};

#[derive(Parser)]
#[command(name = "keydock")]
#[command(about = "Local-first API key and workspace manager for developer workflows")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Vault {
        #[command(subcommand)]
        command: VaultCommand,
    },
    Secret {
        #[command(subcommand)]
        command: SecretCommand,
    },
    ApiKey {
        #[command(subcommand)]
        command: ApiKeyCommand,
    },
    Workspace {
        #[command(subcommand)]
        command: WorkspaceCommand,
    },
    Run(RunArgs),
    Copy {
        api_key: String,
        #[arg(long)]
        env: Option<String>,
        #[arg(long, default_value_t = 30)]
        clear_after: u64,
    },
    Export {
        #[command(subcommand)]
        command: ExportCommand,
    },
    Audit {
        #[arg(long, default_value_t = 50)]
        limit: u32,
    },
}

#[derive(Subcommand)]
enum VaultCommand {
    Status,
    Init {
        #[arg(long)]
        password: String,
    },
}

#[derive(Subcommand)]
enum SecretCommand {
    Create(SecretCreate),
    List,
    Show { id_or_name: String },
    Delete { id_or_name: String },
}

#[derive(Args)]
struct SecretCreate {
    name: String,
    #[arg(long = "category", default_value = "ai")]
    category: String,
    #[arg(long = "base-url")]
    base_url: Option<String>,
    #[arg(long = "model")]
    model_name: Option<String>,
    #[arg(long)]
    tag: Vec<String>,
    #[arg(long)]
    description: Option<String>,
    #[arg(long = "dashboard-url")]
    dashboard_url: Option<String>,
    #[arg(long = "docs-url")]
    docs_url: Option<String>,
    #[arg(long = "login-url")]
    login_url: Option<String>,
    #[arg(long)]
    notes: Option<String>,
}

#[derive(Subcommand)]
enum ApiKeyCommand {
    Add(ApiKeyAdd),
    List { secret: Option<String> },
    Get { api_key: String },
    Delete { api_key: String },
}

#[derive(Args)]
struct ApiKeyAdd {
    secret: String,
    name: String,
    #[arg(long)]
    value: String,
    #[arg(long)]
    env: Option<String>,
    #[arg(long = "include-by-default", default_value_t = true)]
    include_by_default: bool,
    #[arg(long)]
    tag: Vec<String>,
    #[arg(long)]
    description: Option<String>,
}

#[derive(Subcommand)]
enum WorkspaceCommand {
    Create {
        name: String,
        #[arg(long)]
        description: Option<String>,
    },
    List,
    Add {
        workspace: String,
        api_key: String,
        #[arg(long)]
        env: Option<String>,
    },
    AddSecret {
        workspace: String,
        secret: String,
    },
    Show {
        workspace: String,
    },
    Delete {
        workspace: String,
    },
    Unset {
        workspace: String,
        env_name: String,
    },
}

#[derive(Args)]
struct RunArgs {
    #[arg(short = 'w', long)]
    workspace: Option<String>,
    #[arg(long)]
    secret: Option<String>,
    #[arg(long = "api-key")]
    api_key: Option<String>,
    #[arg(long)]
    env: Option<String>,
    #[arg(last = true, required = true)]
    command: Vec<String>,
}

#[derive(Subcommand)]
enum ExportCommand {
    Workspace {
        workspace: String,
    },
    Secret {
        secret: String,
    },
    ApiKey {
        api_key: String,
        #[arg(long)]
        env: Option<String>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Vault { command } => vault_command(command),
        Commands::Secret { command } => secret_command(&open_store()?, command),
        Commands::ApiKey { command } => api_key_command(&open_store()?, command),
        Commands::Workspace { command } => workspace_command(&open_store()?, command),
        Commands::Run(args) => run_command(&open_store()?, args),
        Commands::Copy {
            api_key,
            env,
            clear_after,
        } => copy_command(&open_store()?, &api_key, env.as_deref(), clear_after),
        Commands::Export { command } => export_command(&open_store()?, command),
        Commands::Audit { limit } => {
            for log in open_store()?.list_audit_logs(limit)? {
                println!(
                    "{} {} target={} workspace={} env={}",
                    log.created_at,
                    log.action,
                    log.target_id.unwrap_or_else(|| "-".into()),
                    log.workspace_id.unwrap_or_else(|| "-".into()),
                    log.env_name.unwrap_or_else(|| "-".into())
                );
            }
            Ok(())
        }
    }
}

fn open_store() -> Result<AppStore> {
    AppStore::open_default()
}

fn vault_command(command: VaultCommand) -> Result<()> {
    let path = default_database_path()?;
    match command {
        VaultCommand::Status => {
            let status = vault_status(&path)?;
            println!(
                "{}",
                if status.initialized {
                    "initialized"
                } else {
                    "not initialized"
                }
            );
        }
        VaultCommand::Init { password } => {
            initialize_vault(&path, &password)?;
            println!("vault initialized");
        }
    }
    Ok(())
}

fn secret_command(store: &AppStore, command: SecretCommand) -> Result<()> {
    match command {
        SecretCommand::Create(args) => {
            let secret = store.create_secret(SecretInput {
                name: args.name,
                category: parse_secret_category(&args.category),
                base_url: args.base_url,
                model_name: args.model_name,
                tags: args.tag,
                description: args.description,
                dashboard_url: args.dashboard_url,
                docs_url: args.docs_url,
                login_url: args.login_url,
                notes: args.notes,
            })?;
            println!("created secret {} ({})", secret.name, secret.id);
        }
        SecretCommand::List => {
            for secret in store.list_secrets(None, None)? {
                println!(
                    "{}\t{}\t{:?}\t{}\t{}",
                    secret.id,
                    secret.name,
                    secret.category,
                    secret.base_url.unwrap_or_default(),
                    secret.model_name.unwrap_or_default()
                );
            }
        }
        SecretCommand::Show { id_or_name } => {
            let secret = store.resolve_secret(&id_or_name)?;
            println!("{} ({})", secret.name, secret.id);
            if let Some(base_url) = secret.base_url {
                println!("base_url={base_url}");
            }
            if let Some(model_name) = secret.model_name {
                println!("model={model_name}");
            }
            for api_key in store.list_api_keys(Some(&secret.id))? {
                println!(
                    "  {}\t{}\t{}",
                    api_key.name,
                    api_key.env_name.unwrap_or_else(|| "-".into()),
                    if api_key.include_by_default {
                        "default"
                    } else {
                        "-"
                    }
                );
            }
        }
        SecretCommand::Delete { id_or_name } => {
            store.delete_secret(&id_or_name)?;
            println!("deleted secret {id_or_name}");
        }
    }
    Ok(())
}

fn api_key_command(store: &AppStore, command: ApiKeyCommand) -> Result<()> {
    match command {
        ApiKeyCommand::Add(args) => {
            let api_key = store.create_api_key(
                &args.secret,
                ApiKeyInput {
                    name: args.name.clone(),
                    value: args.value,
                    env_name: args.env,
                    include_by_default: args.include_by_default,
                    tags: args.tag,
                    description: args.description,
                },
            )?;
            println!(
                "created api key {}/{} ({})",
                api_key.secret_name.unwrap_or(api_key.secret_id),
                api_key.name,
                api_key.id
            );
        }
        ApiKeyCommand::List { secret } => {
            for api_key in store.list_api_keys(secret.as_deref())? {
                println!(
                    "{}\t{}/{}\t{}",
                    api_key.id,
                    api_key.secret_name.unwrap_or(api_key.secret_id),
                    api_key.name,
                    api_key.env_name.unwrap_or_default()
                );
            }
        }
        ApiKeyCommand::Get { api_key } => {
            println!("{}", store.reveal_api_key(&api_key, None)?);
        }
        ApiKeyCommand::Delete { api_key } => {
            store.delete_api_key(&api_key)?;
            println!("deleted api key {api_key}");
        }
    }
    Ok(())
}

fn workspace_command(store: &AppStore, command: WorkspaceCommand) -> Result<()> {
    match command {
        WorkspaceCommand::Create { name, description } => {
            let workspace = store.create_workspace(&name, description.as_deref())?;
            println!("created workspace {} ({})", workspace.name, workspace.id);
        }
        WorkspaceCommand::List => {
            for workspace in store.list_workspaces()? {
                println!("{}\t{}", workspace.id, workspace.name);
            }
        }
        WorkspaceCommand::Add {
            workspace,
            api_key,
            env,
        } => {
            let variable = store.set_workspace_variable(&workspace, env.as_deref(), &api_key)?;
            println!(
                "mapped {} -> {}/{}",
                variable.env_name,
                variable.secret_name.unwrap_or(variable.secret_id),
                variable.api_key_name.unwrap_or(variable.api_key_id)
            );
        }
        WorkspaceCommand::AddSecret { workspace, secret } => {
            let variables = store.add_secret_default_api_keys_to_workspace(&workspace, &secret)?;
            println!("mapped {} default api keys", variables.len());
        }
        WorkspaceCommand::Show { workspace } => {
            let workspace_model = store.resolve_workspace(&workspace)?;
            println!(
                "workspace: {} ({})",
                workspace_model.name, workspace_model.id
            );
            for variable in store.list_workspace_variables(&workspace)? {
                println!(
                    "{}={}/{}",
                    variable.env_name,
                    variable.secret_name.unwrap_or(variable.secret_id),
                    variable.api_key_name.unwrap_or(variable.api_key_id)
                );
            }
        }
        WorkspaceCommand::Delete { workspace } => {
            store.delete_workspace(&workspace)?;
            println!("deleted workspace {workspace}");
        }
        WorkspaceCommand::Unset {
            workspace,
            env_name,
        } => {
            store.delete_workspace_variable(&workspace, &env_name)?;
            println!("removed {env_name} from {workspace}");
        }
    }
    Ok(())
}

fn export_command(store: &AppStore, command: ExportCommand) -> Result<()> {
    match command {
        ExportCommand::Workspace { workspace } => {
            println!("{}", store.export_env_text(&workspace)?)
        }
        ExportCommand::Secret { secret } => println!("{}", format_env(store.secret_env(&secret)?)),
        ExportCommand::ApiKey { api_key, env } => {
            println!(
                "{}",
                format_env(vec![store.api_key_env(&api_key, env.as_deref())?])
            )
        }
    }
    Ok(())
}

fn run_command(store: &AppStore, args: RunArgs) -> Result<()> {
    let env = selected_env(store, &args)?;
    let (program, command_args) = args
        .command
        .split_first()
        .ok_or_else(|| anyhow!("missing command to run"))?;
    let mut child = Command::new(program);
    child.args(command_args);
    for item in env {
        child.env(item.env_name, item.value);
    }
    let status = child.status().with_context(|| format!("run {program}"))?;
    std::process::exit(status.code().unwrap_or(1));
}

fn copy_command(
    store: &AppStore,
    api_key: &str,
    env_name: Option<&str>,
    clear_after: u64,
) -> Result<()> {
    let item = store.api_key_env(api_key, env_name)?;
    let mut clipboard = Clipboard::new().context("open clipboard")?;
    clipboard
        .set_text(item.value.clone())
        .context("copy api key")?;
    store.audit(
        "copy",
        Some(&item.api_key_id),
        None,
        Some(item.env_name.as_str()),
    )?;
    println!(
        "copied {}; waiting {}s to clear clipboard if unchanged",
        item.env_name, clear_after
    );
    if clear_after > 0 {
        let copied = item.value;
        thread::sleep(Duration::from_secs(clear_after));
        if clipboard.get_text().ok().as_deref() == Some(copied.as_str()) {
            clipboard
                .set_text("")
                .context("clear clipboard after copy timeout")?;
        }
    }
    Ok(())
}

fn selected_env(store: &AppStore, args: &RunArgs) -> Result<Vec<WorkspaceEnv>> {
    let selectors = [
        args.workspace.is_some(),
        args.secret.is_some(),
        args.api_key.is_some(),
    ]
    .into_iter()
    .filter(|selected| *selected)
    .count();
    if selectors != 1 {
        return Err(anyhow!(
            "choose exactly one of --workspace, --secret, or --api-key"
        ));
    }
    if let Some(workspace) = &args.workspace {
        store.workspace_env(workspace)
    } else if let Some(secret) = &args.secret {
        store.secret_env(secret)
    } else if let Some(api_key) = &args.api_key {
        Ok(vec![store.api_key_env(api_key, args.env.as_deref())?])
    } else {
        unreachable!()
    }
}

fn parse_secret_category(value: &str) -> SecretCategory {
    match value {
        "cloud" => SecretCategory::Cloud,
        "search" => SecretCategory::Search,
        "database" => SecretCategory::Database,
        "dev-tool" | "dev_tool" => SecretCategory::DevTool,
        "payment" => SecretCategory::Payment,
        "custom" => SecretCategory::Custom,
        _ => SecretCategory::AI,
    }
}
