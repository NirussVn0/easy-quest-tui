import React from 'react';
import { Box, Text, render } from 'ink';
import type { ActiveQuest, ActiveQuestStatus, UserInfo } from '../types/quest.types';
import { formatTime } from '../utils/helpers';

export interface DashboardState {
  user: UserInfo;
  quests: ActiveQuest[];
  startedAt: Date;
}

interface DashboardRenderer {
  update(state: DashboardState): void;
  stop(): void;
}

function statusColor(status: ActiveQuestStatus) {
  if (status === 'Done') return 'green';
  if (status === 'Error') return 'red';
  return 'cyan';
}

function statusLabel(status: ActiveQuestStatus) {
  if (status === 'Done') return 'DONE';
  if (status === 'Error') return 'ERROR';
  return 'RUNNING';
}

function getElapsedSeconds(startedAt: Date) {
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
}

function QuestRow({ quest, index }: { quest: ActiveQuest; index: number }) {
  const remaining = quest.remaining <= 0 ? 'complete' : formatTime(quest.remaining);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Box justifyContent="space-between">
        <Text color="cyanBright" bold>
          #{index + 1} {quest.name}
        </Text>
        <Text color={statusColor(quest.status)} bold>
          {statusLabel(quest.status)}
        </Text>
      </Box>

      <Box marginTop={1} columnGap={2}>
        <Text color="magenta">🎁 {quest.reward}</Text>
        <Text color={quest.remaining <= 60 ? 'yellowBright' : 'white'}>
          ⏳ {remaining}
        </Text>
      </Box>
    </Box>
  );
}

function Dashboard({ state }: { state: DashboardState }) {
  const done = state.quests.filter((quest) => quest.status === 'Done').length;
  const errored = state.quests.filter((quest) => quest.status === 'Error').length;
  const running = state.quests.filter((quest) => quest.status === 'Running').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="double" borderColor="cyan" paddingX={1} flexDirection="column">
        <Text color="cyanBright" bold>
          Lazy Quest Dashboard
        </Text>
        <Text dimColor>Maintained by NirussVn0 • TypeScript CLI</Text>
      </Box>

      <Box marginTop={1} columnGap={4}>
        <Text>
          👤 <Text color="greenBright">{state.user.username}</Text>
        </Text>
        <Text>
          🆔 <Text color="cyanBright">{state.user.id}</Text>
        </Text>
        <Text>
          ⏱️ <Text color="yellow">{formatTime(getElapsedSeconds(state.startedAt))}</Text>
        </Text>
      </Box>

      <Box marginTop={1} columnGap={3}>
        <Text color="cyan">▶ {running} running</Text>
        <Text color="green">✔ {done} done</Text>
        <Text color="red">✖ {errored} errors</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" rowGap={1}>
        {state.quests.length === 0 ? (
          <Text dimColor>No supported active quests found.</Text>
        ) : (
          state.quests.map((quest, index) => (
            <QuestRow key={quest.id} quest={quest} index={index} />
          ))
        )}
      </Box>
    </Box>
  );
}

export function createDashboardRenderer(state: DashboardState): DashboardRenderer {
  const app = render(<Dashboard state={state} />);

  return {
    update(nextState) {
      app.rerender(<Dashboard state={nextState} />);
    },
    stop() {
      app.unmount();
    },
  };
}
