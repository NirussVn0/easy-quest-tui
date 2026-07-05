import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type {
  AccountState,
  QuestProgress,
  FarmSummary,
  QuestStatus,
  AccountStatus,
} from '../types/index';
import { formatTime, maskProxy } from '../utils/helpers';
import { readConfig, saveAccount } from '../config/env';
import { Orchestrator } from '../core/orchestrator';

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

function AccountCard({
  account,
  selected,
}: {
  account: AccountState;
  selected: boolean;
}) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - account.startedAt.getTime()) / 1000),
  );

  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? 'double' : 'round'}
      borderColor={selected ? 'cyan' : accountStatusColor(account.status)}
      paddingX={1}
      paddingY={0}
      marginBottom={0}
    >
      {/* Header row */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={selected ? 'cyanBright' : 'cyan'}>
            {selected ? '▶ ' : '  '}#{account.index + 1}
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

// ─── Text Input ───────────────────────────────────────────────────────────────

interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isActive: boolean;
  mask?: boolean;
}

function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  isActive,
  mask = false,
}: TextInputProps) {
  useInput((input, key) => {
    if (!isActive) return;

    if (key.return) {
      onSubmit();
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    // Accept printable ASCII characters (supports single keypresses and pasted text chunks)
    if (input) {
      const printable = [...input].filter((char) => char >= ' ' && char <= '~').join('');
      if (printable.length > 0) {
        onChange(value + printable);
      }
    }
  });

  const displayValue = mask ? '*'.repeat(value.length) : value;

  return (
    <Box>
      {value.length === 0 ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <Text color={isActive ? 'cyanBright' : 'white'}>{displayValue}</Text>
      )}
      {isActive && (
        <Text color="cyan" bold>
          |
        </Text>
      )}
    </Box>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function App() {
  const [screen, setScreen] = useState<
    'menu' | 'add_token' | 'view_accounts' | 'farming'
  >('menu');
  const [config, setConfig] = useState(() => {
    try {
      return readConfig();
    } catch {
      return { accounts: [], concurrency: 3, tokensFile: 'tokens.txt' };
    }
  });
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);

  // Add Token state
  const [tokenInput, setTokenInput] = useState('');
  const [proxyInput, setProxyInput] = useState('');
  const [activeInputField, setActiveInputField] = useState<'token' | 'proxy'>('token');
  const [addTokenStatus, setAddTokenStatus] = useState('');

  // Handle global Menu keys
  useInput((input, key) => {
    if (screen !== 'menu') return;

    if (key.upArrow) {
      setSelectedMenuIndex((prev) => (prev > 0 ? prev - 1 : 3));
    } else if (key.downArrow) {
      setSelectedMenuIndex((prev) => (prev < 3 ? prev + 1 : 0));
    } else if (key.return) {
      if (selectedMenuIndex === 0) {
        setAccounts([]);
        setSelectedAccountIndex(0);
        setScreen('farming');
      } else if (selectedMenuIndex === 1) {
        setTokenInput('');
        setProxyInput('');
        setActiveInputField('token');
        setAddTokenStatus('');
        setScreen('add_token');
      } else if (selectedMenuIndex === 2) {
        setScreen('view_accounts');
      } else if (selectedMenuIndex === 3) {
        process.exit(0);
      }
    }
  });

  // Handle global View Accounts keys
  useInput((input, key) => {
    if (screen !== 'view_accounts') return;

    if (key.escape || input === 'q') {
      setScreen('menu');
    }
  });

  // Handle global Add Token keys
  useInput((input, key) => {
    if (screen !== 'add_token') return;

    if (key.escape) {
      setScreen('menu');
      return;
    }

    if (key.tab || key.downArrow || key.upArrow) {
      setActiveInputField((prev) => (prev === 'token' ? 'proxy' : 'token'));
    }
  });

  // Handle global Farming keys
  useInput((input, key) => {
    if (screen !== 'farming') return;

    if (key.escape) {
      setScreen('menu');
      return;
    }

    if (accounts.length === 0) return;

    if (key.upArrow) {
      setSelectedAccountIndex((prev) => (prev > 0 ? prev - 1 : accounts.length - 1));
    } else if (key.downArrow) {
      setSelectedAccountIndex((prev) => (prev < accounts.length - 1 ? prev + 1 : 0));
    }
  });

  // Start orchestrator inside useEffect when screen becomes 'farming'
  useEffect(() => {
    if (screen !== 'farming' || config.accounts.length === 0) return;

    const orchestrator = new Orchestrator(config.accounts);

    // Set initial accounts preview
    setAccounts(
      config.accounts.map((acc, index) => ({
        index,
        tokenPreview: acc.token.slice(0, 12) + '...',
        username: 'Connecting...',
        userId: '-',
        status: 'initializing',
        quests: [],
        startedAt: new Date(),
        completedCount: 0,
        failedCount: 0,
        proxy: acc.proxy ? maskProxy(acc.proxy) : 'none',
      })),
    );

    const handleUpdate = (updatedAccounts: AccountState[]) => {
      setAccounts(updatedAccounts);
    };

    orchestrator.on('update', handleUpdate);

    orchestrator.start().catch(() => {});

    return () => {
      orchestrator.off('update', handleUpdate);
      orchestrator.abort();
    };
  }, [screen, config]);

  const handleAddTokenSubmit = () => {
    if (!tokenInput.trim()) {
      setAddTokenStatus('❌ Token cannot be empty!');
      return;
    }
    try {
      saveAccount(config.tokensFile, tokenInput.trim(), proxyInput.trim() || undefined);

      // Reload config
      const newConfig = readConfig();
      setConfig(newConfig);

      setAddTokenStatus('✔ Account added successfully!');

      // Clear inputs
      setTokenInput('');
      setProxyInput('');
      setActiveInputField('token');

      setTimeout(() => {
        setScreen('menu');
      }, 1500);
    } catch (err) {
      setAddTokenStatus(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Render different screens
  if (screen === 'menu') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
        <Box marginBottom={1} flexDirection="column">
          <Text bold color="cyanBright">
            🚀 LAZY QUEST AUTO-FARMER
          </Text>
          <Text dimColor>Live terminal dashboard for Discord Quests</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text
            color={selectedMenuIndex === 0 ? 'cyan' : 'white'}
            bold={selectedMenuIndex === 0}
          >
            {selectedMenuIndex === 0 ? ' ▶ ' : '   '}Start Quest Farming (
            {config.accounts.length} account(s) loaded)
          </Text>
          <Text
            color={selectedMenuIndex === 1 ? 'cyan' : 'white'}
            bold={selectedMenuIndex === 1}
          >
            {selectedMenuIndex === 1 ? ' ▶ ' : '   '}Add Account Token (TUI)
          </Text>
          <Text
            color={selectedMenuIndex === 2 ? 'cyan' : 'white'}
            bold={selectedMenuIndex === 2}
          >
            {selectedMenuIndex === 2 ? ' ▶ ' : '   '}View Loaded Accounts
          </Text>
          <Text
            color={selectedMenuIndex === 3 ? 'cyan' : 'white'}
            bold={selectedMenuIndex === 3}
          >
            {selectedMenuIndex === 3 ? ' ▶ ' : '   '}Exit
          </Text>
        </Box>

        <Text dimColor>Use Up/Down Arrow keys to navigate, press Enter to select.</Text>
      </Box>
    );
  }

  if (screen === 'add_token') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
        <Box marginBottom={1}>
          <Text bold color="yellow">
            ➕ Add Account Token
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color={activeInputField === 'token' ? 'cyanBright' : 'gray'}>
              Discord Token:{' '}
            </Text>
            <TextInput
              value={tokenInput}
              onChange={setTokenInput}
              onSubmit={handleAddTokenSubmit}
              placeholder="Paste Discord token here..."
              isActive={activeInputField === 'token'}
              mask={true}
            />
          </Box>
          <Box>
            <Text bold color={activeInputField === 'proxy' ? 'cyanBright' : 'gray'}>
              Proxy URL:{' '}
            </Text>
            <TextInput
              value={proxyInput}
              onChange={setProxyInput}
              onSubmit={handleAddTokenSubmit}
              placeholder="e.g. socks5://127.0.0.1:1080 (optional)"
              isActive={activeInputField === 'proxy'}
            />
          </Box>
        </Box>

        {addTokenStatus && (
          <Box marginBottom={1}>
            <Text bold>{addTokenStatus}</Text>
          </Box>
        )}

        <Text dimColor>
          Press Tab or Arrow keys to switch fields • Press Enter to Submit • Press Esc to
          cancel
        </Text>
      </Box>
    );
  }

  if (screen === 'view_accounts') {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
        <Box marginBottom={1}>
          <Text bold color="magenta">
            👤 Loaded Accounts ({config.accounts.length})
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {config.accounts.map((acc, i) => (
            <Box key={i} marginLeft={1}>
              <Text color="cyan">#{i + 1} </Text>
              <Text bold color="white">
                {acc.token.slice(0, 16)}...
              </Text>
              <Text dimColor> | Proxy: </Text>
              <Text color={acc.proxy ? 'yellow' : 'gray'}>
                {acc.proxy ? maskProxy(acc.proxy) : 'none'}
              </Text>
            </Box>
          ))}
          {config.accounts.length === 0 && (
            <Text color="red">No accounts loaded! Add a token first.</Text>
          )}
        </Box>

        <Text dimColor>Press Esc or Q to return to Menu</Text>
      </Box>
    );
  }

  // Farming Screen
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

  const isFinished = summary.runningAccounts === 0 && accounts.length > 0;

  return (
    <Box flexDirection="column" padding={1}>
      <SummaryBanner summary={summary} />
      <Box flexDirection="column" rowGap={0} marginTop={0}>
        {accounts.map((account) => (
          <AccountCard
            key={account.index}
            account={account}
            selected={selectedAccountIndex === account.index}
          />
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {isFinished && (
          <Text bold color="greenBright">
            ✔ Quest Farming Completed! All accounts processed.
          </Text>
        )}
        <Text dimColor>
          Press Esc to return to Menu • Use Up/Down Arrows to select accounts • Press
          Ctrl+C to Exit
        </Text>
      </Box>
    </Box>
  );
}
