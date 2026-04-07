pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

declare_id!("9oiti6VtiPXPbhSSvFHgZZDomp7SzD8Jd3JvEbcZXW4y");

#[program]
pub mod magicblock_tutorial {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
        create_game::handler(ctx)
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        join_game::handler(ctx)
    }
    
    pub fn make_choice(ctx: Context<MakeChoice>) -> Result<()> {
        make_choice::handler(ctx)
    }
    
    pub fn reveal_winner(ctx: Context<RevealWinner>) -> Result<()> {
        reveal_winner::handler(ctx)
    }
}
