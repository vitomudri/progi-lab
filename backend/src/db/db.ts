import pg from "pg";
import { env } from "../env.js";
import pkg from "../../package.json" with { type: "json" };
import { User } from "../models/User.js";

export const pool = new pg.Pool({
  user: env.PG_USER,
  host: env.PG_HOST,
  database: env.PG_DATABASE,
  password: env.PG_PASS,
  port: env.PG_PORT,
});

export async function init_database() {
  const client = await pool.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const result = await client.query(
    `SELECT value FROM metadata WHERE key = 'version';`
  );

  if (result.rowCount === 0) {
    try {
      await client.query("BEGIN");

      await client.query(`
        INSERT INTO metadata (key, value)
        VALUES ('version', '${pkg.version}');
      `);

      // -----------------------------
      // CORE USERS TABLES
      // -----------------------------
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

      // -----------------------------
      // COURSES / MODULES / LESSONS
      // -----------------------------
      await client.query(`
        CREATE TABLE Courses (
          course_id SERIAL PRIMARY KEY,
          title VARCHAR NOT NULL,
          description VARCHAR,
          difficulty SMALLINT,
          instructor_id VARCHAR,
          rating NUMERIC(3,2),
          is_published BOOLEAN NOT NULL DEFAULT false,
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
          course_id INTEGER NOT NULL,
          title VARCHAR NOT NULL,
          order_index INTEGER NOT NULL,

          CONSTRAINT course_id_fkey FOREIGN KEY(course_id)
            REFERENCES Courses(course_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT module_course_order_unique UNIQUE(course_id, order_index)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS Lessons (
          lesson_id SERIAL PRIMARY KEY,
          module_id INTEGER NOT NULL,

          title TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          type TEXT NOT NULL,

          -- CONTENT (osnovno)
          content TEXT,
          video_url TEXT,

          -- KUHARSKE STVARI (TEXT BLOKOVI)
          steps_text TEXT,
          ingredients_text TEXT,

          -- METADATA
          prep_time_min INTEGER,
          cook_time_min INTEGER,
          difficulty TEXT,

          shopping_list TEXT,
          allergens TEXT,
          nutrition JSONB,

          CONSTRAINT lessons_module_id_fkey
            FOREIGN KEY (module_id)
            REFERENCES Modules(module_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lessons_unique_order
            UNIQUE (module_id, order_index),

          CONSTRAINT lessons_type_check
            CHECK (type IN ('video', 'text', 'recipe')),

          CONSTRAINT lessons_difficulty_check
            CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'))
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS LessonActivities (
          activity_id SERIAL PRIMARY KEY,
          lesson_id INTEGER NOT NULL,

          type TEXT NOT NULL,
          title TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_required BOOLEAN NOT NULL DEFAULT false,

          CONSTRAINT lesson_activities_lesson_id_fkey FOREIGN KEY (lesson_id)
            REFERENCES Lessons(lesson_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_activities_type_check
            CHECK (type IN ('quiz', 'photo_upload'))
        );
      `);

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

      // -----------------------------
      // STORED FILES (MUST EXIST BEFORE FK REFERENCES)
      // -----------------------------
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

      // -----------------------------
      // TABLES THAT REFERENCE StoredFiles
      // -----------------------------
      await client.query(`
        CREATE TABLE IF NOT EXISTS LessonActivitySubmissions (
          submission_id SERIAL PRIMARY KEY,
          activity_id INTEGER NOT NULL,
          student_id VARCHAR NOT NULL,

          answer JSONB,
          file_id UUID,

          status TEXT NOT NULL DEFAULT 'submitted',
          created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT lesson_activity_submissions_activity_id_fkey FOREIGN KEY (activity_id)
            REFERENCES LessonActivities(activity_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_activity_submissions_student_id_fkey FOREIGN KEY (student_id)
            REFERENCES Users(user_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_activity_submissions_file_id_fkey FOREIGN KEY (file_id)
            REFERENCES StoredFiles(file_id)
            ON UPDATE NO ACTION
            ON DELETE SET NULL,

          CONSTRAINT lesson_activity_submissions_status_check CHECK (status IN ('submitted', 'approved', 'rejected')),
          CONSTRAINT lesson_activity_submissions_unique UNIQUE (activity_id, student_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS LessonComments (
          comment_id SERIAL PRIMARY KEY,
          lesson_id INTEGER NOT NULL,
          user_id VARCHAR NOT NULL,

          parent_comment_id INTEGER,
          kind TEXT NOT NULL DEFAULT 'comment',
          content TEXT NOT NULL,

          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id)
            REFERENCES Lessons(lesson_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_comments_user_id_fkey FOREIGN KEY (user_id)
            REFERENCES Users(user_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id)
            REFERENCES LessonComments(comment_id)
            ON UPDATE NO ACTION
            ON DELETE CASCADE,

          CONSTRAINT lesson_comments_kind_check CHECK (kind IN ('comment', 'question', 'answer')),
          CONSTRAINT lesson_comments_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
        );
      `);

      // -----------------------------
      // OTHER TABLES
      // -----------------------------
      await client.query(`
        CREATE TABLE LiveWorkshops (
          workshop_id SERIAL PRIMARY KEY,
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
          reservation_id SERIAL PRIMARY KEY,
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

      await client.query("COMMIT");

      // Create initial admin
      const user = await User.new({
        email: env.ADMIN_EMAIL,
        first_name: "System",
        last_name: "Admin",
      });
      user.role = "admin";
      await user.save();
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } else {
    /** @todo upgrade logic */
  }

  client.release();
  console.log("Database init finished.");
}
