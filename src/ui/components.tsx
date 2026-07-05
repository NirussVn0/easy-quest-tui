import React from 'react';
import { Box, Text } from 'ink';
import type {
  AccountState,
  QuestProgress,
  FarmSummary,
  QuestStatus,
  AccountStatus,
} from '../types/index';
import { formatTime } from '../utils/helpers';

// ─── Colour / Label helpers ───────────────────────────────────────────────────

function statusColor(status: QuestStatus): string {
  switch (status) {
    case 'done':
      return 'green';
    case 'error':
      return 'red';
    case 'running':
      return 'cyan';
    case 'pending':
      return 'yellow';
  }
}

function statusIcon(status: QuestStatus): string {
  switch (status) {
    case 'done':
      return '✔';
    case 'error':
      return '✖';
    case 'running':
      return '▶';
    case 'pending':
      return '⏳';
  }
}

function accountStatusColor(status: AccountStatus): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'error':
      return 'red';
    case 'farming':
      return 'cyan';
    case 'connecting':
    case 'fetching_quests':
    case 'initializing':
      return 'yellow';
  }
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const BAR_WIDTH = 20;

function ProgressBar({ current, total }: { current: number; total: number }) {
  if (total <= 0) return null;
  const filled = Math.max(
    0,
    Math.min(BAR_WIDTH, Math.round((1 - current / total) * BAR_WIDTH)),
  );
  const empty = BAR_WIDTH - filled;

  return (
    <Box>
      <Text color="cyan">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
    </Box>
  );
}

// ─── Quest Row ────────────────────────────────────────────────────────────────

function QuestRow({ quest }: { quest: QuestProgress }) {
  const remaining = quest.remaining <= 0 ? 'Done' : formatTime(quest.remaining);
  const showProgress = quest.status === 'running' && quest.total > 0;

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color={statusColor(quest.status)}>{statusIcon(quest.status)} </Text>
        <Text bold>{quest.name}</Text>
        <Text> </Text>
        <Text color="magenta">{quest.reward}</Text>
        {quest.status === 'running' && quest.remaining > 0 && <Text> ⏳ </Text>}
        {quest.status === 'running' && quest.remaining > 0 && (
          <Text color="yellowBright">{remaining}</Text>
        )}
      </Box>
      {showProgress && (
        <Box marginLeft={2} marginTop={0}>
          <ProgressBar current={quest.remaining} total={quest.total} />
        </Box>
      )}
      {quest.status === 'error' && quest.errorMessage && (
        <Box marginLeft={2}>
          <Text color="red">└─ {quest.errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: AccountState }) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - account.startedAt.getTime()) / 1000),
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={accountStatusColor(account.status)}
      paddingX={1}
      paddingY={0}
      marginBottom={0}
    >
      {/* Header row */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color="cyanBright">
            #{account.index + 1}
          </Text>
          <Text> </Text>
          <Text color="greenBright">{account.username}</Text>
          <Text dimColor> ({account.tokenPreview})</Text>
        </Box>
        <Box>
          <Text color={accountStatusColor(account.status)} bold>
            {account.status.toUpperCase()}
          </Text>
        </Box>
      </Box>

      {/* Stats row */}
      <Box columnGap={3} marginTop={0}>
        <Text dimColor>ID: {account.userId}</Text>
        <Text dimColor>Proxy: {account.proxy || 'none'}</Text>
        <Text dimColor>⏱ {formatTime(elapsed)}</Text>
        <Text color="green">✔ {account.completedCount}</Text>
        {account.failedCount > 0 && <Text color="red">✖ {account.failedCount}</Text>}
      </Box>

      {/* Error message */}
      {account.status === 'error' && account.errorMessage && (
        <Box marginTop={0}>
          <Text color="red">⚠ {account.errorMessage}</Text>
        </Box>
      )}

      {/* Quests list */}
      {account.quests.length > 0 && (
        <Box flexDirection="column" marginTop={0} rowGap={0}>
          {account.quests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {account.quests.length === 0 &&
        account.status !== 'initializing' &&
        account.status !== 'connecting' && (
          <Box marginLeft={2}>
            <Text dimColor>No farmeable quests</Text>
          </Box>
        )}
    </Box>
  );
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ summary }: { summary: FarmSummary }) {
  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={0}
      flexDirection="column"
    >
      <Box justifyContent="space-between">
        <Box>
          <Text bold color="cyanBright">
            Lazy Quest Farm
          </Text>
          <Text dimColor> • Multi-Account • Anti-Detect</Text>
        </Box>
        <Text dimColor>⏱ {formatTime(summary.elapsedSeconds)}</Text>
      </Box>

      <Box columnGap={4}>
        <Text>
          👤{' '}
          <Text color="white" bold>
            {summary.totalAccounts}
          </Text>{' '}
          accounts
        </Text>
        <Text color="cyan">▶ {summary.runningAccounts} running</Text>
        <Text color="green">✔ {summary.completedAccounts} done</Text>
        {summary.errorAccounts > 0 && (
          <Text color="red">✖ {summary.errorAccounts} errors</Text>
        )}
      </Box>

      <Box columnGap={4}>
        <Text>
          📋{' '}
          <Text bold>
            {summary.completedQuests + summary.failedQuests}/{summary.totalQuests}
          </Text>{' '}
          quests
        </Text>
        <Text color="green">✔ {summary.completedQuests} completed</Text>
        {summary.failedQuests > 0 && (
          <Text color="red">✖ {summary.failedQuests} failed</Text>
        )}
      </Box>
    </Box>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <Box marginTop={0}>
      <Text dimColor>Press Ctrl+C to stop • Auto-farming Discord Quests</Text>
    </Box>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function App({ accounts }: { accounts: AccountState[] }) {
  const elapsedSeconds =
    accounts.length > 0
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - Math.min(...accounts.map((a) => a.startedAt.getTime()))) / 1000,
          ),
        )
      : 0;

  const summary: FarmSummary = {
    totalAccounts: accounts.length,
    completedAccounts: accounts.filter((a) => a.status === 'completed').length,
    errorAccounts: accounts.filter((a) => a.status === 'error').length,
    runningAccounts: accounts.filter(
      (a) =>
        a.status === 'farming' ||
        a.status === 'connecting' ||
        a.status === 'fetching_quests',
    ).length,
    totalQuests: accounts.reduce((s, a) => s + a.quests.length, 0),
    completedQuests: accounts.reduce((s, a) => s + a.completedCount, 0),
    failedQuests: accounts.reduce((s, a) => s + a.failedCount, 0),
    elapsedSeconds,
  };

  return (
    <Box flexDirection="column" padding={1}>
      <SummaryBanner summary={summary} />
      <Box flexDirection="column" rowGap={0} marginTop={0}>
        {accounts.map((account) => (
          <AccountCard key={account.index} account={account} />
        ))}
      </Box>
      <Footer />
    </Box>
  );
}
