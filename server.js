require('dotenv').config();
const express = require("express");
const { postgraphile } = require("postgraphile");
var cors = require('cors');

const app = express();

app.use(cors());

app.use(
  postgraphile(
    process.env.DATABASE_URL, "public", {
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
      // ownerConnectionString: true,
      dynamicJson: true,
      jwtSecret: "superSecretRandom",
      pgDefaultRole: "guest",
      showErrorStack: "json",
      jwtPgTypeIdentifier: "public.jwt_token",
      retryOnInitFail: true,
      appendPlugins: [
        require("postgraphile-plugin-connection-filter"),
        // require("custom-plugin"),
      ]
    }
  )
);

app.listen(process.env.PORT, () => {
    console.log(`The server is running on port ${process.env.PORT} 🚀 `);
});

