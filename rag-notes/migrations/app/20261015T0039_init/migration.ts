#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/c441276b352227b3d8ced9fe3d8d1448ba4c4b374212e32203627f12f1971b9c/contract";
import endContract from "../../snapshots/c441276b352227b3d8ced9fe3d8d1448ba4c4b374212e32203627f12f1971b9c/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createTable({
        schema: "public",
        table: "Chunk",
        columns: [
          col("content", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("documentId", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("embedding", "vector(1536)", {
            codecRef: { codecId: "pg/vector@1", typeParams: { length: 1536 } },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("index", "int4", {
            notNull: true,
            codecRef: { codecId: "pg/int4@1" },
          }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.createTable({
        schema: "public",
        table: "Document",
        columns: [
          col("content", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: { codecId: "pg/timestamptz-temporal@1" },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
          col("name", "text", {
            notNull: true,
            codecRef: { codecId: "pg/text@1" },
          }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.addUnique({
        schema: "public",
        table: "Document",
        constraint: "Document_name_key",
        columns: ["name"],
      }),
      this.createIndex({
        schema: "public",
        table: "Chunk",
        index: "Chunk_documentId_idx_825ef746",
        columns: ["documentId"],
      }),
      this.addForeignKey({
        schema: "public",
        table: "Chunk",
        foreignKey: {
          name: "Chunk_documentId_fkey",
          columns: ["documentId"],
          references: { schema: "public", table: "Document", columns: ["id"] },
          onDelete: "cascade",
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Chunk",
        index: "Chunk_embedding_idx",
        expression: "embedding vector_cosine_ops",
        extras: { type: "hnsw" },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
