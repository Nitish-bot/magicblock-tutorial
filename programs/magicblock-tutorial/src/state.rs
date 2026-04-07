use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub game_id: u64,
    pub player1: Pubkey,
    pub player2: Option<Pubkey>,
    pub state: GameState,
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
pub enum GameState {
    AwaitingPlayerTwo,
    AwaitingFirstChoice,
    AwaitingSecondChoice,
    GameFinished,
    WinnerDeclared,
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

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum Choice {
    Rock,
    Paper,
    Scissors,
}

impl Choice {
    pub fn beats(&self, opponent: &Self) -> Option<bool> {
        if self == opponent {
            return None;
        }

        match self {
            Self::Rock => {
                if opponent == &Self::Scissors {
                    Some(true)
                } else {
                    Some(false)
                }
            }
            Self::Paper => {
                if opponent == &Self::Rock {
                    Some(true)
                } else {
                    Some(false)
                }
            }
            Self::Scissors => {
                if opponent == &Self::Paper {
                    Some(true)
                } else {
                    Some(false)
                }
            }
        }
    }
}
