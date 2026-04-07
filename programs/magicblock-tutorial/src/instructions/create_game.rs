use anchor_lang::prelude::*;

use crate::{
    constants::{GAME_SEED, PLAYER_CHOICE_SEED},
    state::{Game, GameResult, PlayerChoice},
};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer = player,
        space = 8 + Game::INIT_SPACE,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerChoice::INIT_SPACE,
        seeds = [PLAYER_CHOICE_SEED, &player.key().to_bytes(), &game_id.to_le_bytes()],
        bump,
    )]
    pub player_choice: Account<'info, PlayerChoice>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGame>, game_id: u64) -> Result<()> {
    let player_key = ctx.accounts.player.key();

    ctx.accounts.game.set_inner(Game {
        game_id,
        player1: player_key,
        player2: None,
        result: GameResult::None,
    });

    ctx.accounts.player_choice.set_inner(PlayerChoice {
        game_id,
        player: player_key,
        choice: None,
    });

    Ok(())
}
