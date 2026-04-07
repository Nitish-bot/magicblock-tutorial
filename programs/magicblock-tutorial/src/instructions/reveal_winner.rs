use anchor_lang::prelude::*;

use crate::{
    constants::{GAME_SEED, PLAYER_CHOICE_SEED},
    error::GameError,
    state::{Game, GameData, GameResult, GameState, PlayerChoice},
};

#[derive(Accounts)]
pub struct RevealWinner<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game.game_id.to_le_bytes()],
        bump,
        constraint = game.player2.is_some() @ GameError::RevealTooEarly
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [PLAYER_CHOICE_SEED, &game.player1.key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
        constraint = player1_choice.choice.is_some() @ GameError::RevealTooEarly
    )]
    pub player1_choice: Account<'info, PlayerChoice>,

    #[account(
        seeds = [PLAYER_CHOICE_SEED, &game.player2.unwrap().key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
        constraint = player2_choice.choice.is_some() @ GameError::RevealTooEarly
    )]
    pub player2_choice: Account<'info, PlayerChoice>,
}

pub fn handler(ctx: Context<RevealWinner>) -> Result<()> {
    let game = &mut ctx.accounts.game;

    let p1_choice = ctx.accounts.player1_choice.choice.as_ref().unwrap();
    let p2_choice = ctx.accounts.player2_choice.choice.as_ref().unwrap();

    let result = match p1_choice.beats(p2_choice) {
        Some(true) => GameResult::Winner(GameData {
            player1_choice: p1_choice.clone(),
            player2_choice: p2_choice.clone(),
            winner: game.player1.key(),
        }),
        Some(false) => GameResult::Winner(GameData {
            player1_choice: p1_choice.clone(),
            player2_choice: p2_choice.clone(),
            winner: game.player2.unwrap().key(),
        }),
        None => GameResult::Tie(p1_choice.clone()),
    };

    game.result = result;
    game.state = GameState::WinnerDeclared;

    Ok(())
}
