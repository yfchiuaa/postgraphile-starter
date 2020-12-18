/**
 * ################################################################# 
 * This file is for initiating your database in container 
 * You can put your schema, function definition, permission grant, 
 * type definition, trggier, Row level security here
 * #################################################################
 **/

\connect mydb

/** data table schema  */

CREATE TABLE "user" (
    id                      serial              not null unique                     ,
    email                   text                not null primary key                ,
    password                text                not null                            ,
    first_name              text                                                    ,
    last_name               text                                                    ,
    created_at              timestamp           not null default now()              ,
    updated_at              timestamp           not null default now()
);


CREATE TABLE post (
    id                      serial              not null primary key                ,
    publisher               integer             not null references "user"(id)      ,
    content                 text                not null                            ,
    created_at              timestamp           not null default now()
);

/** access role  */

/** the default user  */
CREATE ROLE guest;
GRANT guest TO current_user;

/** the logged in user  */
CREATE ROLE member;
GRANT member TO current_user;

/** additional extension and type  */

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.jwt_token AS (
    role            text,
    member_id       integer
);

/** updated_at trigger function */

CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

CREATE TRIGGER user_updated_at_modtime BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

/** functions for Postgraphile additional mutations and query  */

CREATE FUNCTION signup(email TEXT, password TEXT) 
    RETURNS jwt_token AS $$
    DECLARE
        token_information jwt_token;
    BEGIN
        INSERT INTO "user" (email, password) VALUES ($1, crypt($2, gen_salt('bf', 8))); 
        SELECT 'member', id
            INTO token_information
            FROM "user"
            WHERE "user".email = $1;
        RETURN token_information::jwt_token;
    END;
    $$ LANGUAGE PLPGSQL VOLATILE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION SIGNUP(email TEXT, password TEXT) TO guest;

CREATE FUNCTION signin(email TEXT, password TEXT)
    RETURNS jwt_token AS $$
    DECLARE
        token_information jwt_token;
    BEGIN
        SELECT 'member', id
            INTO token_information
            FROM "user"
            WHERE "user".email = $1 AND "user".password = crypt($2, "user".password);
        RETURN token_information::jwt_token;
    END;
    $$ LANGUAGE PLPGSQL VOLATILE STRICT SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION SIGNIN(email TEXT, password TEXT) TO guest;
