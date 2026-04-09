use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{access_control::{instructions::UpdatePermissionCpiBuilder, structs::MembersArgs}, anchor::commit, consts::PERMISSION_PROGRAM_ID, ephem::commit_and_undelegate_accounts};

use crate::{
    constants::{GAME_SEED, PLAYER_CHOICE_SEED},
    error::GameError,
    state::{Game, GameData, GameResult, GameState, PlayerChoice},
};

#[commit]
#[derive(Accounts)]
pub struct RevealWinner<'info> {
    /// Payer not Player - Anyone can call this
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
        mut,
        seeds = [PLAYER_CHOICE_SEED, &game.player1.key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
        constraint = player1_choice.choice.is_some() @ GameError::RevealTooEarly
    )]
    pub player1_choice: Account<'info, PlayerChoice>,

    #[account(
        mut,
        seeds = [PLAYER_CHOICE_SEED, &game.player2.unwrap().key().to_bytes(), &game.game_id.to_le_bytes()],
        bump,
        constraint = player2_choice.choice.is_some() @ GameError::RevealTooEarly
    )]
    pub player2_choice: Account<'info, PlayerChoice>,
    
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission_game: UncheckedAccount<'info>,
    
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission_p1: UncheckedAccount<'info>,
    
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission_p2: UncheckedAccount<'info>,

    /// CHECK: PERMISSION PROGRAM
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
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
    
    // Update permissions and commit + undelegate 
    //  the accounts back to base layer
    let player1_choice = &ctx.accounts.player1_choice;
    let player2_choice = &ctx.accounts.player2_choice;
    
    let permission_program = &ctx.accounts.permission_program.to_account_info();
    let permission_game = &ctx.accounts.permission_game.to_account_info();
    let permission_p1 = &ctx.accounts.permission_p1.to_account_info();
    let permission_p2 = &ctx.accounts.permission_p2.to_account_info();
    let magic_program = &ctx.accounts.magic_program.to_account_info();
    let magic_context = &ctx.accounts.magic_context.to_account_info();
    
    let game_seeds: &[&[&[u8]]] = &[&[
        GAME_SEED,
        &game.game_id.to_le_bytes(),
        &[ctx.bumps.game]
    ]];
    UpdatePermissionCpiBuilder::new(&permission_program)
        .permissioned_account(&game.to_account_info(), true)
        .authority(&game.to_account_info(), false)
        .permission(&permission_game)
        .args(MembersArgs { members: None })
        .invoke_signed(game_seeds)?;
    
    let player1_seeds: &[&[&[u8]]] = &[&[
        PLAYER_CHOICE_SEED,
        player1_choice.player.as_ref(),
        &player1_choice.game_id.to_le_bytes(),
        &[ctx.bumps.player1_choice]
    ]];
    UpdatePermissionCpiBuilder::new(&permission_program)
        .permissioned_account(&player1_choice.to_account_info(), true)
        .authority(&player1_choice.to_account_info(), false)
        .permission(&permission_p1)
        .args(MembersArgs { members: None })
        .invoke_signed(player1_seeds)?;
    
    let player2_seeds: &[&[&[u8]]] = &[&[
        PLAYER_CHOICE_SEED,
        player2_choice.player.as_ref(),
        &player2_choice.game_id.to_le_bytes(),
        &[ctx.bumps.player2_choice]
    ]];
    UpdatePermissionCpiBuilder::new(&permission_program)
        .permissioned_account(&player2_choice.to_account_info(), true)
        .authority(&player2_choice.to_account_info(), false)
        .permission(&permission_p2)
        .args(MembersArgs { members: None })
        .invoke_signed(player2_seeds)?;
    
    game.exit(&crate::ID)?;
    player1_choice.exit(&crate::ID)?;
    player2_choice.exit(&crate::ID)?;
    
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&game.to_account_info(), &player1_choice.to_account_info(), &player2_choice.to_account_info()],
        magic_context,
        magic_program
    )?;
    
    Ok(())
}
