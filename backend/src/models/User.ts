import { randomUUID, type UUID } from "crypto";
import { pool } from "../db/db.js";
import { EmailBuilder } from "../email/email.js";
import generate_password from "../util/password.js";
import argon2 from "argon2";

export type NewUserOptions = { first_name: string; last_name: string; email: string };

export type ExistingUserOptions = { user_id: UUID } | { email: string };

export type UserStatus = "active" | "blocked" | "unverified" | null;

export type UserRole = "student" | "instructor" | "admin";

export class User {
    is_new: boolean = false;
    user_id: UUID;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    registration_date: Date;
    status: UserStatus;
    role: UserRole;
    must_change_password: boolean;
    totp_secret: string | null;
    calendar_key : UUID;

    protected constructor(
        is_new: boolean,
        user_id: UUID,
        first_name: string,
        last_name: string,
        email: string,
        password_hash: string,
        registration_date: Date,
        status: UserStatus,
        role: UserRole,
        must_change_password: boolean,
        totp_secret: string | null,
        calendar_key : UUID
    ) {
        this.is_new = is_new;
        this.user_id = user_id;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.password_hash = password_hash;
        this.registration_date = registration_date;
        this.status = status;
        this.role = role;
        this.must_change_password = must_change_password;
        this.totp_secret = totp_secret;
        this.calendar_key = calendar_key;
    }

    static async new(options: NewUserOptions, send_mail: boolean = true): Promise<User> {
        const new_password = generate_password();

        const user = new User(
            true,
            randomUUID(),
            options.first_name,
            options.last_name,
            options.email,
            await argon2.hash(new_password),
            new Date(),
            null,
            "student",
            true,
            null,
            randomUUID()
        );

        if (send_mail) {
            await new EmailBuilder()
                .add_recipient(user)
                .with_subject("Registration complete")
                .with_text_body(
                    `Your registration has been completed.\n\nYour temporary password is: ${new_password}\n\nPlease change it as soon as possible!`
                )
                .build_and_send();
        }

        return user;
    }

