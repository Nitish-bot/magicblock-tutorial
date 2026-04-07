use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RevealWinner {}

pub fn handler(ctx: Context<RevealWinner>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
