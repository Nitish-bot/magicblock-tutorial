use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::delegate, cpi::DelegateConfig};

use crate::{AccountType, utils::derive_seeds_from_account_type};

/// Unified delegate PDA context
#[delegate] // enable delegation
#[derive(Accounts)]
pub struct DelegatePda<'info> {
    pub payer: Signer<'info>,
    
    /// CHECK: The PDA to delegate
    #[account(mut, del)]
    pub game_or_choice: UncheckedAccount<'info>,
    
    /// CHECK: Checked by the delegate program
    pub validator: Option<UncheckedAccount<'info>>,
}

/// Delegate account to the delegation program based on account type
/// Set specific validator based on ER, see https://docs.magicblock.gg/pages/get-started/how-integrate-your-program/local-setup
pub fn handler(ctx: Context<DelegatePda>, account_type: AccountType) -> Result<()> {
    let seed_data = derive_seeds_from_account_type(&account_type);
    let seeds_refs: Vec<&[u8]> = seed_data.iter().map(|s| s.as_slice()).collect();

    let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
    ctx.accounts.delegate_game_or_choice(
        &ctx.accounts.payer,
        &seeds_refs,
        DelegateConfig {
            validator,
            ..Default::default()
        },
    )?;
    Ok(())
}