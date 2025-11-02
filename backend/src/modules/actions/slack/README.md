# Slack Action: New Message Detection

## Overview

The `SLACK_NEW_MESSAGE` action allows detecting the arrival of new messages in a specific Slack channel. This action uses a polling system to periodically check for the presence of new messages.

## Configuration

### Required Parameters

- **channelId** (string): The identifier of the Slack channel to monitor
  - Format: `C1234567890` (starts with 'C' followed by digits)
  - Example: `C1234567890`

### Optional Parameters

If no `channelId` is provided, the action will use the `general` channel by default.

## How it Works

### Polling Strategy

1. **Periodic check**: The action queries the Slack API every 5 seconds (configurable via `SLACK_POLL_INTERVAL_MS`)
2. **Temporal comparison**: Compares the timestamp of the most recent message with the one cached in Redis
3. **Trigger**: Returns code 0 (trigger) if a new message is detected

### Return Codes

- **0**: New message detected (triggers reaction)
- **1**: No change detected or baseline initialization
- **-1**: Slack provider not linked for the user

### Redis Cache

- **Key**: `slack:last_message_ts:${userId}:${channelId}`
- **Value**: Timestamp of the last processed message
- **Empty handling**: Stores an empty string if the channel is empty

## Available Placeholders

The action provides the following placeholders for reactions:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `message_text` | Content of the new Slack message | `"Hello everyone!"` |
| `message_user` | ID of the user who sent the message | `"U1234567890"` |
| `message_timestamp` | Message timestamp | `"1640995200.123456"` |
| `channel_id` | ID of the channel where the message was posted | `"C1234567890"` |

## Usage in Reactions

You can use these placeholders in your reaction configuration:

```json
{
  "subject": "New Slack message",
  "body": "{{message_user}} wrote in {{channel_id}}: {{message_text}}"
}
```

## Prerequisites

### Slack Authentication

The user must have linked their Slack account via OAuth2. The action uses stored tokens to access the Slack API.

### Required Permissions

The bot/user must have the following permissions:
- `channels:history`: To read public message history
- `groups:history`: To read private channel history
- `im:history`: To read direct message history

## Environment Variables

- `SLACK_POLL_INTERVAL_MS`: Polling interval in milliseconds (default: 5000)
- `SLACK_CLIENT_ID`: Slack application client ID
- `SLACK_REDIRECT_URI`: OAuth2 redirect URI

## Error Handling

### Temporary Errors

Temporary Slack API errors (timeouts, network errors) are treated as "no change" to avoid triggering reactions in a loop.

### Provider Not Linked

If the user hasn't linked their Slack account, the action returns `-1` and logs a debug message.

### Channel Not Found

If the specified channel doesn't exist or the user doesn't have access to it, the Slack API will return an empty list, treated as "no messages".

## Usage Example

```typescript
// Action configuration
const actionConfig = {
  channelId: "C1234567890" // #general channel
};

// The action will automatically detect new messages
// and trigger the configured reaction with placeholders
```

## Limitations

1. **Polling frequency**: Limited by Slack API rate limits
2. **History**: Doesn't trigger on historical messages during first initialization
3. **Message types**: Detects all message types (doesn't filter by type)
4. **Multiple channels**: One instance per channel (no multi-channel monitoring)

## Debugging

Enable debug logs to see operation details:

```typescript
this.logger.debug(`[Slack] Listing latest messages for user=${userId} channel=${channelId}`);
```

Les logs incluent :
- État du cache Redis
- Nombre de messages récupérés
- Timestamps comparés
- Décisions de déclenchement
