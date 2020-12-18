# PostGraphile Starter template with docker and authentication

## Background

This is a starter template for building backend service with [PostGraphile](https://www.graphile.org/postgraphile/). TL:DR: PostGraphile is a project for building GraphQL backend from your PostgreSQL database schema directly, all the related Query and Mutation will be created automatically and can be customzied with custom plugin implementation or PostgreSQL functions (even with some advanced PostgreSQL features like Row Level Security)

## Project structure
```s
.
+-- src                     // postgraphile entry point 
|   +-- package.json        // database Dockerfile
|   +-- server.js           // Application entry point
+-- db                      // database image 
|   +-- Dockerfile          // database Dockerfile
|   +-- init
|       +-- 00-database.sql // Database schema initiation file
|       +-- 01-data/sql     // Database data initiation file
+-- custom-plugin
+-- Dockerfile              // postgraphile Dockerfile
+-- docker-compose 
+-- .env.example            // template file for .env file
+-- ...
```

## Set Up

## Usage

## Remarks

> Although I persoanlly found PostGraphile very good and useful, but it does have some problems in the real-world. like it will be troublesome when we try to add some new fields everytime