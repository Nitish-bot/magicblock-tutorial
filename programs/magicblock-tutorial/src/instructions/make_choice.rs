use anchor_lang::prelude::*;

use crate::{
    constants::{GAME_SEED, PLAYER_CHOICE_SEED},
    error::GameError,
    state::{Choice, Game, GameState, PlayerChoice},
};

#[derive(Accounts)]
pub struct MakeChoice<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game.game_id.to_le_bytes()],
        bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [PLAYER_CHOICE_SEED, &player.key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
    )]
    pub player_choice: Account<'info, PlayerChoice>,
}

pub fn handler(ctx: Context<MakeChoice>, choice: Choice) -> Result<()> {
    let player_choice = &mut ctx.accounts.player_choice;
    let game = &mut ctx.accounts.game;

    require!(player_choice.choice.is_none(), GameError::ChooseTwice);

    match game.state {
        GameState::AwaitingFirstChoice => game.state = GameState::AwaitingSecondChoice,
        GameState::AwaitingSecondChoice => game.state = GameState::GameFinished,
        _ => return err!(GameError::ChooseTooEarly),
    }

    player_choice.choice = Some(choice);

    Ok(())
}
