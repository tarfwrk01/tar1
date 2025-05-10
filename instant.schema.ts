// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed().optional(),
      url: i.any().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    profile: i.entity({
      userId: i.string().unique().indexed(),
      name: i.string().optional(),
      onboardingCompleted: i.boolean().optional(),
      onboardingStep: i.number().optional(),
      createdAt: i.string().optional(),
      tursoDbName: i.string().optional(),
      tursoDbId: i.string().optional(),
      tursoApiToken: i.string().optional(),
    }),
    messages: i.entity({
      createdAt: i.string().optional(),
      text: i.string().optional(),
    }),
  },
  links: {},
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
