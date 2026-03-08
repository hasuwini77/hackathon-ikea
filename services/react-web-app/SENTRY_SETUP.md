# Sentry Setup Guide

Quick start guide for setting up Sentry error tracking in the React web application.

## Step 1: Install Dependencies

```bash
npm install @sentry/react @sentry/vite-plugin
```

Or with yarn:

```bash
yarn add @sentry/react @sentry/vite-plugin
```

## Step 2: Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up or log in
2. Create a new project:
   - Select **React** as the platform
   - Name your project (e.g., "ikea-warehouse-app")
   - Copy the **DSN** (Data Source Name) provided

## Step 3: Configure Environment Variables

Create or update your `.env` file:

```bash
# Required: Sentry DSN from your project settings
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Required: Environment name
VITE_ENV=development

# Optional: Application version
VITE_APP_VERSION=1.0.0

# Production only: For source map uploads
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Getting Additional Credentials

**For Source Map Uploads (Production):**

1. **Auth Token**:
   - Go to Sentry → Settings → Account → Auth Tokens
   - Create a new token with `project:releases` and `org:read` scopes

2. **Organization Slug**:
   - Found in your Sentry URL: `https://sentry.io/organizations/[your-org-slug]/`

3. **Project Slug**:
   - Found in your Sentry project URL

## Step 4: Test the Integration

### Development Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and check the console for:
   ```
   Sentry initialized for development environment
   ```

3. Test error capture by adding a test button:
   ```typescript
   <button onClick={() => {
     throw new Error('Test Sentry integration');
   }}>
     Test Error
   </button>
   ```

4. Click the button and check your Sentry dashboard for the error

### Production Testing

1. Build your application:
   ```bash
   npm run build
   ```

2. Check build output for source map uploads:
   ```
   Sentry Vite Plugin: Uploading source maps...
   ```

3. Deploy and test in production environment

## Step 5: Verify in Sentry Dashboard

1. Go to your Sentry project dashboard
2. Navigate to **Issues** tab
3. You should see test errors appearing
4. Check **Performance** tab for transaction data
5. View **Replays** for session recordings

## Quick Integration Examples

### Capture Errors

```typescript
import { captureException } from '~/lib/sentry';

try {
  riskyOperation();
} catch (error) {
  captureException(error);
}
```

### Add User Context

```typescript
import { setUser } from '~/lib/sentry';

setUser({
  id: user.id,
  email: user.email,
});
```

### User Feedback

```typescript
import { SentryFeedback } from '~/components/SentryFeedback';

<SentryFeedback />
```

## Configuration Options

### Adjust Sample Rates

Edit `app/lib/sentry.ts`:

```typescript
// Lower sample rate for production
function getTracesSampleRate(): number {
  return env === 'production' ? 0.1 : 1.0;
}
```

### Filter Errors

Add patterns to ignore:

```typescript
ignoreErrors: [
  'NetworkError',
  'Failed to fetch',
  'Custom error pattern',
],
```

### Privacy Settings

Configure session replay masking:

```typescript
Sentry.replayIntegration({
  maskAllText: true,        // Mask all text
  blockAllMedia: true,       // Block images/videos
})
```

## Troubleshooting

### Sentry Not Initializing

- Check that `VITE_SENTRY_DSN` is set and not the placeholder value
- Verify DSN format: `https://key@sentry.io/project-id`
- Check browser console for initialization logs

### Source Maps Not Uploading

- Ensure `SENTRY_AUTH_TOKEN` is set for production builds
- Verify organization and project slugs are correct
- Check that auth token has proper scopes

### Too Many Events

- Lower sample rates in `sentry.ts`
- Add more error patterns to `ignoreErrors`
- Set up rate limiting in Sentry project settings

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment variables
3. ✅ Test error capture
4. ✅ Set up production source maps
5. 📖 Read [SENTRY_INTEGRATION.md](./SENTRY_INTEGRATION.md) for detailed usage
6. 🔧 Configure alerts in Sentry dashboard
7. 📊 Set up performance monitoring thresholds
8. 👥 Invite team members to Sentry project

## Resources

- [Full Integration Documentation](./SENTRY_INTEGRATION.md)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)

## Support

For questions or issues with the integration, check:
1. This setup guide
2. [SENTRY_INTEGRATION.md](./SENTRY_INTEGRATION.md)
3. Sentry documentation
4. Application logs
