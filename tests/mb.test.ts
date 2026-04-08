import {
  AUTHORITY_FLAG,
  TX_LOGS_FLAG,
  createDelegatePermissionInstruction,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
  getAuthToken,
  permissionPdaFromAccount,
  waitUntilPermissionActive,
} from "@magicblock-labs/ephemeral-rollups-kit";
import {
  Choice,
  GAME_DISCRIMINATOR,
  GameState,
  MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS,
  PLAYER_CHOICE_DISCRIMINATOR,
  accountType,
  getCreateGameInstruction,
  getCreatePermissionInstruction,
  getDelegatePdaInstructionAsync,
  getGameDecoder,
  getJoinGameInstruction,
  getMakeChoiceInstruction,
  getPlayerChoiceDecoder,
  getRevealWinnerInstruction,
} from "@client/index";
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { beforeAll, describe, expect, it } from "bun:test";
import { connect, getPDAAndBump, type Connection } from "solana-kite";
import nacl from "tweetnacl";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const LAMPORTS_PER_SOL = 1_000_000_000n;
const AIRDROP_AMOUNT = lamports(2n * LAMPORTS_PER_SOL);
const MINIMUM_BALANCE = lamports(LAMPORTS_PER_SOL / 2n);

const cluster = (process.env.CLUSTER || "devnet").toLowerCase();
const isDevnet = cluster === "devnet";

const baseUrl =
  process.env.BASE_URL ||
  (isDevnet ? "https://api.devnet.solana.com" : "http://127.0.0.1:8899");
const baseWsUrl =
  process.env.BASE_WS_URL ||
  (isDevnet ? "wss://api.devnet.solana.com" : "ws://127.0.0.1:8900");
const ephemeralUrl =
  process.env.EPHEMERAL_URL ||
  (isDevnet ? "https://devnet-tee.magicblock.app" : "http://127.0.0.1:7799");
const ephemeralWsUrl =
  process.env.EPHEMERAL_WS_URL ||
  (isDevnet ? "wss://devnet-tee.magicblock.app" : "ws://127.0.0.1:7800");
const erValidator = process.env.ER_VALIDATOR
  ? address(process.env.ER_VALIDATOR)
  : isDevnet
    ? address("FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA")
    : address("mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev");

const parseKeypairBytes = (value: string) =>
  Uint8Array.from(JSON.parse(value) as number[]);

async function createPlayerSigner(
  connection: Connection,
  envVar: string,
): Promise<{ signer: TransactionSigner; bytes?: Uint8Array }> {
  const encoded = process.env[envVar];
  if (encoded) {
    const bytes = parseKeypairBytes(encoded);
    return {
      signer: await createKeyPairSignerFromBytes(bytes),
      bytes,
    };
  }

  if (isDevnet) {
    throw new Error(`${envVar} is required for devnet tests.`);
  }

  return { signer: await connection.createWallet() };
}

async function createAuthoritySigner(
  connection: Connection,
): Promise<{ signer: TransactionSigner; bytes?: Uint8Array }> {
  const encoded = process.env.AUTHORITY_BYTES;
  if (encoded) {
    const bytes = parseKeypairBytes(encoded);
    return {
      signer: await createKeyPairSignerFromBytes(bytes),
      bytes,
    };
  }

  if (isDevnet) {
    const signer = await connection.loadWalletFromFile();
    return { signer };
  }

  return { signer: await connection.createWallet() };
}

async function ensureFunded(connection: Connection, signer: TransactionSigner) {
  await connection.airdropIfRequired(
    signer.address,
    AIRDROP_AMOUNT,
    MINIMUM_BALANCE,
    "confirmed",
  );
}

