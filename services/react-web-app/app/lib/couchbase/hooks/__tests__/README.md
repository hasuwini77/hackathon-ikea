# Couchbase Hooks Unit Tests

Comprehensive unit tests for critical Couchbase hooks in the offline-first React web application.

## Test Coverage

### 1. useProducts.test.ts
Tests for the product fetching hook:
- Fetching all products when online
- Returning empty array when no products exist
- Filtering non-product documents
- Searching with category, query, and price filters
- Error handling and offline state detection
- Loading state management
- Refetch functionality
- Server-side rendering compatibility

### 2. useUpdateStock.test.ts
Tests for the stock update hook:
- Successful stock updates (number and object formats)
- Preserving document structure during updates
- Queueing updates when offline
- Error handling (missing revisions, fetch errors, queue errors)
- Loading state management
- Stock format handling (number vs object)
- Multiple sequential updates
- Timestamp handling

### 3. useSyncStatus.test.ts
Tests for the sync status monitoring hook:
- Online/offline state detection
- Database info fetching
- Pending changes integration from offline queue
- Polling interval functionality
- Refetch triggering
- Enable/disable option
- Cleanup on unmount
- lastSynced timestamp updates
- useIsOnline lightweight variant

### 4. useOfflineQueue.test.ts
Tests for the offline queue management hook:
- Queue initialization and localStorage loading
- Queueing write operations when offline
- Immediate execution when online
- Queueing delete operations
- localStorage persistence
- Retry operations when coming online
- Max retry count enforcement
- Error handling (client errors vs server errors)
- Manual retry all functionality
- Clear queue functionality
- Concurrent processing prevention
- Unique operation ID generation

## Setup

### Dependencies Required

Add these dependencies to your `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.5",
    "jsdom": "^23.0.0"
  }
}
```

### Installation

```bash
npm install
# or
bun install
```

## Running Tests

### Run all tests
```bash
npm run test
# or
bun test
```

### Run tests in watch mode
```bash
npm run test:watch
# or
bun test -- --watch
```

### Run tests with coverage
```bash
npm run test:coverage
# or
bun test -- --coverage
```

### Run specific test file
```bash
npm run test useProducts.test.ts
# or
bun test useProducts.test.ts
```

### Run tests in UI mode
```bash
npm run test:ui
# or
bun test -- --ui
```

## Test Structure

All tests follow this structure:

1. **Setup**: Mock dependencies and initialize test data
2. **Execution**: Render the hook and trigger actions
3. **Assertions**: Verify expected behavior
4. **Cleanup**: Automatically handled by test framework

## Mocking Strategy

### Client Functions
All Couchbase client functions are mocked:
- `getAllDocuments`
- `searchProducts`
- `getDocument`
- `putDocument`
- `deleteDocument`
- `checkServerStatus`
- `getDatabaseInfo`

### localStorage
Custom localStorage mock that maintains state across tests in the same suite.

### Timers
Fake timers (`vi.useFakeTimers()`) are used for testing polling intervals and timeouts.

### Network State
`navigator.onLine` is mocked to control online/offline state.

## Key Testing Patterns

### Testing Async Hooks
```typescript
const { result } = renderHook(() => useProducts());

await waitFor(() => {
  expect(result.current.loading).toBe(false);
});
```

### Testing State Updates
```typescript
await act(async () => {
  await result.current.updateStock('product-1', 20);
});

expect(result.current.updating).toBe(false);
```

### Testing Timers
```typescript
vi.useFakeTimers();

act(() => {
  vi.advanceTimersByTime(5000);
});

vi.useRealTimers();
```

### Testing localStorage
```typescript
const stored = localStorage.getItem(STORAGE_KEY);
expect(stored).toBeTruthy();
const parsed = JSON.parse(stored!);
```

## Best Practices

1. **Isolation**: Each test is independent and doesn't affect others
2. **Clarity**: Test names clearly describe what is being tested
3. **Completeness**: Tests cover success paths, error paths, and edge cases
4. **Realistic**: Mocks simulate real-world scenarios
5. **Maintainable**: Tests are organized and easy to update

## Coverage Goals

Target coverage metrics:
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Troubleshooting

### Tests timeout
Increase timeout in vitest.config.ts:
```typescript
test: {
  testTimeout: 10000,
}
```

### localStorage not working
Check that the setup file is properly configured in vitest.config.ts.

### Timers not advancing
Make sure you're using `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.

### Async state not updating
Always use `waitFor()` for async state changes and wrap state-changing operations in `act()`.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Hooks](https://react-hooks-testing-library.com/)
