import {
  BUSINESS_LINES,
  BUSINESS_LINE_LABELS,
  MARKETS,
  MARKET_LABELS,
  SOURCES,
  SOURCE_LABELS,
  STAGES,
  STAGE_LABELS,
} from '@dechub/shared';
import type { UserDTO } from '@dechub/shared';

export const SourceOptions = () => (
  <>
    {SOURCES.map((s) => (
      <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
    ))}
  </>
);
export const MarketOptions = () => (
  <>
    {MARKETS.map((m) => (
      <option key={m} value={m}>{MARKET_LABELS[m]}</option>
    ))}
  </>
);
export const LineOptions = () => (
  <>
    {BUSINESS_LINES.map((b) => (
      <option key={b} value={b}>{BUSINESS_LINE_LABELS[b]}</option>
    ))}
  </>
);
export const StageOptions = () => (
  <>
    {STAGES.map((s) => (
      <option key={s} value={s}>{STAGE_LABELS[s]}</option>
    ))}
  </>
);
export const UserOptions = ({ users }: { users: UserDTO[] }) => (
  <>
    {users.map((u) => (
      <option key={u.id} value={u.id}>{u.name}</option>
    ))}
  </>
);
