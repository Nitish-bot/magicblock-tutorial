use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("You cannot join your own game.")]
    JoinOwnGame,
    #[msg("Game already has two players.")]
    JoinFullGame,
    #[msg("You have already made your choice.")]
    ChooseTwice,
    #[msg("You cannot make a choice before somebody joins the game.")]
    ChooseTooEarly,
    #[msg("Both players must make a choice first.")]
    RevealTooEarly,
}
