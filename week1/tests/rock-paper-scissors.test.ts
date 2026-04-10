import "dotenv/config";
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
  type GameData,
} from "@/client/index";
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
  unwrapOption,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import assert from "node:assert/strict";
import { beforeAll, describe, it } from "vitest";
import { connect, getPDAAndBump, type Connection } from "solana-kite";
import nacl from "tweetnacl";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stringify = (object: unknown) => {
  const bigIntReplacer = (key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value;
  return JSON.stringify(object, bigIntReplacer, 2);
};

const logAccountMap = (
  label: string,
  accounts: Record<string, Address | string | undefined>,
) => {
  console.log(`===== ${label} =====`);
  for (const [name, value] of Object.entries(accounts)) {
    console.log(`${name}: ${value ?? "<unset>"}`);
  }
  console.log("====================");
};

const LAMPORTS_PER_SOL = 1_000_000_000n;
const AIRDROP_AMOUNT = lamports(2n * LAMPORTS_PER_SOL);
const MINIMUM_BALANCE = lamports(LAMPORTS_PER_SOL / 2n);

const cluster = (process.env.CLUSTER || "devnet").toLowerCase();
const isDevnet = cluster === "devnet";

const baseUrl =
  process.env.BASE_ENDPOINT ||
  (isDevnet ? "https://api.devnet.solana.com" : "http://127.0.0.1:8899");
const baseWsUrl =
  process.env.BASE_WS_ENDPOINT ||
  (isDevnet ? "wss://api.devnet.solana.com" : "ws://127.0.0.1:8900");
const ephemeralUrl =
  process.env.EPHEMERAL_ENDPOINT ||
  (isDevnet ? "https://devnet-tee.magicblock.app" : "http://127.0.0.1:7799");
const ephemeralWsUrl =
  process.env.EPHEMERAL_WS_ENDPOINT ||
  (isDevnet ? "wss://devnet-tee.magicblock.app" : "ws://127.0.0.1:7800");
const erValidator = process.env.ER_VALIDATOR
  ? address(process.env.ER_VALIDATOR)
  : isDevnet
    ? address("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo")
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

    try {
      await conn.rpc
        .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
          encoding: "base64",
          skipPreflight,
        })
        .send();
    } catch (error) {
      const logs = await getFailureLogs(conn, signature);
      throw new Error(
        `Transaction send failed for ${signature}\n${stringify(error)}\nLogs:\n${logs.join(
          "\n",
        )}`,
      );
    }

    for (let i = 0; i < 60; i += 1) {
      const { value } = await conn.rpc.getSignatureStatuses([signature]).send();
      const status = value[0];
      if (status?.err) {
        const logs = await getFailureLogs(conn, signature);
        throw new Error(
          `Transaction failed for ${signature}: ${stringify(status.err)}\nLogs:\n${logs.join(
            "\n",
          )}`,
        );
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

async function getFailureLogs(
  conn: Connection,
  signature: string,
): Promise<string[]> {
  try {
    const logs = await conn.getLogs(signature);
    if (logs.length > 0) {
      return logs;
    }
  } catch {
    // Fall through to transaction fetch.
  }

  try {
    const tx = await conn.getTransaction(signature, "confirmed", 0);
    const metaLogs = tx?.meta?.logMessages;
    if (Array.isArray(metaLogs) && metaLogs.length > 0) {
      return metaLogs;
    }
  } catch {
    // Ignore and return fallback text below.
  }

  return ["<no logs available>"];
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
  assert.deepEqual(Array.from(bytes.slice(0, 8)), Array.from(discriminator));
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
        `${ephemeralWsUrl}?token=${authTokenP1.token}`,
      );
      ephemeralConnectionP2 = connect(
        `${ephemeralUrl}?token=${authTokenP2.token}`,
        `${ephemeralWsUrl}?token=${authTokenP2.token}`,
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

    logAccountMap("Account Map", {
      authority: authority.address,
      player1: player1.address,
      player2: player2.address,
      gamePda,
      player1ChoicePda,
      player2ChoicePda,
      permissionGame,
      permissionP1,
      permissionP2,
      erValidator,
    });
  });

  it("creates the game and delegates player1 choice account to ER", async () => {
    const createGameIx = getCreateGameInstruction({
      player: player1,
      game: gamePda,
      playerChoice: player1ChoicePda,
      gameId,
    });

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
      [
        createGameIx,
        createPermissionIx,
        delegatePermissionIx,
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
    const player1Choice = await decodeAccount(
      baseConnection,
      player1ChoicePda,
      PLAYER_CHOICE_DISCRIMINATOR,
      getPlayerChoiceDecoder(),
    );

    assert.equal(game.gameId, gameId);
    assert.equal(game.player1, player1.address);
    assert.equal(unwrapOption(game.player2), null);
    assert.equal(game.state, GameState.AwaitingPlayerTwo);
    assert.equal(game.result.__kind, "None");

    assert.equal(player1Choice.gameId, gameId);
    assert.equal(player1Choice.player, player1.address);
    assert.equal(unwrapOption(player1Choice.choice), null);
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

    assert.equal(unwrapOption(game.player2), player2.address);
    assert.equal(game.state, GameState.AwaitingFirstChoice);
    assert.equal(player2Choice.player, player2.address);
    assert.equal(unwrapOption(player2Choice.choice), null);
  });

  it("enforces ER visibility on delegated choice accounts", async () => {
    // Will fail on localnet since private ER
    // is not supported on local validator
    if (ephemeralUrl.includes("tee")) {
      assert.equal(await waitUntilPermissionActive(ephemeralUrl, gamePda), true);
      assert.equal(
        await waitUntilPermissionActive(ephemeralUrl, player1ChoicePda),
        true,
      );
      assert.equal(
        await waitUntilPermissionActive(ephemeralUrl, player2ChoicePda),
        true,
      );

      const p1Sneak = await ephemeralConnectionP1.rpc
        .getAccountInfo(player2ChoicePda, { encoding: "base64" })
        .send();
      const p2Sneak = await ephemeralConnectionP2.rpc
        .getAccountInfo(player1ChoicePda, { encoding: "base64" })
        .send();

      assert.equal(p1Sneak.value, null);
      assert.equal(p2Sneak.value, null);
    }

    const p1Own = await ephemeralConnectionP1.rpc
      .getAccountInfo(player1ChoicePda, { encoding: "base64" })
      .send();
    const p2Own = await ephemeralConnectionP2.rpc
      .getAccountInfo(player2ChoicePda, { encoding: "base64" })
      .send();

    assert.notEqual(p1Own.value, null);
    assert.notEqual(p2Own.value, null);
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

    assert.equal(gameAfterP1.state, GameState.AwaitingSecondChoice);
    assert.equal(unwrapOption(choiceAfterP1.choice), Choice.Rock);

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

    assert.equal(gameAfterP2.state, GameState.GameFinished);
    assert.equal(unwrapOption(choiceAfterP2.choice), Choice.Scissors);
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

    if (ephemeralUrl.includes("tee")) {
      const game = await waitForDecodedAccount(
        baseConnection,
        gamePda,
        GAME_DISCRIMINATOR,
        getGameDecoder(),
        (value) => value.state === GameState.WinnerDeclared,
        "winner declaration on base layer",
      );
  
      assert.equal(unwrapOption(player1Choice.choice), Choice.Rock);
      assert.equal(unwrapOption(player2Choice.choice), Choice.Scissors);
  
      assert.equal(game.state, GameState.WinnerDeclared);
      assert.equal(game.result.__kind, "Winner");
  
      // @ts-ignore fields does exist on the winner arm of GameResult
      const [winnerData]: [GameData] = game.result.fields!;
      assert.equal(winnerData.player1Choice, Choice.Rock);
      assert.equal(winnerData.player2Choice, Choice.Scissors);
      assert.equal(winnerData.winner, player1.address);
    }
  });
});
