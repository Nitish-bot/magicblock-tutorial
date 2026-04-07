use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateGame {}

pub fn handler(ctx: Context<CreateGame>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