    static async from_db(options: ExistingUserOptions): Promise<User | null> {
        const row_to_user = (row: any): User | null => {
            try {
                return new User(
                    false,
                    row.user_id,
                    row.first_name,
                    row.last_name,
                    row.email,
                    row.password_hash,
                    new Date(row.registration_date),
                    row.status,
                    row.role,
                    row.must_change_password,
                    row.totp_secret || null,
                    row.calendar_key
                );
            } catch (ignored) {}

            return null;
        };

        if ("user_id" in options) {
            const result = await pool.query(`SELECT * FROM "users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0 ? row_to_user(result.rows[0]) : null;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT * FROM "users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0 ? row_to_user(result.rows[0]) : null;
        }

        return null;
    }

    static async exists(options: ExistingUserOptions): Promise<boolean> {
        if ("user_id" in options) {
            const result = await pool.query(`SELECT 1 FROM "users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT 1 FROM "users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0;
        }

        return false;
    }

    async save() {
        if (this.is_new) {
            await pool.query(
                `INSERT INTO "users" ("user_id", "first_name", "last_name", "email", "password_hash", "registration_date", "status", "role", "must_change_password", "totp_secret", "calendar_key")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    this.user_id,
                    this.first_name,
                    this.last_name,
                    this.email,
                    this.password_hash,
                    this.registration_date,
                    this.status,
                    this.role,
                    this.must_change_password,
                    this.totp_secret,
                    this.calendar_key
                ]
            );
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "users" SET "first_name" = $2, "last_name" = $3, "email" = $4, "password_hash" = $5, "registration_date" = $6, "status" = $7, "role" = $8, "must_change_password" = $9, "totp_secret" = $10, "calendar_key" = $11
                 WHERE "user_id" = $1`,
                [
                    this.user_id,
                    this.first_name,
                    this.last_name,
                    this.email,
                    this.password_hash,
                    this.registration_date,
                    this.status,
                    this.role,
                    this.must_change_password,
                    this.totp_secret,
                    this.calendar_key
                ]
            );
        }
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
    async reset_password(send_mail: boolean = true): Promise<string> {
        const new_password = generate_password();
        this.password_hash = await argon2.hash(new_password);

        if (send_mail) {
            await new EmailBuilder()
                .add_recipient(this)
                .with_subject("Password reset")
                .with_text_body(`Your password has been reset.\n\nYour temporary password is: ${new_password}\n\nPlease change it as soon as possible!`)
                .build_and_send();
        }

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
}

export class Student extends User {
    skill_level: string | null;
    dietary_preferences: string | null;
    favorite_cuisines: string | null;
    allergens: string | null;

    static async from_user(user: User): Promise<Student | null> {
        if (user.role != "student") { return null; }

        const res = await pool.query(
            `SELECT "skill_level", "dietary_preferences", "favorite_cuisines", "allergens" FROM "students" WHERE "student_id" = $1`,
            [user.user_id]
        );

        const data = res.rows.length > 0 ? res.rows[0] : {};

        return new Student(
            user.is_new,
            user.user_id,
            user.first_name,
            user.last_name,
            user.email,
            user.password_hash,
            user.registration_date,
            user.status,
            user.role,
            user.must_change_password,
            user.totp_secret,
            user.calendar_key,
            data.skill_level || null,
            data.dietary_preferences || null,
            data.favorite_cuisines || null,
            data.allergens || null
        );
    }

    async save() {
        const is_new = this.is_new;
        await super.save();

        const save_insert = async () => {
            await pool.query(
                `INSERT INTO "students" ("student_id", "skill_level", "dietary_preferences", "favorite_cuisines", "allergens")
                    VALUES ($1, $2, $3, $4, $5)`,
                [
                    this.user_id,
                    this.skill_level,
                    this.dietary_preferences,
                    this.favorite_cuisines,
                    this.allergens
                ]
            );
        };

        const save_update = async () => {
            await pool.query(
                `UPDATE "students" SET "skill_level" = $2, "dietary_preferences" = $3, "favorite_cuisines" = $4, "allergens" = $5
                    WHERE "student_id" = $1`,
                [
                    this.user_id,
                    this.skill_level,
                    this.dietary_preferences,
                    this.favorite_cuisines,
                    this.allergens
                ]
            );
        };

        if (is_new) {
            await save_insert();
        } else {
            const student_exists = await pool.query(
                `SELECT 1 FROM "students" WHERE "student_id" = $1`,
                [this.user_id]
            );
            if (student_exists.rows.length > 0) {
                await save_update();
            } else {
                await save_insert();
            }
        }
    }

    protected constructor(
        is_new: boolean,
        user_id: UUID,
        first_name: string,
        last_name: string,
        email: string,
        password_hash: string,
        registration_date: Date,
        status: UserStatus,
        role: UserRole,
        must_change_password: boolean,
        totp_secret: string | null,
        calendar_key: UUID,
        skill_level: string | null,
        dietary_preferences: string | null,
        favorite_cuisines: string | null,
        allergens: string | null
    ) {
        super(
            is_new,
            user_id,
            first_name,
            last_name,
            email,
            password_hash,
            registration_date,
            status,
            role,
            must_change_password,
            totp_secret,
            calendar_key
        );
        this.skill_level = skill_level;
        this.dietary_preferences = dietary_preferences;
        this.favorite_cuisines = favorite_cuisines;
        this.allergens = allergens;
    }
}

export class Instructor extends User {
    biography: string | null;
    specialization: string | null;
    rating: number | null;
    verified: boolean;

    static async from_user(user: User): Promise<Instructor | null> {
        if (user.role != "instructor") { return null; }

        const result = await pool.query(
            `SELECT "biography", "specialization", "rating", "verified" FROM "instructors" WHERE "instructor_id" = $1`,
            [user.user_id]
        );

        const instructor_data = result.rows.length > 0 ? result.rows[0] : {};

        return new Instructor(
            user.is_new,
            user.user_id,
            user.first_name,
            user.last_name,
            user.email,
            user.password_hash,
            user.registration_date,
            user.status,
            user.role,
            user.must_change_password,
            user.totp_secret,
            user.calendar_key,
            instructor_data.biography || null,
            instructor_data.specialization || null,
            instructor_data.rating || null,
            instructor_data.verified || false
        );
    }

    async save() {
        const is_new = this.is_new;
        await super.save();

        const save_insert = async () => {
            await pool.query(
                `INSERT INTO "instructors" ("instructor_id", "biography", "specialization", "rating", "verified")
                    VALUES ($1, $2, $3, $4, $5)`,
                [
                    this.user_id,
                    this.biography,
                    this.specialization,
                    this.rating,
                    this.verified
                ]
            );
        };

        const save_update = async () => {
            await pool.query(
                `UPDATE "instructors" SET "biography" = $2, "specialization" = $3, "rating" = $4, "verified" = $5
                    WHERE "instructor_id" = $1`,
                [
                    this.user_id,
                    this.biography,
                    this.specialization,
                    this.rating,
                    this.verified
                ]
            );
        };

        if (is_new) {
            await save_insert();
        } else {
            const instructor_exists = await pool.query(
                `SELECT 1 FROM "instructors" WHERE "instructor_id" = $1`,
                [this.user_id]
            );
            if (instructor_exists.rows.length > 0) {
                await save_update();
            } else {
                await save_insert();
            }
        }
    }

    protected constructor(
        is_new: boolean,
        user_id: UUID,
        first_name: string,
        last_name: string,
        email: string,
        password_hash: string,
        registration_date: Date,
        status: UserStatus,
        role: UserRole,
        must_change_password: boolean,
        totp_secret: string | null,
        calendar_key: UUID,
        biography: string | null,
        specialization: string | null,
        rating: number | null,
        verified: boolean
    ) {
        super(
            is_new,
            user_id,
            first_name,
            last_name,
            email,
            password_hash,
            registration_date,
            status,
            role,
            must_change_password,
            totp_secret,
            calendar_key
        );
        this.biography = biography;
        this.specialization = specialization;
        this.rating = rating;
        this.verified = verified;
    }
}

export class Admin extends User {
    access_level: string | null;

    static async from_user(user: User): Promise<Admin | null> {
        if (user.role != "admin") { return null; }

        const result = await pool.query(
            `SELECT "access_level" FROM "admins" WHERE "admin_id" = $1`,
            [user.user_id]
        );

        const admin_data = result.rows.length > 0 ? result.rows[0] : {};

        return new Admin(
            user.is_new,
            user.user_id,
            user.first_name,
            user.last_name,
            user.email,
            user.password_hash,
            user.registration_date,
            user.status,
            user.role,
            user.must_change_password,
            user.totp_secret,
            user.calendar_key,
            admin_data.access_level || null
        );
    }

    async save() {
        const is_new = this.is_new;
        await super.save();

        const save_insert = async () => {
            await pool.query(
                `INSERT INTO "admins" ("admin_id", "access_level")
                    VALUES ($1, $2)`,
                [
                    this.user_id,
                    this.access_level
                ]
            );
        };

        const save_update = async () => {
            await pool.query(
                `UPDATE "admins" SET "access_level" = $2
                    WHERE "admin_id" = $1`,
                [
                    this.user_id,
                    this.access_level
                ]
            );
        };

        if (is_new) {
            await save_insert();
        } else {
            const admin_exists = await pool.query(
                `SELECT 1 FROM "admins" WHERE "admin_id" = $1`,
                [this.user_id]
            );
            if (admin_exists.rows.length > 0) {
                await save_update();
            } else {
                await save_insert();
            }
        }
    }

    protected constructor(
        is_new: boolean,
        user_id: UUID,
        first_name: string,
        last_name: string,
        email: string,
        password_hash: string,
        registration_date: Date,
        status: UserStatus,
        role: UserRole,
        must_change_password: boolean,
        totp_secret: string | null,
        calendar_key: UUID,
        access_level: string | null
    ) {
        super(
            is_new,
            user_id,
            first_name,
            last_name,
            email,
            password_hash,
            registration_date,
            status,
            role,
            must_change_password,
            totp_secret,
            calendar_key
        );
        this.access_level = access_level;
    }
}
