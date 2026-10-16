#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5d26eadfca2e2b1d3330f69c4f076b8d166ec08085ec4b3c9d4b4c9e41f9304c/contract';
import endContract from '../../snapshots/5d26eadfca2e2b1d3330f69c4f076b8d166ec08085ec4b3c9d4b4c9e41f9304c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c441276b352227b3d8ced9fe3d8d1448ba4c4b374212e32203627f12f1971b9c/contract';
import startContract from '../../snapshots/c441276b352227b3d8ced9fe3d8d1448ba4c4b374212e32203627f12f1971b9c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Chunk',
        column: col('page', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
