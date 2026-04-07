use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub game_id: u64,
    pub player1: Pubkey,
    pub player2: Option<Pubkey>,
    pub result: GameResult,
}

#[account]
#[derive(InitSpace)]
pub struct PlayerChoice {
    pub game_id: u64,
    pub player: Pubkey,
    pub choice: Option<Choice>,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub enum GameResult {
    Winner(GameData),
    Tie(Choice),
    None,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GameData {
    pub player1_choice: Choice,
    pub player2_choice: Choice,
    pub winner: Pubkey,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Choice {
    Rock,
    Paper,
    Scissors,
}
