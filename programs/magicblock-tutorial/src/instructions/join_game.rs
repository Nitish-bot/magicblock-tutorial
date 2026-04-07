use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct JoinGame {}

pub fn handler(ctx: Context<JoinGame>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
