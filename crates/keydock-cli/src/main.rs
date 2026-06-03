use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand, ValueEnum};
use keydock_core::{current_active_workspace, deactivate_workspace, shell_hook, AppStore};
use std::process::Command;

#[derive(Parser)]
#[command(name = "keydock")]
#[command(about = "Activate KeyDock workspace environments")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Persist a workspace's mapped env vars to KeyDock's active plaintext env cache.
    Activate { workspace: String },
    /// Remove the active plaintext env cache.
    Deactivate,
    /// Show the active workspace.
    Current,
    /// Print shell hook code. Used by .zshrc/.bashrc.
    Hook {
        #[arg(value_enum)]
        shell: Shell,
    },
    /// List all workspaces.
    List,
    /// Open the KeyDock desktop app.
    Open,
    /// Run a command with a workspace's env vars injected.
    Run {
        workspace: String,
        #[arg(trailing_var_arg = true, required = true)]
        command: Vec<String>,
    },
}

#[derive(Clone, ValueEnum)]
enum Shell {
    Zsh,
    Bash,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Activate { workspace } => activate(&workspace),
        Commands::Deactivate => deactivate(),
        Commands::Current => current(),
        Commands::Hook { shell } => {
            println!("{}", shell_hook(shell.as_str())?);
            Ok(())
        }
        Commands::List => list(),
        Commands::Open => open_app(),
        Commands::Run { workspace, command } => run(&workspace, &command),
    }
}

impl Shell {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Zsh => "zsh",
            Self::Bash => "bash",
        }
    }
}

fn open_store() -> Result<AppStore> {
    AppStore::open_default()
}

fn activate(workspace: &str) -> Result<()> {
    let active = open_store()?.activate_workspace(workspace)?;
    println!(
        "Activated \"{}\" ({} env var{}):",
        active.name,
        active.env_count,
        if active.env_count == 1 { "" } else { "s" }
    );
    for name in &active.env_names {
        println!("  • {name}");
    }
    println!("New shells will load these env vars via the KeyDock hook.");
    Ok(())
}

fn deactivate() -> Result<()> {
    let active = current_active_workspace()?;
    deactivate_workspace()?;
    match active {
        Some(prev) => {
            println!(
                "Deactivated \"{}\" ({} env var{}):",
                prev.name,
                prev.env_count,
                if prev.env_count == 1 { "" } else { "s" }
            );
            for name in &prev.env_names {
                println!("  • {name}");
            }
        }
        None => println!("No active KeyDock workspace to deactivate"),
    }
    Ok(())
}

fn current() -> Result<()> {
    match current_active_workspace()? {
        Some(active) => {
            println!(
                "Active workspace: \"{}\" ({} env var{}):",
                active.name,
                active.env_count,
                if active.env_count == 1 { "" } else { "s" }
            );
            for name in &active.env_names {
                println!("  • {name}");
            }
        }
        None => println!("No active KeyDock workspace"),
    }
    Ok(())
}

fn list() -> Result<()> {
    let store = open_store()?;
    let workspaces = store.list_workspaces()?;
    if workspaces.is_empty() {
        println!("No workspaces found");
        return Ok(());
    }
    let mut first = true;
    for ws in &workspaces {
        if first {
            first = false;
        } else {
            println!();
        }
        let vars = store.list_workspace_variables(&ws.name)?;
        println!(
            "{} ({} env var{}):",
            ws.name,
            vars.len(),
            if vars.len() == 1 { "" } else { "s" }
        );
        if vars.is_empty() {
            println!("  (no env vars mapped)");
        } else {
            for v in &vars {
                println!("  • {}", v.env_name);
            }
        }
    }
    Ok(())
}

fn run(workspace: &str, command: &[String]) -> Result<()> {
    if command.is_empty() {
        return Err(anyhow!("no command provided"));
    }
    let store = open_store()?;
    let env = store.workspace_env(workspace)?;
    eprintln!(
        "[keydock] running with workspace \"{workspace}\" ({count} env var{plural})",
        count = env.len(),
        plural = if env.len() == 1 { "" } else { "s" }
    );
    let mut cmd = Command::new(&command[0]);
    if command.len() > 1 {
        cmd.args(&command[1..]);
    }
    for e in &env {
        cmd.env(&e.env_name, &e.value);
    }
    let status = cmd.status()?;
    if !status.success() {
        std::process::exit(status.code().unwrap_or(1));
    }
    Ok(())
}

fn open_app() -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .args(["-a", "KeyDock"])
            .status()
            .context("open KeyDock.app")?;
        if status.success() {
            return Ok(());
        }
    }
    Err(anyhow!("unable to open KeyDock app"))
}
