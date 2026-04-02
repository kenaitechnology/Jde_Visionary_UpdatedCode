export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // JDE MSSQL Configuration
  mssqlHost: process.env.JDE_MSSQL_SERVER ?? process.env.MSSQL_HOST ?? "",
  mssqlPort: parseInt(process.env.JDE_MSSQL_PORT ?? process.env.MSSQL_PORT ?? "1433"),
  mssqlUser: process.env.JDE_MSSQL_USER ?? process.env.MSSQL_USER ?? "",
  mssqlPassword: process.env.JDE_MSSQL_PASSWORD ?? process.env.MSSQL_PASSWORD ?? "",
  mssqlDatabase: process.env.JDE_MSSQL_DATABASE ?? process.env.MSSQL_DATABASE ?? "JDE_AI", // Default to JDE_AI, can be overridden by env
};
