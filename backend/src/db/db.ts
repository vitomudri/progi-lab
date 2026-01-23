import pg from "pg";
import { env } from "../env.js";
import pkg from "../../package.json" with { type: "json" };
import { User, Admin } from "../models/User.js";

export const pool = new pg.Pool({
    user: env.PG_USER,
    host: env.PG_HOST,
    database: env.PG_DATABASE,
    password: env.PG_PASS,
    port: env.PG_PORT
});

export async function init_database() {
    const client = await pool.connect();

    await client.query(`
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
    const result = await client.query(`SELECT value FROM metadata WHERE key = 'version';`);

    if (result.rowCount === 0) {
        // Database does not yet exist; The database schema should created here.
        try {
            await client.query("BEGIN");

            await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
            await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

            await client.query(`
                INSERT INTO metadata (key, value)
                VALUES ('version', '${pkg.version}');
            `);

            await client.query(`
                CREATE TABLE Users (
                    user_id VARCHAR PRIMARY KEY,
                    first_name VARCHAR NOT NULL,
                    last_name VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    password_hash VARCHAR NOT NULL,
                    registration_date DATE DEFAULT CURRENT_DATE,
                    status VARCHAR,
                    role VARCHAR,
                    must_change_password BOOLEAN DEFAULT true,
                    totp_secret VARCHAR,
                    CONSTRAINT email_key UNIQUE(email),
                    CONSTRAINT status_check CHECK (status IN ('active', 'blocked', 'unverified')),
                    CONSTRAINT role_check CHECK (role IN ('student', 'instructor', 'admin'))
                );
            `);

            await client.query(`CREATE INDEX idx_users_first_name_trgm ON Users USING gin(first_name gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_users_last_name_trgm ON Users USING gin(last_name gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_users_user_id_trgm ON Users USING gin(user_id gin_trgm_ops);`);

            await client.query(`
            CREATE TABLE Instructors (
                    instructor_id VARCHAR PRIMARY KEY,
                    biography TEXT,
                    specialization VARCHAR,
                    rating NUMERIC(3,2),
                    verified BOOLEAN DEFAULT false,
                    verification_file_ids JSONB DEFAULT '[]'::jsonb,
                    CONSTRAINT instructor_id_fkey FOREIGN KEY(instructor_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT instructor_rating_check CHECK(rating >= 0 AND rating <= 5)
                );
            `);

            await client.query(`
                CREATE TABLE Admins (
                    admin_id VARCHAR PRIMARY KEY,
                    access_level VARCHAR,
                    CONSTRAINT admin_id_fkey FOREIGN KEY(admin_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE Students (
                    student_id VARCHAR PRIMARY KEY,
                    skill_level VARCHAR,
                    dietary_preferences VARCHAR,
                    favorite_cuisines VARCHAR,
                    allergens TEXT,
                    CONSTRAINT student_id_fkey FOREIGN KEY(student_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE Courses (
                    course_id SERIAL PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    difficulty SMALLINT,
                    instructor_id VARCHAR,
                    rating NUMERIC(3,2),
                    published_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT instructor_id_fkey FOREIGN KEY(instructor_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE SET NULL,
                    CONSTRAINT difficulty_check CHECK (difficulty >= 1 AND difficulty <= 5),
                    CONSTRAINT rating_check CHECK (rating >= 0 AND rating <= 5)
                );
            `);

            await client.query(`CREATE INDEX idx_courses_title_trgm ON Courses USING gin(title gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_courses_description_trgm ON Courses USING gin(description gin_trgm_ops);`);

            await client.query(`
                CREATE TABLE Modules (
                    module_id SERIAL PRIMARY KEY,
                    title VARCHAR,
                    description VARCHAR,
                    course_id INTEGER,
                    CONSTRAINT course_id_fkey FOREIGN KEY(course_id)
                        REFERENCES Courses(course_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`CREATE INDEX idx_modules_title_trgm ON Modules USING gin(title gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_modules_description_trgm ON Modules USING gin(description gin_trgm_ops);`);

            await client.query(`
                CREATE TABLE Lessons (
                    lesson_id SERIAL PRIMARY KEY,
                    title VARCHAR,
                    description VARCHAR,
                    video_url VARCHAR,
                    duration INTEGER,
                    difficulty SMALLINT,
                    module_id INTEGER,
                    CONSTRAINT module_id_fkey FOREIGN KEY(module_id)
                        REFERENCES Modules(module_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT difficulty_check CHECK (difficulty >= 1 AND difficulty <= 5)
                );
            `);

            await client.query(`CREATE INDEX idx_lessons_title_trgm ON Lessons USING gin(title gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_lessons_description_trgm ON Lessons USING gin(description gin_trgm_ops);`);

            await client.query(`
                CREATE TABLE Recipes (
                    recipe_id VARCHAR PRIMARY KEY,
                    name VARCHAR,
                    description VARCHAR,
                    prep_time INTEGER,
                    number_of_servings INTEGER,
                    lesson_id INTEGER,
                    CONSTRAINT lesson_id_fkey FOREIGN KEY(lesson_id)
                        REFERENCES Lessons(lesson_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`CREATE INDEX idx_recipes_name_trgm ON Recipes USING gin(name gin_trgm_ops);`);
            await client.query(`CREATE INDEX idx_recipes_description_trgm ON Recipes USING gin(description gin_trgm_ops);`);

            await client.query(`
                CREATE TABLE LiveWorkshops (
                    workshop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR,
                    description TEXT,
                    date_time TIMESTAMP WITHOUT TIME ZONE,
                    seat_number INTEGER,
                    duration INTEGER,
                    recording_url TEXT,
                    instructor_id VARCHAR,
                    CONSTRAINT instructor_id_fkey FOREIGN KEY(instructor_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE SET NULL
                );
            `);

            await client.query(`
                CREATE TABLE Reservations (
                    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id VARCHAR,
                    workshop_id UUID,
                    status VARCHAR DEFAULT 'confirmed',
                    CONSTRAINT user_id_fkey FOREIGN KEY(user_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT workshop_id_fkey FOREIGN KEY(workshop_id)
                        REFERENCES LiveWorkshops(workshop_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT status_check CHECK(status IN ('confirmed', 'canceled'))
                );
            `);

            await client.query(`
                CREATE TABLE RatingsReviews (
                    review_id SERIAL PRIMARY KEY,
                    user_id VARCHAR,
                    object_type VARCHAR NOT NULL,
                    object_id INTEGER,
                    rating SMALLINT,
                    comment TEXT,
                    date DATE DEFAULT CURRENT_DATE,
                    CONSTRAINT user_id_fkey FOREIGN KEY(user_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT object_type_check CHECK (object_type IN ('lesson', 'course', 'instructor')),
                    CONSTRAINT rating_check CHECK (rating >= 1 AND rating <= 5)
                );
            `);

            await client.query(`
                CREATE TABLE Certificates (
                    certificate_id SERIAL PRIMARY KEY,
                    student_id VARCHAR,
                    course_id INTEGER,
                    issued_date DATE DEFAULT CURRENT_DATE,
                    pdf_url TEXT,
                    CONSTRAINT student_course_key UNIQUE(student_id, course_id),
                    CONSTRAINT student_id_fkey FOREIGN KEY(student_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT course_id_fkey FOREIGN KEY(course_id)
                        REFERENCES Courses(course_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE AuditLogs (
                    log_id SERIAL PRIMARY KEY,
                    user_id VARCHAR,
                    action TEXT,
                    date_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT user_id_fkey FOREIGN KEY(user_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE SET NULL
                );
            `);

            await client.query(`
                CREATE TABLE Tags (
                    tag_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR
                );
            `);

            await client.query(`
                CREATE TABLE StudentTags (
                    student_id VARCHAR NOT NULL,
                    tag_id VARCHAR NOT NULL,
                    CONSTRAINT student_tag_pkey PRIMARY KEY(student_id, tag_id),
                    CONSTRAINT student_id_fkey FOREIGN KEY(student_id)
                        REFERENCES Students(student_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT tag_id_fkey FOREIGN KEY(tag_id)
                        REFERENCES Tags(tag_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE RecipesTags (
                    recipe_id VARCHAR NOT NULL,
                    tag_id VARCHAR NOT NULL,
                    CONSTRAINT recipe_tag_pkey PRIMARY KEY(recipe_id, tag_id),
                    CONSTRAINT recipe_id_fkey FOREIGN KEY(recipe_id)
                        REFERENCES Recipes(recipe_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT tag_id_fkey FOREIGN KEY(tag_id)
                        REFERENCES Tags(tag_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE StoredFiles (
                    file_id UUID PRIMARY KEY,
                    bucket TEXT NOT NULL,
                    key TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    size BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query("COMMIT");

            let user = await User.new({"email": env.ADMIN_EMAIL, "first_name": "System", "last_name": "Admin"});
            user.role = "admin";
            await user.save();

            let admin = (await Admin.from_user(user))!;
            await admin.save();
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
    } else {
        /** @todo Database exists, but might be for an older version of the app? Extra checks need to be made; If need be, upgrade logic should be implemented here. */
    }

    client.release();
    console.log("Database init finished.");
}