async function sendAndPoll(
  conn: Connection,
  feePayer: TransactionSigner,
  instructions: Parameters<
    Connection["sendTransactionFromInstructions"]
  >[0]["instructions"],
  options?: { skipPreflight?: boolean; maxRetries?: number },
) {
  const maxRetries = options?.maxRetries ?? 3;
  const skipPreflight = options?.skipPreflight ?? true;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const { value: latestBlockhash } = await conn.rpc
      .getLatestBlockhash()
      .send();

    const txMsg = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstructions(instructions, tx),
    );

    const signedTx = await signTransactionMessageWithSigners(txMsg);
    const signature = getSignatureFromTransaction(signedTx);

    await conn.rpc
      .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
        encoding: "base64",
        skipPreflight,
      })
      .send();

    for (let i = 0; i < 60; i += 1) {
      const { value } = await conn.rpc.getSignatureStatuses([signature]).send();
      const status = value[0];
      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (
        status?.confirmationStatus === "confirmed" ||
        status?.confirmationStatus === "finalized"
      ) {
        return signature;
      }
      await sleep(500);
    }

    if (attempt < maxRetries - 1) {
      await sleep(500);
      continue;
    }
  }

  throw new Error(
    "Transaction confirmation timeout after retrying fresh blockhashes",
  );
}

async function decodeAccount<T>(
  connection: Connection,
  account: Address,
  discriminator: Uint8Array,
  decoder: { decode(data: Uint8Array): T },
): Promise<T> {
  const raw = await connection.rpc
    .getAccountInfo(account, { encoding: "base64" })
    .send();

  if (!raw.value) {
    throw new Error(`Missing account ${account}`);
  }

  const bytes = Uint8Array.from(
    Buffer.from(raw.value.data[0] as string, "base64"),
  );
  expect(Array.from(bytes.slice(0, 8))).toEqual(Array.from(discriminator));
  return decoder.decode(bytes);
}

