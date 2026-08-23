import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { account } from "./schema";

const migrationPath = resolve(process.cwd(), "drizzle/0031_better_auth_account_issuer.sql");

describe("Better Auth account schema", () => {
  it("defines the required issuer identity column", () => {
    const columns = getTableColumns(account) as Record<
      string,
      { name?: string; notNull?: boolean }
    >;

    expect(columns.issuer).toBeDefined();
    expect(columns.issuer?.name).toBe("issuer");
    expect(columns.issuer?.notNull).toBe(true);
  });

  it("migrates existing Google accounts to issuer-based identity without losing rows", () => {
    const sqlite = new DatabaseSync(":memory:");

    try {
      sqlite.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE user (
          id text PRIMARY KEY NOT NULL
        );
        CREATE TABLE account (
          id text PRIMARY KEY NOT NULL,
          account_id text NOT NULL,
          provider_id text NOT NULL,
          user_id text NOT NULL,
          access_token text,
          refresh_token text,
          id_token text,
          access_token_expires_at integer,
          refresh_token_expires_at integer,
          scope text,
          password text,
          created_at integer NOT NULL,
          updated_at integer NOT NULL,
          FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE cascade
        );
        CREATE INDEX account_user_id_idx ON account(user_id);
        CREATE UNIQUE INDEX account_provider_account_unique
          ON account(provider_id, account_id);
        INSERT INTO user (id) VALUES ('user-1');
        INSERT INTO account (
          id,
          account_id,
          provider_id,
          user_id,
          created_at,
          updated_at
        ) VALUES (
          'account-1',
          'google-subject-1',
          'google',
          'user-1',
          1,
          1
        );
      `);

      const migrationSql = readFileSync(migrationPath, "utf8");
      const statements = migrationSql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) sqlite.exec(statement);

      const migrated = sqlite
        .prepare("SELECT id, issuer FROM account WHERE id = ?")
        .get("account-1") as { id: string; issuer: string } | undefined;
      expect(migrated).toEqual({
        id: "account-1",
        issuer: "https://accounts.google.com"
      });

      const issuerColumn = sqlite
        .prepare("PRAGMA table_info(account)")
        .all()
        .find((column) => column.name === "issuer") as
        | { name: string; notnull: number }
        | undefined;
      expect(issuerColumn).toMatchObject({ name: "issuer", notnull: 1 });

      const indexNames = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'account'")
        .all()
        .map((index) => String(index.name));
      expect(indexNames).toContain("account_issuer_account_unique");
      expect(indexNames).not.toContain("account_provider_account_unique");

      expect(() => {
        sqlite.exec(`
          INSERT INTO account (
            id,
            account_id,
            provider_id,
            issuer,
            user_id,
            created_at,
            updated_at
          ) VALUES (
            'account-2',
            'google-subject-1',
            'google',
            'https://tenant.example.com',
            'user-1',
            1,
            1
          );
        `);
      }).not.toThrow();

      expect(() => {
        sqlite.exec(`
          INSERT INTO account (
            id,
            account_id,
            provider_id,
            issuer,
            user_id,
            created_at,
            updated_at
          ) VALUES (
            'account-3',
            'google-subject-1',
            'another-provider',
            'https://accounts.google.com',
            'user-1',
            1,
            1
          );
        `);
      }).toThrow(/UNIQUE constraint failed/);
    } finally {
      sqlite.close();
    }
  });
});
