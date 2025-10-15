import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
async function basicInit(page: Page) {
  type SimpleUser = { id: string; name: string; email: string; roles: { role: string }[] };

  let currentUser: SimpleUser | null = null;
  let adminUsers: SimpleUser[] = [
    { id: '201', name: 'Pizza Diner', email: 'pizza.diner@jwt.com', roles: [{ role: 'diner' }] },
    { id: '202', name: 'Franchise Owner', email: 'franchise.owner@jwt.com', roles: [{ role: 'franchisee' }] },
    { id: '203', name: 'Admin Helper', email: 'admin.helper@jwt.com', roles: [{ role: 'admin' }] },
    { id: '204', name: 'Guest User', email: 'guest@jwt.com', roles: [{ role: 'diner' }] },
  ];

  const upsertUser = (user: SimpleUser) => {
    adminUsers = [user, ...adminUsers.filter((candidate) => candidate.id !== user.id)];
  };

  // Route all API calls - this will catch calls to any port/host
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    
    // Let specific handlers deal with their endpoints
    if (pathname === '/api/auth' || 
        pathname.startsWith('/api/user/') || 
        pathname === '/api/user') {
      await route.fallback();
      return;
    }
    
    // For other API calls, you might want to handle them or let them fallback
    await route.fallback();
  });

  await page.route('**/api/auth', async (route) => {
    const method = route.request().method();
    const body = route.request().postDataJSON?.() ?? {};
    console.log(`Intercepting auth ${method} request`);

    if (method === 'POST') {
      const roles = body.name === 'admin person' ? [{ role: 'admin' }] : [{ role: 'diner' }];
      const registeredUser: SimpleUser = {
        id: '158',
        name: body.name,
        email: body.email,
        roles,
      };

      currentUser = registeredUser;
      upsertUser(registeredUser);
      console.log(`Registered user: ${registeredUser.name} with roles: ${JSON.stringify(registeredUser.roles)}`);

      await route.fulfill({ json: { user: registeredUser, token: 'mock-token-123' } });
      return;
    }

    if (method === 'PUT') {
      if (!currentUser || currentUser.email !== body.email) {
        console.log(`Login failed - no current user or email mismatch`);
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }

      console.log(`Login successful for: ${currentUser.name}`);
      await route.fulfill({ json: { user: currentUser, token: 'mock-token-123' } });
      return;
    }

    if (method === 'DELETE') {
      console.log(`Logout successful`);
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  // Handle GET /api/user?page=...&limit=...&name=... (list users)
  // Use more specific patterns to ensure proper interception
  await page.route('**/api/user?*', async (route) => {
    const method = route.request().method();
    console.log(`Intercepting ${method} request to ${route.request().url()}`);
    
    if (method !== 'GET') {
      await route.fallback();
      return;
    }

    // Check if user is admin (required for listing users)
    if (!currentUser || !currentUser.roles?.some(role => role.role === 'admin')) {
      console.log('User not admin, returning 401');
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }

    const url = new URL(route.request().url());
    const pageParam = Number(url.searchParams.get('page') ?? '0');
    const limitParam = Number(url.searchParams.get('limit') ?? '10');
    const nameParam = url.searchParams.get('name') ?? '*';
    const normalized = nameParam.replace(/\*/g, '').toLowerCase();

    let filtered = adminUsers;
    if (normalized) {
      filtered = adminUsers.filter((user) => user.name.toLowerCase().includes(normalized));
    }

    const start = pageParam * limitParam;
    const end = start + limitParam;
    const pageUsers = filtered.slice(start, end);
    const more = end < filtered.length;

    console.log(`Returning ${pageUsers.length} users for admin`);
    await route.fulfill({ json: { users: pageUsers, more } });
  });

  await page.route('**/api/user', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    
    if (method === 'GET' && url.search) {
      console.log(`Intercepting ${method} request to ${route.request().url()}`);

      if (!currentUser || !currentUser.roles?.some(role => role.role === 'admin')) {
        console.log('User not admin, returning 401');
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }

      const pageParam = Number(url.searchParams.get('page') ?? '0');
      const limitParam = Number(url.searchParams.get('limit') ?? '10');
      const nameParam = url.searchParams.get('name') ?? '*';
      const normalized = nameParam.replace(/\*/g, '').toLowerCase();

      let filtered = adminUsers;
      if (normalized) {
        filtered = adminUsers.filter((user) => user.name.toLowerCase().includes(normalized));
      }

      const start = pageParam * limitParam;
      const end = start + limitParam;
      const pageUsers = filtered.slice(start, end);
      const more = end < filtered.length;

      console.log(`Returning ${pageUsers.length} users for admin`);
      await route.fulfill({ json: { users: pageUsers, more } });
    } else {
      await route.fallback();
    }
  });

  // Register more specific routes first (Playwright matches in order)
  await page.route('**/api/user/me', async (route) => {
    const method = route.request().method();
    console.log(`Intercepting /api/user/me ${method} request`);
    
    if (method === 'GET') {
      if (currentUser) {
        console.log(`Returning current user: ${currentUser.name}`);
        await route.fulfill({ json: currentUser });
      } else {
        console.log(`No current user, returning 401`);
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      }
      return;
    }

    if (method === 'PUT') {
      if (!currentUser) {
        console.log(`No current user for update, returning 401`);
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }

      const body = route.request().postDataJSON?.() ?? {};
      currentUser = {
        ...currentUser,
        name: body.name ?? currentUser.name,
        email: body.email ?? currentUser.email,
        roles: body.roles ?? currentUser.roles,
      };
      upsertUser(currentUser);

      await route.fulfill({ json: { user: currentUser, token: 'mock-token-123' } });
    }
  });

  await page.route('**/api/user/*', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const segments = url.pathname.split('/').filter(Boolean);
    const userId = segments[segments.length - 1];
    
    console.log(`Intercepting /api/user/${userId} ${method} request`);

    // Skip if this is /api/user/me (handled above)
    if (userId === 'me') {
      await route.fallback();
      return;
    }

    // Skip if this is the base /api/user endpoint (handled above)
    if (userId === 'user') {
      await route.fallback();
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON?.() ?? {};
      const existing = adminUsers.find((candidate) => candidate.id === userId) ?? currentUser;
      const roles = body.roles ?? existing?.roles ?? [{ role: 'diner' }];
      const updatedUser: SimpleUser = {
        id: userId,
        name: body.name ?? existing?.name ?? '',
        email: body.email ?? existing?.email ?? '',
        roles,
      };

      upsertUser(updatedUser);
      if (currentUser && currentUser.id === userId) {
        currentUser = updatedUser;
      }

      await route.fulfill({ json: { user: updatedUser, token: 'mock-token-123' } });
      return;
    }

    if (method === 'DELETE') {
      adminUsers = adminUsers.filter((user) => user.id !== userId);
      if (currentUser && currentUser.id === userId) {
        currentUser = null;
      }

      await route.fulfill({ json: { message: 'deleted' } });
    }
  });
}

