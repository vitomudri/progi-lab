import pg from "pg";
import { env } from "../env.js";
import pkg from '../../package.json' with { type: 'json' };

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

            await client.query(`
                INSERT INTO metadata (key, value)
                VALUES ('version', '${pkg.version}');
            `);

            await client.query(`
                CREATE TABLE Users (
                    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    first_name VARCHAR NOT NULL,
                    last_name VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    password_hash VARCHAR NOT NULL,
                    registration_date DATE DEFAULT CURRENT_DATE,
                    status VARCHAR,
                    role VARCHAR,
                    audit_log_enabled BOOLEAN DEFAULT false,
                    must_change_password BOOLEAN DEFAULT true,
                    totp_secret VARCHAR,
                    calendar_key UUID NOT NULL UNIQUE,
                    CONSTRAINT email_key UNIQUE(email),
                    CONSTRAINT status_check CHECK (status IN ('active', 'blocked', 'unverified')),
                    CONSTRAINT role_check CHECK (role IN ('student', 'instructor', 'admin'))
                );
            `);

            await client.query(`
            CREATE TABLE Instructors (
                    instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    biography TEXT,
                    specialization VARCHAR,
                    rating NUMERIC(3,2),
                    verified BOOLEAN DEFAULT false,
                    CONSTRAINT instructor_id_fkey FOREIGN KEY(instructor_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT instructor_rating_check CHECK(rating >= 0 AND rating <= 5)
                );
            `);

            await client.query(`
                CREATE TABLE Admins (
                    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    access_level VARCHAR,
                    CONSTRAINT admin_id_fkey FOREIGN KEY(admin_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE Students (
                    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

            await client.query(`
                CREATE TABLE Recipes (
                    recipe_id SERIAL PRIMARY KEY,
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
                    workshop_id INTEGER,
                    status VARCHAR DEFAULT 'potvrđeno',
                    CONSTRAINT user_id_fkey FOREIGN KEY(user_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT workshop_id_fkey FOREIGN KEY(workshop_id)
                        REFERENCES LiveWorkshops(workshop_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT status_check CHECK(status IN ('potvrđeno', 'otkazano'))
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
                    CONSTRAINT object_type_check CHECK (object_type IN ('lekcija', 'tečaj', 'instruktor')),
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
            CREATE TABLE Notifications (
                    notification_id SERIAL PRIMARY KEY,
                    user_id VARCHAR,
                    content TEXT,
                    type VARCHAR,
                    status VARCHAR DEFAULT 'poslano',
                    CONSTRAINT user_id_fkey FOREIGN KEY(user_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT type_check CHECK(type IN ('podsjetnik', 'novost', 'potvrda')),
                    CONSTRAINT status_check CHECK(status IN ('poslano', 'procitano'))
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
                CREATE TABLE Tabs (
                    tab_id SERIAL PRIMARY KEY,
                    name VARCHAR
                );
            `);

            await client.query(`
                CREATE TABLE RecipesTabs (
                    student_id VARCHAR NOT NULL,
                    tab_id INTEGER NOT NULL,
                    CONSTRAINT student_tab_pkey PRIMARY KEY(student_id, tab_id),
                    CONSTRAINT student_id_fkey FOREIGN KEY(student_id)
                        REFERENCES Users(user_id)
                        ON UPDATE NO ACTION
                        ON DELETE CASCADE,
                    CONSTRAINT tab_id_fkey FOREIGN KEY(tab_id)
                        REFERENCES Tabs(tab_id)
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
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
    } else {
        /** @todo Database exists, but might be for an older version of the app? Extra checks need to be made; If need be, upgrade logic should be implemented here. */
    }

    client.release();
    console.log("Database init finished.");
};
