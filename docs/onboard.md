# Onboarding Process Documentation

This document outlines the complete onboarding process for the application, including all API calls, database operations, and settings used during user onboarding.

## Overview

The onboarding process consists of several steps:
1. User authentication
2. User profile creation
3. Turso database setup
4. Database tables creation
5. Completion and redirection to the main application

## User Authentication

Authentication is handled through an external provider. Once authenticated, the user's information is stored in the application context.

## User Profile Creation

A profile record is created in InstantDB with the following structure:

```typescript
profile: {
  userId: string;           // Unique user ID from authentication
  name: string;             // User's name (optional)
  onboardingCompleted: boolean; // Whether onboarding is completed
  onboardingStep: number;   // Current onboarding step (0-4)
  createdAt: string;        // ISO timestamp of profile creation
  tursoDbName: string;      // Name of the user's Turso database
  tursoDbId: string;        // ID of the user's Turso database
  tursoApiToken: string;    // API token for accessing the Turso database
}
```

## Turso Database Setup

### Database Creation

A Turso database is created for each user using the following API call:

```javascript
const response = await fetch('https://api.turso.tech/v1/organizations/tarframework/databases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: formattedDbName, // Derived from user's email
    group: "tarapp"
  })
});
```

The database name is derived from the user's email address by:
1. Removing all non-alphanumeric characters
2. Converting to lowercase
3. Limiting to 50 characters

### API Token Creation

An API token is created for accessing the database:

```javascript
const tokenResponse = await fetch(`https://api.turso.tech/v1/organizations/tarframework/databases/${formattedDbName}/auth/tokens?authorization=full-access`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw'
  }
});
```

## Database Tables Creation

Two essential tables are created in the user's Turso database:

### 1. Memories Table

```sql
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  `group` TEXT NOT NULL
)
```

Note: The `group` column name is escaped with backticks because it's a reserved keyword in SQL.

### 2. TableConfig Table

```sql
CREATE TABLE IF NOT EXISTS tableconfig (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  config TEXT NOT NULL
)
```

### API Call for Table Creation

Tables are created using the Turso API:

```javascript
const apiUrl = `https://${dbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

const requestBody = {
  requests: [
    {
      type: "execute",
      stmt: {
        sql: `CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY,
          content TEXT NOT NULL,
          \`group\` TEXT NOT NULL
        )`
      }
    },
    {
      type: "execute",
      stmt: {
        sql: `CREATE TABLE IF NOT EXISTS tableconfig (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          config TEXT NOT NULL
        )`
      }
    }
  ]
};

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

### Table Verification

After creating the tables, a verification query is executed:

```javascript
const verifyResponse = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    requests: [
      {
        type: "execute",
        stmt: {
          sql: "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('memories', 'tableconfig')"
        }
      }
    ]
  })
});
```

## Onboarding Completion

Once all steps are completed, the user's profile is updated to mark onboarding as complete:

```javascript
await instant.transact(
  instant.tx.profile[user.id].update({
    userId: user.id,
    name: existingName || defaultName,
    tursoDbName: dbName,
    tursoDbId: dbId,
    tursoApiToken: apiToken,
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    onboardingStep: 4
  })
);
```


## Onboarding Steps

The onboarding process is divided into steps:

1. **Step 0**: Initial state
2. **Step 1**: User name collection
3. **Step 2**: (Reserved for future use)
4. **Step 3**: Database creation
5. **Step 4**: Onboarding completion

## Navigation Flow

After onboarding is completed, the user is redirected to the primary application screen:

```javascript
router.replace('/(primary)');
```

## InstantDB Schema

The InstantDB schema used for storing user profiles:

```typescript
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
```

## UI Components

The onboarding UI consists of several screens:
1. Authentication screen
2. Name collection screen
3. Database creation screen
4. Completion screen

Each screen shows appropriate loading indicators and error messages based on the current state of the onboarding process.