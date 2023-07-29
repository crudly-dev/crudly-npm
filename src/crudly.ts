import fetch, { Response } from "node-fetch";
import { CrudlyOptions } from "./model/options";
import { TableName, TableSchema } from "./model/table";
import { Entity, EntityId } from "./model/entity";
import {
  CrudlyNotFoundError,
  CrudlyRateLimitExceededError,
  CrudlyUnexpectedError,
  CrudlyValidationError,
} from "./model/error";

const CrudlyOptionsDefaults = {
  host: "localhost",
  port: ":80",
  protocol: "http://",
};

export type GetEntitiesOptions = {
  filters?: Filter[];
  orders?: Order[];
  limit?: number;
  offset?: number;
};

export const createCrudly = (options: CrudlyOptions) => {
  const protocol = options.protocol ?? CrudlyOptionsDefaults.protocol;
  const host = options.host ?? CrudlyOptionsDefaults.host;
  const port = options.port ?? CrudlyOptionsDefaults.port;

  const url = `${protocol}${host}:${port}`;

  const headers = {
    "X-PROJECT-ID": options.projectId,
    "X-PROJECT-KEY": options.projectKey,
    ...options.customHeaders,
  };

  const createEntity = async (
    tableName: TableName,
    entity: Entity
  ): Promise<EntityId> => {
    const res = await fetch(`${url}/tables/${tableName}/entities`, {
      method: "POST",
      headers,
      body: JSON.stringify(entity),
    });

    await errorHandleShared(res);

    return await res.text();
  };

  const createEntities = async (
    tableName: TableName,
    entities: Entity[]
  ): Promise<void> => {
    const res = await fetch(`${url}/tables/${tableName}/entities/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify(entities),
    });

    await errorHandleShared(res);
  };

  const putEntity = async (
    tableName: TableName,
    id: EntityId,
    entity: Entity
  ): Promise<EntityId> => {
    const res = await fetch(`${url}/tables/${tableName}/entities/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(entity),
    });

    await errorHandleShared(res);

    return await res.text();
  };

  const getEntityById = async (
    tableName: TableName,
    id: EntityId
  ): Promise<Entity> => {
    const res = await fetch(`${url}/tables/${tableName}/entities/${id}`, {
      headers,
    });

    await errorHandleShared(res);

    return (await res.json()) as Entity;
  };

  const getEntities = async (
    tableName: TableName,
    options?: GetEntitiesOptions
  ): Promise<Entity[]> => {
    let queryParams = [] as string[][];

    if (options) {
      if (options.filters) {
        queryParams.concat(options.filters.map((filter) => ["filter", filter]));
      }

      if (options.orders) {
        queryParams.concat(options.orders.map((order) => ["order", order]));
      }

      if (options.limit) {
        queryParams.push(["limit", `${options.limit}`]);
      }

      if (options.offset) {
        queryParams.push(["offset", `${options.offset}`]);
      }
    }

    const res = await fetch(
      `${url}/tables/${tableName}/entities?${new URLSearchParams(
        queryParams
      ).toString()}`,
      {
        headers,
      }
    );

    await errorHandleShared(res);

    return (await res.json()) as any[];
  };

  const updateEntity = async (
    tableName: TableName,
    id: EntityId,
    entity: Entity
  ): Promise<Entity> => {
    const res = await fetch(`${url}/tables/${tableName}/entities/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(entity),
    });

    await errorHandleShared(res);

    return (await res.json()) as Entity;
  };

  const deleteEntity = async (
    tableName: TableName,
    id: EntityId
  ): Promise<void> => {
    const res = await fetch(`${url}/tables/${tableName}/entities/${id}`, {
      method: "DELETE",
      headers,
    });

    await errorHandleShared(res);
  };

  const createTable = async (
    tableName: TableName,
    tableSchema: TableSchema
  ): Promise<void> => {
    const res = await fetch(`${url}/tables/${tableName}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(tableSchema),
    });

    await errorHandleShared(res);
  };

  const getTableSchema = async (tableName: TableName): Promise<TableSchema> => {
    const res = await fetch(`${url}/tables/${tableName}`, {
      method: "GET",
      headers,
    });

    await errorHandleShared(res);

    return (await res.json()) as TableSchema;
  };

  const getTables = async (): Promise<{ [key: string]: TableSchema }> => {
    const res = await fetch(`${url}/tables`, {
      method: "GET",
      headers,
    });

    await errorHandleShared(res);

    return (await res.json()) as { [key: string]: TableSchema };
  };

  const deleteTable = async (tableName: TableName): Promise<void> => {
    const res = await fetch(`${url}/tables/${tableName}`, {
      method: "DELETE",
      headers,
    });

    await errorHandleShared(res);
  };

  return {
    createEntity,
    createEntities,
    putEntity,
    updateEntity,
    getEntityById,
    getEntities,
    deleteEntity,

    createTable,
    getTableSchema,
    getTables,
    deleteTable,
  };
};

const errorHandleShared = async (res: Response) => {
  const status = res.status;

  if (status < 300) {
    return;
  }

  switch (status) {
    case 400:
      throw new CrudlyValidationError(await res.text());
    case 404:
      throw new CrudlyNotFoundError();
    case 429:
      throw new CrudlyRateLimitExceededError();
    default:
      throw new CrudlyUnexpectedError(await res.text());
  }
};