test('updateUser', async ({ page }) => {
    await basicInit(page);
    const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
    await page.goto('/');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('diner');
    await page.getByRole('button', { name: 'Register' }).click();
    await page.getByRole('link', { name: 'pd' }).click();
    await expect(page.getByRole('main')).toContainText('pizza diner');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h3')).toContainText('Edit user');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.getByRole('main')).toContainText('pizza diner');
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h3')).toContainText('Edit user');
    await page.getByRole('textbox').first().fill('pizza dinerx');
    await page.getByRole('textbox').nth(1).fill("test@test.com");
    await page.getByRole('textbox').nth(2).fill("123");
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.getByRole('main')).toContainText('pizza dinerx');
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill("test@test.com");
    await page.getByRole('textbox', { name: 'Password' }).fill('123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('link', { name: 'pd' }).click();
    await expect(page.getByRole('main')).toContainText('pizza dinerx');
    });

test('admin user can edit name', async ({ page }) => {
        await basicInit(page);
        const email = `admin${Math.floor(Math.random() * 10000)}@jwt.com`;
        await page.goto('/');
        await page.getByRole('link', { name: 'Register' }).click();
        await page.getByRole('textbox', { name: 'Full name' }).fill('admin person');
        await page.getByRole('textbox', { name: 'Email address' }).fill(email);
        await page.getByRole('textbox', { name: 'Password' }).fill('admin');
        await page.getByRole('button', { name: 'Register' }).click();
        await page.getByRole('link', { name: 'ap' }).click();
        await expect(page.getByRole('main')).toContainText('admin');
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page.locator('h3')).toContainText('Edit user');
        await page.getByRole('textbox').first().fill('admin user');
        await page.getByRole('button', { name: 'Update' }).click();
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        await expect(page.getByRole('main')).toContainText('admin user');
    });

test('admin dashboard users tab supports search and delete', async ({ page }) => {
  await basicInit(page);
  const email = `admin${Math.floor(Math.random() * 10000)}@jwt.com`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('admin person');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Users' }).click();

  await expect(page.getByRole('cell', { name: 'Pizza Diner' })).toBeVisible();

  await page.getByPlaceholder('Search users').fill('Admin');
  await page.getByRole('button', { name: 'Search Users' }).click();

  await expect(page.getByRole('cell', { name: 'Admin Helper' })).toBeVisible();

  await page.getByRole('row', { name: /Admin Helper/ }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row', { name: /Admin Helper/ })).toHaveCount(0);

  await page.getByPlaceholder('Search users').fill('Helper');
  await page.getByRole('button', { name: 'Search Users' }).click();
  await expect(page.getByText('No users found.')).toBeVisible();

  await page.getByPlaceholder('Search users').fill('');
  await page.getByRole('button', { name: 'Search Users' }).click();
  await expect(page.getByRole('cell', { name: 'Pizza Diner' })).toBeVisible();

  await expect(page.getByRole('button', { name: '«' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '»' })).toBeDisabled();
});