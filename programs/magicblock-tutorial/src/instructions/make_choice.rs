use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MakeChoice {}

pub fn handler(ctx: Context<MakeChoice>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
