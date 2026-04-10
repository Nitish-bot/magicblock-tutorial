use anchor_lang::prelude::*;

use crate::{
    constants::{GAME_SEED, PLAYER_CHOICE_SEED},
    error::GameError,
    state::{Game, GameState, PlayerChoice},
};

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game.game_id.to_le_bytes()],
        bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerChoice::INIT_SPACE,
        seeds = [PLAYER_CHOICE_SEED, &player.key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
    )]
    pub player_choice: Account<'info, PlayerChoice>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player_key = ctx.accounts.player.key();

    require!(game.player1.key() != player_key, GameError::JoinOwnGame);
    require!(game.player2.is_none(), GameError::JoinFullGame);

    game.state = GameState::AwaitingFirstChoice;
    game.player2 = Some(player_key);

    ctx.accounts.player_choice.set_inner(PlayerChoice {
        game_id: game.game_id,
        player: player_key,
        choice: None,
    });

    Ok(())
}
