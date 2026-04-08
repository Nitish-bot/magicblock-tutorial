#![allow(clippy::diverging_sub_expression)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;
use ephemeral_rollups_sdk::access_control::structs::Member;

pub use instructions::*;
pub use state::Choice;
pub use utils::AccountType;

declare_id!("Bv4p1TKzfmuUzZDmVCe2KzmY65ShCj7xbZn2Uc8qSxQv");

#[ephemeral]
#[program]
pub mod magicblock_tutorial {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, game_id: u64) -> Result<()> {
        create_game::handler(ctx, game_id)
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        join_game::handler(ctx)
    }

    pub fn make_choice(ctx: Context<MakeChoice>, _game_id: u64, choice: Choice) -> Result<()> {
        make_choice::handler(ctx, choice)
    }

    pub fn reveal_winner(ctx: Context<RevealWinner>) -> Result<()> {
        reveal_winner::handler(ctx)
    }

    pub fn create_permission(ctx: Context<CreatePermission>, account_type: AccountType, members: Option<Vec<Member>>) -> Result<()> {
        create_permission::handler(ctx, account_type, members)
    }
    
    pub fn delegate_pda(ctx: Context<DelegatePda>, account_type: AccountType) -> Result<()> {
        delegate_pda::handler(ctx, account_type)
    }
}
