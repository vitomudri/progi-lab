import { randomBytes, randomUUID, type UUID } from "crypto";
import { pool } from "../db/initDatabase.js";
import { EmailBuilder } from "../email/email.js";
import argon2 from "argon2";

export type NewUserOptions = { first_name: string; last_name: string; email: string };

export type ExistingUserOptions = { user_id: UUID } | { email: string };

export type UserStatus = "active" | "blocked" | "unverified" | null;

export type UserRole = "student" | "instructor" | "admin";

export class User {
    private is_new: boolean = false;
    user_id: UUID;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    registration_date: Date;
    status: UserStatus;
    role: UserRole;
    audit_log_enabled: boolean;
    must_change_password: boolean;

    constructor(options: NewUserOptions) {
        this.is_new = true;
        this.user_id = randomUUID();
        this.first_name = options.first_name;
        this.last_name = options.last_name;
        this.email = options.email;
        this.password_hash = User.generate_password();
        this.registration_date = new Date();
        this.status = null;
        this.role = "student";
        this.audit_log_enabled = false;
        this.must_change_password = true;
    }

    private static generate_password(length: number = 12): string {
        const charset = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
        const bytes = randomBytes(length);
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset[bytes.at(i)! % charset.length];
        }
        return password;
    }

    private static from_row(row: any): User {
        const user = new User({ first_name: row.first_name, last_name: row.last_name, email: row.email });
        user.user_id = row.user_id;
        user.password_hash = row.password_hash;
        user.registration_date = new Date(row.registration_date);
        user.status = row.status;
        user.role = row.role;
        user.audit_log_enabled = row.audit_log_enabled;
        user.must_change_password = row.must_change_password;
        user.is_new = false;
        return user;
    }


    static async get_from_db(options: ExistingUserOptions): Promise<User | null> {
        if ("user_id" in options) {
            const result = await pool.query(`SELECT * FROM "Users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0 ? User.from_row(result.rows[0]) : null;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT * FROM "Users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0 ? User.from_row(result.rows[0]) : null;
        }

        return null;
    }

    static async exists_in_db(options: ExistingUserOptions): Promise<boolean> {
        if ("user_id" in options) {
            const result = await pool.query(`SELECT 1 FROM "Users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT 1 FROM "Users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0;
        }

        return false;
    }

    /**
     * Returns true if the password matches and false if it does not
     * @param input The input password
     */
    async check_password(input: string): Promise<boolean> {
        return await argon2.verify(this.password_hash, input);
    }

    /**
     * Resets the password to a secure default. Does not interact with `must_change_password`
     * @returns The password
     */
    async reset_password(): Promise<string> {
        const new_password = User.generate_password();
        this.password_hash = await argon2.hash(new_password);
        return new_password;
    }

    /**
     * Changes the account password according to user input. Disables `must_change_password`
     * @param input The input password
     */
    async set_password(input: string) {
        this.password_hash = await argon2.hash(input);
        this.must_change_password = false;
    }

    async save() {
        if (this.is_new) {
            await pool.query(
                `INSERT INTO "Users" ("user_id", "first_name", "last_name", "email", "password_hash", "registration_date", "status", "role", "audit_log_enabled", "must_change_password")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [this.user_id, this.first_name, this.last_name, this.email, this.password_hash, this.registration_date, this.status, this.role, this.audit_log_enabled, this.must_change_password]
            );
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "Users" SET "first_name" = $2, "last_name" = $3, "email" = $4, "password_hash" = $5, "registration_date" = $6, "status" = $7, "role" = $8, "audit_log_enabled" = $9, "must_change_password" = $10
                 WHERE "user_id" = $1`,
                [this.user_id, this.first_name, this.last_name, this.email, this.password_hash, this.registration_date, this.status, this.role, this.audit_log_enabled, this.must_change_password]
            );
        }
    }
}