async function waitForDecodedAccount<T>(
  connection: Connection,
  account: Address,
  discriminator: Uint8Array,
  decoder: { decode(data: Uint8Array): T },
  predicate: (value: T) => boolean,
  label: string,
): Promise<T> {
  for (let i = 0; i < 30; i += 1) {
    const decoded = await decodeAccount(
      connection,
      account,
      discriminator,
      decoder,
    );
    if (predicate(decoded)) {
      return decoded;
    }
    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

describe(`magicblock tutorial (${cluster})`, () => {
  let authority: TransactionSigner;
  let player1: TransactionSigner;
  let player2: TransactionSigner;
  let player1Bytes: Uint8Array | undefined;
  let player2Bytes: Uint8Array | undefined;

  let gamePda: Address;
  let player1ChoicePda: Address;
  let player2ChoicePda: Address;
  let permissionGame: Address;
  let permissionP1: Address;
  let permissionP2: Address;

  let baseConnection: Connection;
  let ephemeralConnection: Connection;
  let ephemeralConnectionP1: Connection;
  let ephemeralConnectionP2: Connection;

  const gameId = BigInt(Date.now());

  beforeAll(async () => {
    baseConnection = connect(baseUrl, baseWsUrl);
    ephemeralConnection = connect(ephemeralUrl, ephemeralWsUrl);

    const authorityResult = await createAuthoritySigner(baseConnection);
    authority = authorityResult.signer;

    const player1Result = await createPlayerSigner(baseConnection, "P1B");
    player1 = player1Result.signer;
    player1Bytes = player1Result.bytes;

    const player2Result = await createPlayerSigner(baseConnection, "P2B");
    player2 = player2Result.signer;
    player2Bytes = player2Result.bytes;

    await ensureFunded(baseConnection, authority);
    await ensureFunded(baseConnection, player1);
    await ensureFunded(baseConnection, player2);

    if (ephemeralUrl.includes("tee")) {
      if (!player1Bytes || !player2Bytes) {
        throw new Error(
          "TEE endpoints require P1B and P2B environment variables with keypair bytes.",
        );
      }

      const authTokenP1 = await getAuthToken(
        ephemeralUrl,
        player1.address,
        (message: Uint8Array) =>
          Promise.resolve(nacl.sign.detached(message, player1Bytes!)),
      );
      const authTokenP2 = await getAuthToken(
        ephemeralUrl,
        player2.address,
        (message: Uint8Array) =>
          Promise.resolve(nacl.sign.detached(message, player2Bytes!)),
      );

      ephemeralConnectionP1 = connect(
        `${ephemeralUrl}?token=${authTokenP1.token}`,
        ephemeralWsUrl,
      );
      ephemeralConnectionP2 = connect(
        `${ephemeralUrl}?token=${authTokenP2.token}`,
        ephemeralWsUrl,
      );
    } else {
      ephemeralConnectionP1 = ephemeralConnection;
      ephemeralConnectionP2 = ephemeralConnection;
    }

    gamePda = (
      await getPDAAndBump(MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS, [
        Buffer.from("game"),
        gameId,
      ])
    ).pda;

    player1ChoicePda = (
      await getPDAAndBump(MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS, [
        Buffer.from("choice"),
        player1.address,
        gameId,
      ])
    ).pda;

    player2ChoicePda = (
      await getPDAAndBump(MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS, [
        Buffer.from("choice"),
        player2.address,
        gameId,
      ])
    ).pda;

    permissionGame = await permissionPdaFromAccount(gamePda);
    permissionP1 = await permissionPdaFromAccount(player1ChoicePda);
    permissionP2 = await permissionPdaFromAccount(player2ChoicePda);
  });

  it("creates the game and player1 choice account", async () => {
    const createGameIx = getCreateGameInstruction({
      player: player1,
      game: gamePda,
      playerChoice: player1ChoicePda,
      gameId,
    });

    await sendAndPoll(baseConnection, player1, [createGameIx], {
      skipPreflight: false,
    });

    const game = await decodeAccount(
      baseConnection,
      gamePda,
      GAME_DISCRIMINATOR,
      getGameDecoder(),
    );
    const player1Choice = await decodeAccount(
      baseConnection,
      player1ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    expect(game.gameId).toBe(gameId);
    expect(game.player1).toBe(player1.address);
    expect(game.player2.__option).toBe("None");
    expect(game.state).toBe(GameState.AwaitingPlayerTwo);
    expect(game.result.__kind).toBe("None");

    expect(player1Choice.gameId).toBe(gameId);
    expect(player1Choice.player).toBe(player1.address);
    expect(player1Choice.choice.__option).toBe("None");
  });

  it("creates player1 choice permission and delegates it to the ER", async () => {
    const createPermissionIx = getCreatePermissionInstruction({
      payer: player1,
      permissionedAccount: player1ChoicePda,
      permission: permissionP1,
      accountType: accountType("PlayerChoice", {
        gameId,
        player: player1.address,
      }),
      members: [
        {
          flags: AUTHORITY_FLAG | TX_LOGS_FLAG,
          pubkey: player1.address,
        },
      ],
    });

    const delegatePermissionIx = await createDelegatePermissionInstruction({
      payer: player1.address,
      authority: [player1.address, true],
      permissionedAccount: [player1ChoicePda, false],
      validator: erValidator,
    });

    const delegateChoiceIx = await getDelegatePdaInstructionAsync({
      payer: player1,
      bufferGameOrChoice:
        await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
          player1ChoicePda,
          MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS,
        ),
      // These two accounts are auto derived if not passed
      // but the simulation fails so we pass them explicitly
      delegationRecordGameOrChoice:
        await delegationRecordPdaFromDelegatedAccount(player1ChoicePda),
      delegationMetadataGameOrChoice:
        await delegationMetadataPdaFromDelegatedAccount(player1ChoicePda),
      gameOrChoice: player1ChoicePda,
      validator: erValidator,
      accountType: accountType("PlayerChoice", {
        gameId,
        player: player1.address,
      }),
    });

    await sendAndPoll(
      baseConnection,
      player1,
      [createPermissionIx, delegatePermissionIx, delegateChoiceIx],
      { skipPreflight: false },
    );
  });

  it("joins the game, creates permissions, and delegates all ER accounts", async () => {
    const joinGameIx = getJoinGameInstruction({
      player: player2,
      game: gamePda,
      playerChoice: player2ChoicePda,
    });

    const createGamePermissionIx = getCreatePermissionInstruction({
      payer: player2,
      permissionedAccount: gamePda,
      permission: permissionGame,
      accountType: accountType("Game", { gameId }),
      members: [
        {
          flags: AUTHORITY_FLAG | TX_LOGS_FLAG,
          pubkey: player1.address,
        },
        {
          flags: AUTHORITY_FLAG | TX_LOGS_FLAG,
          pubkey: player2.address,
        },
      ],
    });

    const delegateGamePermissionIx = await createDelegatePermissionInstruction({
      payer: player2.address,
      authority: [player2.address, true],
      permissionedAccount: [gamePda, false],
      validator: erValidator,
    });

    const delegateGameIx = await getDelegatePdaInstructionAsync({
      payer: player2,
      bufferGameOrChoice:
        await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
          gamePda,
          MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS,
        ),
      delegationRecordGameOrChoice:
        await delegationRecordPdaFromDelegatedAccount(gamePda),
      delegationMetadataGameOrChoice:
        await delegationMetadataPdaFromDelegatedAccount(gamePda),
      gameOrChoice: gamePda,
      validator: erValidator,
      accountType: accountType("Game", { gameId }),
    });

    const createChoicePermissionIx = getCreatePermissionInstruction({
      payer: player2,
      permissionedAccount: player2ChoicePda,
      permission: permissionP2,
      accountType: accountType("PlayerChoice", {
        gameId,
        player: player2.address,
      }),
      members: [
        {
          flags: AUTHORITY_FLAG | TX_LOGS_FLAG,
          pubkey: player2.address,
        },
      ],
    });

    const delegateChoicePermissionIx =
      await createDelegatePermissionInstruction({
        payer: player2.address,
        authority: [player2.address, true],
        permissionedAccount: [player2ChoicePda, false],
        validator: erValidator,
      });

    const delegateChoiceIx = await getDelegatePdaInstructionAsync({
      payer: player2,
      bufferGameOrChoice:
        await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
          player2ChoicePda,
          MAGICBLOCK_TUTORIAL_PROGRAM_ADDRESS,
        ),
      delegationRecordGameOrChoice:
        await delegationRecordPdaFromDelegatedAccount(player2ChoicePda),
      delegationMetadataGameOrChoice:
        await delegationMetadataPdaFromDelegatedAccount(player2ChoicePda),
      gameOrChoice: player2ChoicePda,
      validator: erValidator,
      accountType: accountType("PlayerChoice", {
        gameId,
        player: player2.address,
      }),
    });

    await sendAndPoll(
      baseConnection,
      player2,
      [
        joinGameIx,
        createGamePermissionIx,
        delegateGamePermissionIx,
        delegateGameIx,
        createChoicePermissionIx,
        delegateChoicePermissionIx,
        delegateChoiceIx,
      ],
      { skipPreflight: false },
    );

    const game = await decodeAccount(
      baseConnection,
      gamePda,
      GAME_DISCRIMINATOR,
      getGameDecoder(),
    );
    const player2Choice = await decodeAccount(
      baseConnection,
      player2ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    expect(game.player2).not.toBeNull();
    if (game.player2 == null) {
      throw new Error("Expected player2 to be set after join_game");
    }
    expect(String(game.player2)).toBe(String(player2.address));
    expect(game.state).toBe(GameState.AwaitingFirstChoice);
    expect(player2Choice.player).toBe(player2.address);
    expect(player2Choice.choice).toBeNull();
  });

  it("enforces ER visibility on delegated choice accounts", async () => {
    expect(await waitUntilPermissionActive(ephemeralUrl, gamePda)).toBe(true);
    expect(
      await waitUntilPermissionActive(ephemeralUrl, player1ChoicePda),
    ).toBe(true);
    expect(
      await waitUntilPermissionActive(ephemeralUrl, player2ChoicePda),
    ).toBe(true);

    const p1Own = await ephemeralConnectionP1.rpc
      .getAccountInfo(player1ChoicePda, { encoding: "base64" })
      .send();
    const p2Own = await ephemeralConnectionP2.rpc
      .getAccountInfo(player2ChoicePda, { encoding: "base64" })
      .send();

    expect(p1Own.value).not.toBeNull();
    expect(p2Own.value).not.toBeNull();

    const p1Sneak = await ephemeralConnectionP1.rpc
      .getAccountInfo(player2ChoicePda, { encoding: "base64" })
      .send();
    const p2Sneak = await ephemeralConnectionP2.rpc
      .getAccountInfo(player1ChoicePda, { encoding: "base64" })
      .send();

    expect(p1Sneak.value).toBeNull();
    expect(p2Sneak.value).toBeNull();
  });

  it("lets both players submit choices on the ephemeral rollup", async () => {
    const player1ChoiceIx = getMakeChoiceInstruction({
      player: player1,
      game: gamePda,
      playerChoice: player1ChoicePda,
      gameId,
      choice: Choice.Rock,
    });

    await sendAndPoll(ephemeralConnectionP1, player1, [player1ChoiceIx]);

    const gameAfterP1 = await decodeAccount(
      ephemeralConnectionP1,
      gamePda,
      GAME_DISCRIMINATOR,
      getGameDecoder(),
    );
    const choiceAfterP1 = await decodeAccount(
      ephemeralConnectionP1,
      player1ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    expect(gameAfterP1.state).toBe(GameState.AwaitingSecondChoice);
    expect(choiceAfterP1.choice).not.toBeNull();
    if (choiceAfterP1.choice == null) {
      throw new Error("Expected player1 choice to be recorded");
    }
    expect(Number(choiceAfterP1.choice)).toBe(Choice.Rock);

    const player2ChoiceIx = getMakeChoiceInstruction({
      player: player2,
      game: gamePda,
      playerChoice: player2ChoicePda,
      gameId,
      choice: Choice.Scissors,
    });

    await sendAndPoll(ephemeralConnectionP2, player2, [player2ChoiceIx]);

    const gameAfterP2 = await decodeAccount(
      ephemeralConnectionP2,
      gamePda,
      GAME_DISCRIMINATOR,
      getGameDecoder(),
    );
    const choiceAfterP2 = await decodeAccount(
      ephemeralConnectionP2,
      player2ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    expect(gameAfterP2.state).toBe(GameState.GameFinished);
    expect(gameAfterP2.result.__kind).toBe("None");
    expect(choiceAfterP2.choice).not.toBeNull();
    if (choiceAfterP2.choice == null) {
      throw new Error("Expected player2 choice to be recorded");
    }
    expect(Number(choiceAfterP2.choice)).toBe(Choice.Scissors);
  });

  it("reveals the winner and commits the result back to the base layer", async () => {
    const revealWinnerIx = getRevealWinnerInstruction({
      payer: authority,
      game: gamePda,
      player1Choice: player1ChoicePda,
      player2Choice: player2ChoicePda,
      permissionGame,
      permissionP1,
      permissionP2,
    });

    await sendAndPoll(ephemeralConnectionP1, authority, [revealWinnerIx]);

    const game = await waitForDecodedAccount(
      baseConnection,
      gamePda,
      GAME_DISCRIMINATOR,
      getGameDecoder(),
      (value) => value.state === GameState.WinnerDeclared,
      "winner declaration on base layer",
    );
    const player1Choice = await decodeAccount(
      baseConnection,
      player1ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );
    const player2Choice = await decodeAccount(
      baseConnection,
      player2ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    expect(game.state).toBe(GameState.WinnerDeclared);
    expect(game.result.__kind).toBe("Winner");
    if (game.result.__kind !== "Winner") {
      throw new Error("Expected a winner result");
    }

    const [winnerData] = game.result.fields;
    expect(winnerData.player1Choice).toBe(Choice.Rock);
    expect(winnerData.player2Choice).toBe(Choice.Scissors);
    expect(winnerData.winner).toBe(player1.address);

    expect(player1Choice.choice).not.toBeNull();
    expect(player2Choice.choice).not.toBeNull();
    if (player1Choice.choice == null || player2Choice.choice == null) {
      throw new Error("Expected committed player choices on the base layer");
    }
    expect(Number(player1Choice.choice)).toBe(Choice.Rock);
    expect(Number(player2Choice.choice)).toBe(Choice.Scissors);
  });
});
