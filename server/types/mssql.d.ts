
declare module "mssql" {
  export interface IConfig {
    server: string;
    port: number;
    user: string;
    password: string;
    database: string;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
      enableArithAbort?: boolean;
      connectionTimeout?: number;
      requestTimeout?: number;
    };
    pool?: {
      max?: number;
      min?: number;
      idleTimeoutMillis?: number;
    };
  }

  export interface IConnectionPool {
    query<T = any>(query: string): Promise<IQueryResult<T>>;
    request(): IRequest;
    close(): Promise<void>;
  }

  export interface IQueryResult<T> {
    recordset: T[];
    rowsAffected: number[];
    output: any;
  }

  export interface IRequest {
    input(name: string, type: any, value: any): IRequest;
    query<T = any>(query: string): Promise<IQueryResult<T>>;
  }

  export type config = IConfig;
  export type ConnectionPool = IConnectionPool;
  
  export const VarChar: any;
  export const Int: any;
  export const BigInt: any;
  export const DateTime: any;
  export const Decimal: any;
  export const Float: any;
  export const Bit: any;
  export const NVarChar: any;
  export const Text: any;

  export function connect(config: IConfig): Promise<IConnectionPool>;
  export function query<T = any>(query: string, params?: any): Promise<IQueryResult<T>>;
  export const MAX = 10;
  export const MIN = 0;
  export const IDLE_TIMEOUT_MS = 30000;
}

