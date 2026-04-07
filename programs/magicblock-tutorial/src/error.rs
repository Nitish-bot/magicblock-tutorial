use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("You cannot join your own game.")]
    JoinOwnGame,
    #[msg("Game already has two players.")]
    JoinFullGame,
    #[msg("You have already made your choice.")]
    ChooseTwice,
    #[msg("Both players must make a choice first.")]
    RevealTooEarly,
}
